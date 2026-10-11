import { describe, expect, it } from 'vitest'
import { fitPoints, ISO, project, type V3 } from './projection'
import { EMPTY, rasterize, type TriMesh } from './raster'

/** Куб [−1, 1]³ с наружными нормалями. */
function cubeMesh(): TriMesh {
  const v: V3[] = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]
  const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]]
  return { positions: Float32Array.from(v.flat()), triangles: Uint32Array.from(f.flat()) }
}

/** Плита 10 × 10 × 2 с квадратным сквозным отверстием 4 × 4 (собрана из восьми брусков не нужна: берём «рамку» из четырёх брусков). */
function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): TriMesh {
  const v: V3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]
  const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]]
  return { positions: Float32Array.from(v.flat()), triangles: Uint32Array.from(f.flat()) }
}
const join = (...m: TriMesh[]): TriMesh => {
  const pos: number[] = [], tri: number[] = []
  for (const x of m) { const o = pos.length / 3; pos.push(...x.positions); tri.push(...Array.from(x.triangles, (i) => i + o)) }
  return { positions: Float32Array.from(pos), triangles: Uint32Array.from(tri) }
}

const W = 200, H = 200
const setup = (m: TriMesh) => {
  const pts = Array.from({ length: m.positions.length / 3 }, (_, i) => project(ISO, [m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]]))
  return fitPoints(pts, W, H, 10)
}

describe('rasterize', () => {
  it('куб: три видимые грани дают три разных тона, остальное пусто, углы пустые', () => {
    const m = cubeMesh()
    const img = rasterize(m, ISO, setup(m), W, H)
    const tones = new Set<number>()
    for (const t of img.tone) if (t !== EMPTY) tones.add(t)
    expect(tones.size).toBe(3)
    expect(img.tone[0]).toBe(EMPTY)
    expect(img.tone[(H / 2) * W + W / 2]).not.toBe(EMPTY)
  })
  it('верхняя грань куба светлее боковых', () => {
    const m = cubeMesh()
    const fit = setup(m)
    const img = rasterize(m, ISO, fit, W, H)
    const top = project(ISO, [0, 0, 1]), side = project(ISO, [1, -1, 0]) // центр верха и середина ближнего ребра на боковых гранях
    const at = (p: { x: number; y: number }) => img.tone[Math.round(p.y * fit.scale + fit.offsetY) * W + Math.round(p.x * fit.scale + fit.offsetX)]
    expect(at(top)).toBeGreaterThan(at({ x: side.x - 0.2, y: side.y + 0.2 }))
  })
  it('плита с отверстием: видно внутреннюю стенку отверстия и дно за ним, без артефактов порядка', () => {
    // рамка (четыре бруска) 10 × 10 × 2 с отверстием 4 × 4 и дно ниже: отверстие «глубокое» из-за низкого пола
    const frame = join(box(-5, 5, -5, -2, 0, 2), box(-5, 5, 2, 5, 0, 2), box(-5, -2, -2, 2, 0, 2), box(2, 5, -2, 2, 0, 2))
    const floor = box(-5, 5, -5, 5, -2, -1)
    const m = join(frame, floor)
    const fit = setup(m)
    const img = rasterize(m, ISO, fit, W, H)
    const hole = project(ISO, [-1.5, 1.5, -1]) // точка дна, видимая через отверстие (луч к камере проходит внутри него)
    const wallSpot = project(ISO, [-2, 0.5, 1]) // на внутренней стенке отверстия (грань x = −2)
    const at = (p: { x: number; y: number }) => img.tone[Math.round(p.y * fit.scale + fit.offsetY) * W + Math.round(p.x * fit.scale + fit.offsetX)]
    const px = (p: { x: number; y: number }) => Math.round(p.y * fit.scale + fit.offsetY) * W + Math.round(p.x * fit.scale + fit.offsetX)
    expect(at(hole)).not.toBe(EMPTY)
    expect(at(wallSpot)).not.toBe(EMPTY)
    // дно за отверстием дальше от камеры, чем верх рамки, и всё равно видно; стенка отверстия темнее верха (другая нормаль)
    expect(img.depth[px(hole)]).toBeLessThan(img.depth[px(project(ISO, [-4, -4, 2]))])
    expect(at(wallSpot)).not.toBe(at(project(ISO, [-4, -4, 2])))
  })
  it('грани, смотрящие от камеры, не рисуются; пустой меш даёт пустую картинку', () => {
    const img = rasterize({ positions: new Float32Array(0), triangles: new Uint32Array(0) }, ISO, { scale: 1, offsetX: 0, offsetY: 0 }, 10, 10)
    expect(img.tone.every((t) => t === EMPTY)).toBe(true)
  })
})
