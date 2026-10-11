import { printerById, CUSTOM_PRINTER } from '../data/printers'
import type { PartMesh } from '../geometry/model'
import { toBinaryStl } from '../geometry/stl'
import { arrange, type Plate } from './arrange'
import { bambuPackage } from './bambu'
import { orientMesh, shouldFlip, type PlacedMesh } from './orient'
import { bedOf, usableBed, type ExportSettings } from './settings'
import { build3mf, type ThreeMfObject } from './threemf'

export interface ExportFile { name: string; blob: Blob }
export interface ExportResult {
  files: ExportFile[]
  plates: number
  /** Есть деталь больше стола (в любой ориентации): файл собран, но печатать её нельзя. */
  overflow: boolean
}

/**
 * Положение плиты k в сцене. У Bambu Studio плиты стоят сеткой: столбцов ceil(sqrt(n − 1) + ε), шаг 1,2 размера стола
 * (зазор 20 %), следующие ряды идут вниз (−Y). Для обычного 3MF и объединённого STL плиты идут в ряд.
 */
export function plateOffset(k: number, count: number, bed: { x: number; y: number }, bambu: boolean): [number, number] {
  if (!bambu) return [k * (bed.x + 20), 0]
  const cols = Math.floor(Math.sqrt(Math.max(0, count - 1))) + 1
  return [(k % cols) * bed.x * 1.2, (-Math.floor(k / cols) * bed.y * 1.2) || 0]
}

/** Раскладка уже ориентированных деталей по плитам с учётом поворота на 90° там, где арранжировщик его выбрал. */
export function layout(parts: PartMesh[], s: ExportSettings) {
  const flip = shouldFlip(s.orientation)
  const base = parts.map((p) => orientMesh(p.mesh, { flip }))
  const area = usableBed(s)
  const plates: Plate[] = arrange(base.map((m) => ({ w: m.size[0], h: m.size[1] })), { x: area.x, y: area.y }, s.gap)
  const placed: { index: number; mesh: PlacedMesh; x: number; y: number; plate: number }[] = []
  plates.forEach((pl, k) => {
    const meshes = pl.items.map((it) => (it.rotated ? orientMesh(parts[it.index].mesh, { flip, rotate: true }) : base[it.index]))
    // раскладка по центру рабочей области: у принтеров есть запретные зоны у краёв стола, а Studio отвергает детали рядом с ними
    let w = 0, h = 0
    pl.items.forEach((it, i) => { w = Math.max(w, it.x + meshes[i].size[0]); h = Math.max(h, it.y + meshes[i].size[1]) })
    const dx = pl.overflow ? 0 : Math.max(0, (area.x - w) / 2), dy = pl.overflow ? 0 : Math.max(0, (area.y - h) / 2)
    pl.items.forEach((it, i) => placed.push({ index: it.index, mesh: meshes[i], x: s.margin + dx + it.x, y: s.margin + dy + it.y, plate: k + 1 }))
  })
  placed.sort((a, b) => a.index - b.index)
  return { placed, plates, base }
}

function mergeStl(items: { mesh: PlacedMesh; x: number; y: number }[]): Blob {
  let nv = 0, nt = 0
  for (const i of items) { nv += i.mesh.positions.length / 3; nt += i.mesh.triangles.length / 3 }
  const positions = new Float32Array(nv * 3), triangles = new Uint32Array(nt * 3)
  let vo = 0, to = 0
  for (const i of items) {
    const n = i.mesh.positions.length / 3
    for (let v = 0; v < n; v++) { positions[(vo + v) * 3] = i.mesh.positions[v * 3] + i.x; positions[(vo + v) * 3 + 1] = i.mesh.positions[v * 3 + 1] + i.y; positions[(vo + v) * 3 + 2] = i.mesh.positions[v * 3 + 2] }
    for (let t = 0; t < i.mesh.triangles.length; t++) triangles[to + t] = i.mesh.triangles[t] + vo
    vo += n; to += i.mesh.triangles.length
  }
  return stlOf(positions, triangles)
}

const stlOf = (positions: Float32Array, triangles: Uint32Array) => toBinaryStl({ vertProperties: positions, triVerts: triangles, numProp: 3, min: [0, 0, 0], max: [0, 0, 0], volume: 0 })

const slug = (s: string) => s.trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_')

/** Собирает файлы экспорта по настройкам: STL (один или по частям) или 3MF (один или по частям). */
export function buildExport(parts: PartMesh[], s: ExportSettings, baseName: string): ExportResult {
  const name = slug(s.fileName) || baseName
  const { placed, plates } = layout(parts, s)
  const bed = bedOf(s)
  const printer = s.printerId === CUSTOM_PRINTER ? undefined : printerById(s.printerId)
  const bambu = s.format === '3mf' && !!printer?.bambu
  const overflow = plates.some((p) => p.overflow)
  const res = (files: ExportFile[]): ExportResult => ({ files, plates: plates.length, overflow })

  const objectsFor = (subset: typeof placed, forceSingle: boolean): ThreeMfObject[] => subset.map((p) => ({
    name: parts[p.index].label,
    mesh: p.mesh,
    x: forceSingle ? Math.max(0, (bed.x - p.mesh.size[0]) / 2) : p.x + plateOffset(p.plate - 1, plates.length, bed, bambu)[0],
    y: forceSingle ? Math.max(0, (bed.y - p.mesh.size[1]) / 2) : p.y + plateOffset(p.plate - 1, plates.length, bed, bambu)[1],
    plate: forceSingle ? 1 : p.plate,
  }))
  const pack3mf = (objs: ThreeMfObject[], title: string): Blob => {
    const extra = bambu ? bambuPackage({ printer: printer!, nozzle: s.nozzle, process: s.process, filament: s.filament }, objs) : {}
    return new Blob([build3mf(objs, { title, ...extra }) as BlobPart], { type: 'model/3mf' })
  }

  const separate = s.multi === 'separate' && parts.length > 1
  if (s.format === '3mf') {
    if (separate) return res(placed.map((p) => ({ name: `${name}_${parts[p.index].label}.3mf`, blob: pack3mf(objectsFor([p], true), `${name} ${parts[p.index].label}`) })))
    return res([{ name: `${name}.3mf`, blob: pack3mf(objectsFor(placed, false), name) }])
  }
  if (parts.length === 1) return res([{ name: `${name}.stl`, blob: stlOf(placed[0].mesh.positions, placed[0].mesh.triangles) }])
  if (separate) return res(placed.map((p) => ({ name: `${name}_${parts[p.index].label}.stl`, blob: stlOf(p.mesh.positions, p.mesh.triangles) })))
  return res([{ name: `${name}.stl`, blob: mergeStl(placed.map((p) => { const [ox, oy] = plateOffset(p.plate - 1, plates.length, bed, false); return { mesh: p.mesh, x: p.x + ox, y: p.y + oy } })) }])
}
