import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d'
import { getWasm } from './wasm'
import { axisMm, type AxisSize } from './baseplate'
import { binLayout, bottomFasteners, buildBinBody, FOOT_HEIGHT, lipOpening, roundedRectCS, type BinHeight, type BinLayout, type BinParams, type BinThickness } from './bin'
import { defaultFasteners } from './fasteners'
import type { LipStyle } from './profiles'
import { DEFAULT_PITCH } from './spec'
import { defaultOrientation, orientVertices, toManifold, type IndexedMesh, type Orientation } from './stl-import'

export interface RectSource { kind: 'rect'; width: number; length: number; radius: number }
export type CutMode = 'projected' | '3d'
export interface MeshSource {
  kind: 'mesh'
  meshId: string
  filename: string
  unit: 'mm' | 'in'
  orientation: Orientation
  mode: CutMode
  /** Размер детали после ориентации и выпуклая оболочка силуэта (центр габарита в 0): для превью, выравнивания и предупреждений. */
  size: [number, number, number]
  hull: [number, number][]
}
export type CutoutSource = RectSource | MeshSource

export interface Cutout {
  id: string
  name: string
  source: CutoutSource
  /** Центр габарита силуэта относительно центра коробки, мм. */
  x: number
  y: number
  /** Поворот вокруг Z, градусы против часовой. */
  rotation: number
  depth: number
  clearance: number
  visible: boolean
}

export interface CutoutParams extends BinParams { cutouts: Cutout[] }

export const defaultCutoutThickness: BinThickness = { outerWall: 0.95, innerWall: 1.2, floor: 0.7 }

export const defaultCutout: CutoutParams = {
  pitch: DEFAULT_PITCH,
  x: { mode: 'units', value: 2, align: 'center' },
  y: { mode: 'units', value: 2, align: 'center' },
  height: { mode: 'units', value: 3 },
  thickness: defaultCutoutThickness,
  lip: 'default',
  fasteners: defaultFasteners,
  cutouts: [],
}

export type { AxisSize, BinHeight, LipStyle }

// ---------- модель списка вырезов (чистые функции) ----------

let counter = 0
export const newCutoutId = () => `c${Date.now().toString(36)}${(counter++).toString(36)}`

export function rectCutout(over: Omit<Partial<Cutout>, 'source'> & { source?: Partial<RectSource> } = {}): Cutout {
  const { source, ...rest } = over
  return { id: newCutoutId(), name: 'Rectangle', x: 0, y: 0, rotation: 0, depth: 10, clearance: 0.5, visible: true, ...rest, source: { kind: 'rect', width: 40, length: 20, radius: 3, ...source } }
}

export const addCutout = (list: Cutout[], c: Cutout): Cutout[] => [...list, c]

/** Копия справа сверху от оригинала (чтобы не слилась с ним), вставляется следом. */
export function duplicateCutout(list: Cutout[], id: string, offset = 6): Cutout[] {
  const i = list.findIndex((c) => c.id === id)
  if (i < 0) return list
  const src = list[i]
  const copy: Cutout = { ...src, id: newCutoutId(), name: `${src.name} copy`, x: src.x + offset, y: src.y + offset, source: { ...src.source } as CutoutSource }
  return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)]
}

export function moveCutout(list: Cutout[], id: string, delta: -1 | 1): Cutout[] {
  const i = list.findIndex((c) => c.id === id), j = i + delta
  if (i < 0 || j < 0 || j >= list.length) return list
  const out = [...list]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

export const removeCutout = (list: Cutout[], id: string) => list.filter((c) => c.id !== id)
export const renameCutout = (list: Cutout[], id: string, name: string) => list.map((c) => (c.id === id ? { ...c, name } : c))
export const toggleCutout = (list: Cutout[], id: string) => list.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
export const updateCutout = (list: Cutout[], id: string, patch: Partial<Cutout>) => list.map((c) => (c.id === id ? { ...c, ...patch } : c))

// ---------- геометрия контура ----------

export type Pt = [number, number]

/** Контур силуэта (до поворота и сдвига): прямоугольник — четыре угла, деталь — выпуклая оболочка. */
export function baseOutline(c: Cutout): Pt[] {
  if (c.source.kind === 'rect') {
    const hw = c.source.width / 2, hl = c.source.length / 2
    return [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]]
  }
  return c.source.hull
}

export interface Box { minX: number; maxX: number; minY: number; maxY: number }

/** Габарит выреза в координатах коробки: поворот, сдвиг и зазор (карман шире детали на clearance со всех сторон). */
export function cutoutBounds(c: Cutout): Box {
  const a = (c.rotation * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a)
  const box: Box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  for (const [px, py] of baseOutline(c)) {
    const x = px * cs - py * sn + c.x, y = px * sn + py * cs + c.y
    box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x); box.minY = Math.min(box.minY, y); box.maxY = Math.max(box.maxY, y)
  }
  return { minX: box.minX - c.clearance, maxX: box.maxX + c.clearance, minY: box.minY - c.clearance, maxY: box.maxY + c.clearance }
}

export const MIN_MARGIN = 0.8 // минимальная стенка до края или соседнего выреза, мм

export interface CutoutLayout extends BinLayout {
  /** Нижняя допустимая отметка дна кармана: над ногой и минимальным полом. */
  pocketFloorMin: number
  /** Наибольшая глубина кармана. */
  maxDepth: number
}

export function cutoutLayout(p: CutoutParams): CutoutLayout {
  const l = binLayout(p)
  return { ...l, pocketFloorMin: l.cavityBottom, maxDepth: l.wallTop - l.cavityBottom }
}

export const effectiveDepth = (c: Cutout, l: CutoutLayout) => Math.max(0, Math.min(c.depth, l.maxDepth))

export interface CutoutIssue { id: string; key: string; other?: string }

/** Предупреждения (не ошибки): глубина ограничена, мало стенки до края, вырезы слишком близко. */
export function cutoutNotices(p: CutoutParams): CutoutIssue[] {
  const l = cutoutLayout(p)
  const out: CutoutIssue[] = []
  const vis = p.cutouts.filter((c) => c.visible)
  for (const c of vis) if (c.depth > l.maxDepth + 1e-9) out.push({ id: c.id, key: 'cutout.notice.depthClamped' })
  for (const c of vis) {
    const b = cutoutBounds(c)
    if (b.minX < -l.cavityX / 2 + MIN_MARGIN - 1e-9 || b.maxX > l.cavityX / 2 - MIN_MARGIN + 1e-9 || b.minY < -l.cavityY / 2 + MIN_MARGIN - 1e-9 || b.maxY > l.cavityY / 2 - MIN_MARGIN + 1e-9) out.push({ id: c.id, key: 'cutout.warn.edge' })
  }
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
    const a = cutoutBounds(vis[i]), b = cutoutBounds(vis[j])
    const gx = Math.max(a.minX - b.maxX, b.minX - a.maxX), gy = Math.max(a.minY - b.maxY, b.minY - a.maxY)
    if (Math.max(gx, gy) < MIN_MARGIN) out.push({ id: vis[i].id, key: 'cutout.warn.overlap', other: vis[j].id })
  }
  return out
}

export interface CutoutError { field: string; key: string }
export const MAX_CUTOUTS = 30

export function validateCutout(p: CutoutParams): { ok: boolean; errors: CutoutError[] } {
  const errors: CutoutError[] = []
  const bad = (field: string, key: string) => errors.push({ field, key })
  const sx = axisMm(p.x, p.pitch), sy = axisMm(p.y, p.pitch)
  for (const [f, v] of [['x', sx], ['y', sy]] as const) if (!Number.isFinite(v) || v < p.pitch - 1e-9) bad(f, 'box.error.sizeMin')
  const h = p.height.mode === 'units' ? p.height.value * 7 : p.height.value
  if (!Number.isFinite(h) || h <= 0) bad('height', 'box.error.height')
  for (const f of ['outerWall', 'floor'] as const) if (!Number.isFinite(p.thickness[f]) || p.thickness[f] < 0 || (f === 'outerWall' && p.thickness[f] === 0)) bad(`thickness.${f}`, 'baseplate.error.negative')
  if (errors.length) return { ok: false, errors }
  const l = cutoutLayout(p)
  if (l.cavityX < 1 || l.cavityY < 1) bad('thickness.outerWall', 'box.error.noCavity')
  else if (l.maxDepth < 1) bad('thickness.floor', 'box.error.noCavity')
  if (p.cutouts.length > MAX_CUTOUTS) bad('cutouts', 'cutout.error.tooMany')
  for (const c of p.cutouts) {
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || !Number.isFinite(c.rotation)) bad(`cutout.${c.id}`, 'cutout.error.invalid')
    if (!(c.depth > 0)) bad(`cutout.${c.id}.depth`, 'cutout.error.depth')
    if (!(c.clearance >= 0)) bad(`cutout.${c.id}.clearance`, 'baseplate.error.negative')
    if (c.source.kind === 'rect' && !(c.source.width > 0 && c.source.length > 0 && c.source.radius >= 0)) bad(`cutout.${c.id}.size`, 'cutout.error.size')
  }
  return { ok: errors.length === 0, errors }
}

// ---------- построение ----------

/** Сетки, доступные воркеру по id. */
export type MeshRegistry = Map<string, IndexedMesh>

const oriented = new Map<string, Manifold>()
function orientedManifold(w: ManifoldToplevel, s: MeshSource, mesh: IndexedMesh): Manifold {
  const key = `${s.meshId}|${s.unit}|${JSON.stringify(s.orientation)}`
  let m = oriented.get(key)
  if (!m) {
    if (oriented.size > 24) { for (const v of oriented.values()) v.delete(); oriented.clear() }
    m = toManifold(w, { vertProperties: orientVertices(mesh.vertProperties, s.unit, s.orientation), triVerts: mesh.triVerts })
    oriented.set(key, m)
  }
  return m
}

const placeCS = (cs: CrossSection, c: Cutout) => cs.rotate(c.rotation).translate([c.x, c.y])
const grow = (cs: CrossSection, clearance: number) => (clearance > 0 ? cs.offset(clearance, 'Round', 2, 24) : cs)

/** Тело кармана одного выреза (то, что вычитается из блока), или null, если деталь недоступна. */
export function pocketSolid(w: ManifoldToplevel, c: Cutout, l: CutoutLayout, registry: MeshRegistry): Manifold | null {
  const depth = effectiveDepth(c, l)
  if (depth < 1e-6) return null
  const floorZ = l.wallTop - depth
  const { Manifold } = w
  const extrude = (cs: CrossSection) => Manifold.extrude(cs, depth + 1).translate([0, 0, floorZ])
  if (c.source.kind === 'rect') {
    const cs = roundedRectCS(w, c.source.width, c.source.length, c.source.radius)
    return extrude(placeCS(grow(cs, c.clearance), c))
  }
  const mesh = registry.get(c.source.meshId)
  if (!mesh) return null
  const m = orientedManifold(w, c.source, mesh)
  if (c.source.mode === 'projected') return extrude(placeCS(grow(m.project(), c.clearance), c))
  // настоящее 3D: деталь стоит на дне кармана; зазор — масштабирование (приближённо), над деталью проём открыт вверх
  const [sx, sy, sz] = c.source.size
  const k: [number, number, number] = [(sx + 2 * c.clearance) / sx, (sy + 2 * c.clearance) / sy, (sz + c.clearance) / sz]
  const shape = m.scale(k).rotate([0, 0, c.rotation]).translate([c.x, c.y, floorZ])
  const top = floorZ + sz * k[2]
  if (top >= l.wallTop + 1) return shape
  const opening = Manifold.extrude(placeCS(grow(m.project(), c.clearance), c), l.wallTop + 1 - top).translate([0, 0, top - 0.001])
  return Manifold.union([shape, opening])
}

/** Сплошной блок коробки с карманами; губа вырезана над верхней гранью. */
export function buildCutoutSolid(w: ManifoldToplevel, p: CutoutParams, registry: MeshRegistry = new Map()): Manifold {
  const l = cutoutLayout(p)
  const cuts: Manifold[] = []
  const lip = lipOpening(w, p.lip, l)
  if (lip) cuts.push(lip)
  cuts.push(...bottomFasteners(w, p, l))
  for (const c of p.cutouts) if (c.visible) { const s = pocketSolid(w, c, l, registry); if (s) cuts.push(s) }
  const body = buildBinBody(w, p, l)
  return cuts.length ? body.subtract(w.Manifold.union(cuts)) : body
}

export async function buildCutout(p: CutoutParams, registry: MeshRegistry = new Map(), wasmUrl?: string): Promise<Manifold> {
  return buildCutoutSolid(await getWasm(wasmUrl), p, registry)
}

export { defaultOrientation, FOOT_HEIGHT }
