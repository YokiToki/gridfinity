import { describe, expect, it } from 'vitest'
import { simplifyLoop, textPolygons, traceAlpha, type Pt } from './textOutline'
import { defaultText, type TextRaster } from './text'

const area = (l: Pt[]) => { let s = 0; for (let i = 0; i < l.length; i++) { const [x0, y0] = l[i], [x1, y1] = l[(i + 1) % l.length]; s += x0 * y1 - x1 * y0 } return Math.abs(s) / 2 }
const disc = (w: number, h: number, r: number, soft = 1.5) => {
  const m = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = Math.round(255 * Math.min(1, Math.max(0, (r - Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2)) / soft + 0.5)))
  return m
}

describe('traceAlpha', () => {
  it('один закрашенный пиксель — петля вокруг него', () => {
    const m = new Uint8Array(9); m[4] = 255
    const loops = traceAlpha(m, 3, 3)
    expect(loops).toHaveLength(1)
    expect(area(loops[0])).toBeGreaterThan(0.4)
    for (const [x, y] of loops[0]) { expect(x).toBeGreaterThanOrEqual(1); expect(x).toBeLessThanOrEqual(2); expect(y).toBeGreaterThanOrEqual(1); expect(y).toBeLessThanOrEqual(2) }
  })
  it('диск с мягким краем: площадь петли ≈ πr², все точки на радиусе r (субпиксельно, без ступенек)', () => {
    const r = 30, loops = traceAlpha(disc(80, 80, r), 80, 80)
    expect(loops).toHaveLength(1)
    expect(area(loops[0]) / (Math.PI * r * r)).toBeGreaterThan(0.995)
    expect(area(loops[0]) / (Math.PI * r * r)).toBeLessThan(1.005)
    for (const [x, y] of loops[0]) expect(Math.abs(Math.hypot(x - 40, y - 40) - r)).toBeLessThan(0.35)
  })
  it('кольцо: наружная петля и дырка', () => {
    const m = disc(80, 80, 30); const hole = disc(80, 80, 12)
    for (let i = 0; i < m.length; i++) m[i] = Math.max(0, m[i] - hole[i])
    const loops = traceAlpha(m, 80, 80).sort((a, b) => area(b) - area(a))
    expect(loops).toHaveLength(2)
    expect(area(loops[0])).toBeGreaterThan(area(loops[1]) * 4)
  })
  it('две отдельные области — две петли; пустая маска — ни одной; полностью закрашенная — одна по краю', () => {
    const m = new Uint8Array(100)
    m[11] = 255; m[88] = 255
    expect(traceAlpha(m, 10, 10)).toHaveLength(2)
    expect(traceAlpha(new Uint8Array(100), 10, 10)).toHaveLength(0)
    const full = traceAlpha(new Uint8Array(100).fill(255), 10, 10)
    expect(full).toHaveLength(1)
    expect(area(full[0])).toBeGreaterThan(80)
  })
  it('седло (две диагональные точки) не рвёт петли: две отдельные или одна, но все точки соединены', () => {
    const m = new Uint8Array(16); m[5] = 255; m[10] = 255
    const loops = traceAlpha(m, 4, 4)
    expect(loops.length).toBeGreaterThanOrEqual(1)
    for (const l of loops) expect(l.length).toBeGreaterThanOrEqual(3)
  })
})

describe('simplifyLoop', () => {
  it('ступенчатый квадрат схлопывается в 4 вершины, диск остаётся в пределах допуска', () => {
    const sq: Pt[] = []
    for (let i = 0; i <= 10; i++) sq.push([i, 0]); for (let i = 1; i <= 10; i++) sq.push([10, i]); for (let i = 9; i >= 0; i--) sq.push([i, 10]); for (let i = 9; i >= 1; i--) sq.push([0, i])
    expect(simplifyLoop(sq, 0.1)).toHaveLength(4)
    const r = 30, loop = traceAlpha(disc(80, 80, r), 80, 80)[0], s = simplifyLoop(loop, 0.25)
    expect(s.length).toBeLessThan(loop.length)
    expect(s.length).toBeGreaterThan(12)
    expect(Math.abs(area(s) - area(loop)) / area(loop)).toBeLessThan(0.01)
  })
  it('малые петли и нулевой допуск возвращаются как есть', () => {
    const t: Pt[] = [[0, 0], [1, 0], [0, 1]]
    expect(simplifyLoop(t, 0.5)).toEqual(t)
    const big = traceAlpha(disc(40, 40, 10), 40, 40)[0]
    expect(simplifyLoop(big, 0)).toBe(big)
  })
})

describe('textPolygons', () => {
  const block = (): TextRaster => { const w = 96, h = 48, mask = new Uint8Array(w * h).fill(255); return { mask, width: w, height: h, pxPerMm: 12 } }
  const T = (over = {}) => ({ ...defaultText, enabled: true, ...over })
  it('сплошная коробка 8 × 4 мм → прямоугольник с этими размерами вокруг центра', () => {
    const polys = textPolygons(block(), T(), 100, 60)
    expect(polys).toHaveLength(1)
    const xs = polys[0].map((p) => p[0]), ys = polys[0].map((p) => p[1])
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(8, 0)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(4, 0)
    expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(0, 1)
    expect(area(polys[0])).toBeGreaterThan(30)
  })
  it('положение и поворот: центр (0.75, 0.25) → (+25, −15) мм при габарите 100 × 60; поворот 90° меняет стороны', () => {
    const p = textPolygons(block(), T({ x: 0.75, y: 0.25, rotation: 90 }), 100, 60)[0]
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1])
    expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(25, 1)
    expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(-15, 1)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(4, 0)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(8, 0)
  })
})
