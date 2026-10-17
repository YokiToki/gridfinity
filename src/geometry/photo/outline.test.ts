import { describe, expect, it } from 'vitest'
import type { Rectified } from './homography'
import { paperSize } from './paper'
import { traceSilhouette } from './outline'
import { segment } from './segment'

const A4 = paperSize('a4', 'landscape')
type Painter = (x: number, y: number) => number | null

function sheet(objects: Painter[]): Rectified {
  const scale = 4, w = Math.round(A4.width * scale), h = Math.round(A4.height * scale)
  const gray = new Uint8Array(w * h)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = (i + 0.5) / scale, y = (j + 0.5) / scale
    let v: number | null = null
    for (const o of objects) { v = o(x, y); if (v !== null) break }
    gray[j * w + i] = v ?? 235
  }
  return { image: { width: w, height: h, gray, alpha: null }, scale, paper: A4 }
}
const rect = (x: number, y: number, w: number, h: number): Painter => (px, py) => (px >= x && px <= x + w && py >= y && py <= y + h ? 40 : null)
const disc = (cx: number, cy: number, r: number): Painter => (px, py) => (Math.hypot(px - cx, py - cy) <= r ? 40 : null)
const lShape = (x: number, y: number): Painter => (px, py) => (px >= x && px <= x + 40 && py >= y && py <= y + 40 && (px <= x + 12 || py >= y + 28) ? 40 : null)
const area = (p: [number, number][]) => p.reduce((a, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return a + (x * y2 - x2 * y) / 2 }, 0)
const segOf = (...o: Painter[]) => segment(sheet(o))

describe('контур силуэта (1.3)', () => {
  it('прямоугольник 40 × 20 мм: размер в пределах 0.5 мм, площадь в пределах 2 %, центр на листе от центра, ось y вверх', () => {
    const seg = segOf(rect(60, 50, 40, 20))
    const t = traceSilhouette(seg, 1, A4)!
    expect(Math.abs(t.size.w - 40)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(t.size.l - 20)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(t.areaMm2 - 800) / 800).toBeLessThan(0.02)
    // центр прямоугольника (80, 60) мм от левого верхнего угла; лист 297 × 210 → от центра: (80 − 148.5, −(60 − 105))
    expect(t.center[0]).toBeCloseTo(80 - 148.5, 0)
    expect(t.center[1]).toBeCloseTo(-(60 - 105), 0)
  })

  it('диск диаметром 30 мм: размер, площадь, точки на окружности радиуса 15 (±0.3 мм)', () => {
    const t = traceSilhouette(segOf(disc(150, 100, 15)), 1, A4)!
    expect(Math.abs(t.size.w - 30)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(t.size.l - 30)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(t.areaMm2 - Math.PI * 225) / (Math.PI * 225)).toBeLessThan(0.02)
    for (const [x, y] of t.points) expect(Math.abs(Math.hypot(x, y) - 15)).toBeLessThan(0.3)
  })

  it('контур против часовой стрелки, без повторов, точки относительно центра габарита', () => {
    const t = traceSilhouette(segOf(lShape(100, 70)), 1, A4)!
    expect(area(t.points)).toBeGreaterThan(0)
    const xs = t.points.map((p) => p[0]), ys = t.points.map((p) => p[1])
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(0, 6)
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(0, 6)
    const keys = new Set(t.points.map(([x, y]) => `${x.toFixed(4)}|${y.toFixed(4)}`))
    expect(keys.size).toBe(t.points.length)
  })

  it('«Г» не зеркальна и ось y вверх: перекладина слева, основание внизу', () => {
    const t = traceSilhouette(segOf(lShape(100, 70)), 1, A4)!
    // внутри контура: левая перекладина вверху, основание внизу справа; пусто: верхний правый угол
    const inside = (px: number, py: number) => { let c = false; for (let i = 0, j = t.points.length - 1; i < t.points.length; j = i++) { const [xi, yi] = t.points[i], [xj, yj] = t.points[j]; if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c } return c }
    expect(inside(-14, 14)).toBe(true) // левый верх
    expect(inside(14, 14)).toBe(false) // правый верх пуст
    expect(inside(14, -16)).toBe(true) // основание внизу справа
  })

  it('число точек плавной фигуры невелико (менее 400), прямоугольник — 4–8 точек', () => {
    expect(traceSilhouette(segOf(disc(150, 100, 30)), 1, A4)!.points.length).toBeLessThan(400)
    const r = traceSilhouette(segOf(rect(60, 50, 40, 20)), 1, A4)!
    expect(r.points.length).toBeGreaterThanOrEqual(4)
    expect(r.points.length).toBeLessThanOrEqual(8)
  })

  it('кольцо: берётся внешний контур, дырки нет', () => {
    const ring: Painter = (x, y) => { const d = Math.hypot(x - 150, y - 100); return d <= 25 && d >= 12 ? 40 : null }
    const t = traceSilhouette(segOf(ring), 1, A4)!
    expect(Math.abs(t.areaMm2 - Math.PI * 625) / (Math.PI * 625)).toBeLessThan(0.03)
  })

  it('несуществующий номер силуэта даёт null', () => {
    expect(traceSilhouette(segOf(rect(60, 50, 40, 20)), 5, A4)).toBeNull()
  })

  it('силуэт у края листа (в поле) не ломает трассировку', () => {
    const seg = segOf(rect(3, 90, 30, 30))
    const t = traceSilhouette(seg, 1, A4)
    expect(t).not.toBeNull()
    expect(t!.size.w).toBeGreaterThan(25)
  })
})
