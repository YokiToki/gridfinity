import { describe, expect, it } from 'vitest'
import { nearestOnContour, niceStep, previewContour } from './contour'
import type { MaskPreview } from '../../geometry/keychain'

/** Предпросмотр: 20 × 20, материал — квадрат 4…16, внутри открытая дырка 9…11. */
const preview = (): MaskPreview => {
  const data = new Uint8Array(400)
  for (let y = 4; y < 16; y++) for (let x = 4; x < 16; x++) data[y * 20 + x] = 1
  for (let y = 9; y < 11; y++) for (let x = 9; x < 11; x++) data[y * 20 + x] = 2
  return { width: 20, height: 20, data, box: [4, 4, 16, 16], holes: [{ id: 1, size: 4, cx: 10, cy: 10, open: true }] }
}

describe('контур редактора положения', () => {
  it('габарит контура = размер силуэта, центр в нуле, открытая дырка даёт внутренний контур', () => {
    const loops = previewContour(preview(), 60, 30)
    expect(loops).toHaveLength(2) // внешний и дырка
    const outer = loops.reduce((a, l) => (l.length && Math.max(...l.map((p) => p[0])) - Math.min(...l.map((p) => p[0])) > Math.max(...a.map((p) => p[0])) - Math.min(...a.map((p) => p[0])) ? l : a), loops[0])
    const xs = outer.map((p) => p[0]), ys = outer.map((p) => p[1])
    expect(Math.min(...xs)).toBeCloseTo(-30, 6); expect(Math.max(...xs)).toBeCloseTo(30, 6)
    expect(Math.min(...ys)).toBeCloseTo(-15, 6); expect(Math.max(...ys)).toBeCloseTo(15, 6)
  })
  it('залитая дырка (3) не создаёт контура', () => {
    const p = preview()
    for (let i = 0; i < p.data.length; i++) if (p.data[i] === 2) p.data[i] = 3
    expect(previewContour(p, 60, 30)).toHaveLength(1)
  })
  it('ближайшая точка контура и расстояние до неё', () => {
    const loops = [[[0, 0], [10, 0], [10, 10], [0, 10]] as [number, number][]]
    const n = nearestOnContour(loops, 14, 5)!
    expect(n.x).toBeCloseTo(10, 9); expect(n.y).toBeCloseTo(5, 9); expect(n.dist).toBeCloseTo(4, 9)
    const inside = nearestOnContour(loops, 3, 5)!
    expect(inside.x).toBeCloseTo(0, 9); expect(inside.dist).toBeCloseTo(3, 9)
    expect(nearestOnContour([], 0, 0)).toBeNull()
  })
  it('шаг сетки — круглое число: 1, 2, 5 × 10ⁿ', () => {
    for (const span of [7, 20, 70, 130, 400]) { const s = niceStep(span); expect([1, 2, 5]).toContain(+(s / 10 ** Math.floor(Math.log10(s))).toFixed(6)) }
    expect(niceStep(70)).toBe(10); expect(niceStep(20)).toBe(2)
  })
})
