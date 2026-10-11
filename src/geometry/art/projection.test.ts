import { describe, expect, it } from 'vitest'
import { applyFit, fitPoints, ISO, project, type V3 } from './projection'

const cube: V3[] = []
for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) cube.push([x, y, z])

describe('изометрия', () => {
  it('оси экрана ортонормальны, камера смотрит с +X, −Y, +Z под истинным углом', () => {
    const { right, up, toCam } = ISO
    const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    expect(dot(right, up)).toBeCloseTo(0, 12); expect(dot(right, toCam)).toBeCloseTo(0, 12); expect(dot(up, toCam)).toBeCloseTo(0, 12)
    expect(toCam[0]).toBeCloseTo(1 / Math.sqrt(3), 9); expect(toCam[1]).toBeCloseTo(-1 / Math.sqrt(3), 9); expect(toCam[2]).toBeCloseTo(1 / Math.sqrt(3), 9)
    expect(up[2]).toBeGreaterThan(0)
  })
  it('вершины куба: шестиугольник, симметричный относительно центра, две вершины совпадают в центре', () => {
    const pts = cube.map((p) => project(ISO, p))
    const r = (v: number) => Math.round(v * 1e6) / 1e6 + 0 // +0: убирает «−0»
    const key = (p: { x: number; y: number }) => `${r(p.x)},${r(p.y)}`
    const set = new Set(pts.map(key))
    expect(set.size).toBe(7)
    for (const p of pts) expect(set.has(key({ x: -p.x, y: -p.y }))).toBe(true)
    expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(Math.SQRT2 / 2, 9)
    expect(Math.max(...pts.map((p) => -p.y))).toBeCloseTo(Math.sqrt(2 / 3), 9)
  })
  it('верх выше низа на экране (y вниз), ближняя вершина имеет наибольшую глубину', () => {
    expect(project(ISO, [0, 0, 1]).y).toBeLessThan(project(ISO, [0, 0, 0]).y)
    const d = cube.map((p) => project(ISO, p).depth)
    expect(Math.max(...d)).toBeCloseTo(Math.sqrt(3) / 2, 9)
  })
})

describe('fitPoints', () => {
  it('вписывает с сохранением пропорций и центрирует', () => {
    const pts = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 0, y: 2 }]
    const f = fitPoints(pts, 250, 150, 10)
    expect(f.scale).toBeCloseTo(57.5, 9) // ограничивает ширина: (250 − 20) / 4
    const a = applyFit(f, pts[0]), b = applyFit(f, pts[2])
    expect(b.x - a.x).toBeCloseTo(230, 9); expect(b.y - a.y).toBeCloseTo(115, 9)
    expect((a.x + b.x) / 2).toBeCloseTo(125, 9); expect((a.y + b.y) / 2).toBeCloseTo(75, 9)
  })
  it('высокая фигура ограничена по высоте', () => {
    const f = fitPoints([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 10 }], 250, 150, 0)
    expect(f.scale).toBeCloseTo(15, 9)
  })
})
