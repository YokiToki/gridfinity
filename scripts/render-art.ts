/**
 * Генерация иллюстраций карточек стартовой страницы: настоящие детали 2×2 ячейки через generate(), изометрия, z-буфер, трассировка.
 * Запуск: npm run art. Для выреза нужен образец tmp/cutout.stl (в репозитории его нет: картинки готовые лежат в src/app/art, CI этот скрипт не запускает).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { generate, registerMesh, type ModelResult } from '../src/geometry/model'
import { toGeometry, defaultParams } from '../src/geometry/baseplate'
import { defaultBox, equalDividers, boxLayout } from '../src/geometry/box'
import { defaultCutout, newCutoutId, type Cutout } from '../src/geometry/cutout'
import { defaultFasteners } from '../src/geometry/fasteners'
import { defaultOrientation, describeMesh, parseStl, repairMesh } from '../src/geometry/stl-import'
import { ISO } from '../src/geometry/art/projection'
import { defaultArtOptions, projectedSize, renderSvg } from '../src/geometry/art/svg'
import type { TriMesh } from '../src/geometry/art/raster'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'src/app/art')
const SAMPLE = resolve(root, 'tmp/cutout.stl')

const meshOf = (r: ModelResult): TriMesh => {
  const m = r.parts[0].mesh
  const n = m.vertProperties.length / m.numProp
  const positions = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) positions[i * 3 + k] = m.vertProperties[i * m.numProp + k]
  return { positions, triangles: m.triVerts }
}

async function models(): Promise<Record<string, TriMesh>> {
  if (!existsSync(SAMPLE)) throw new Error(`Нужен образец для выреза: ${SAMPLE} (STL, любая закрытая деталь). Положите файл и запустите npm run art ещё раз.`)
  const fasteners = { ...defaultFasteners, magnets: { mode: 'corner' as const, slots: [] } }
  const baseplate = await generate('baseplate', toGeometry({ ...defaultParams, fasteners }))

  // ящик 2×2×3 с двумя перегородками крестом (одна вдоль X, одна вдоль Y): четыре отсека
  const layout = boxLayout(defaultBox)
  const box = await generate('box', { ...defaultBox, compartments: { cols: 2, rows: 2, xDividers: equalDividers(2, layout.cavityX, defaultBox.thickness.innerWall), yDividers: equalDividers(2, layout.cavityY, defaultBox.thickness.innerWall), removed: [] } })

  // блок 2×2×3 с карманом по образцу: деталь лежит на боку и наполовину утоплена
  const buf = readFileSync(SAMPLE)
  const { mesh } = repairMesh(parseStl(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer))
  registerMesh('sample', mesh)
  const orientation = { ...defaultOrientation, rx: 1 }
  const info = describeMesh(mesh.vertProperties, 'mm', orientation)
  const cutout: Cutout = {
    id: newCutoutId(), name: 'Sample', x: 0, y: 0, rotation: 0, depth: 15, clearance: 0.5, visible: true,
    source: { kind: 'mesh', meshId: 'sample', filename: 'cutout.stl', unit: 'mm', orientation, mode: '3d', size: info.size, hull: info.hull },
  }
  const block = await generate('cutout', { ...defaultCutout, cutouts: [cutout] })
  return { baseplate: meshOf(baseplate), box: meshOf(box), cutout: meshOf(block) }
}

const all = await models()
// общий масштаб: самая большая из деталей определяет его для всех
const o = defaultArtOptions
const scale = Math.min(...Object.values(all).map((m) => { const s = projectedSize(m, ISO); return Math.min((o.width - 2 * o.pad) / s.w, (o.height - 2 * o.pad) / s.h) }))
mkdirSync(OUT, { recursive: true })
for (const [name, mesh] of Object.entries(all)) {
  const svg = renderSvg(mesh, ISO, o, scale)
  writeFileSync(resolve(OUT, `${name}.svg`), svg)
  console.log(`${name}.svg  ${(svg.length / 1024).toFixed(1)} KB`)
}
