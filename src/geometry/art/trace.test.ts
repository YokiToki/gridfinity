import { describe, expect, it } from 'vitest'
import { dropCollinear, maskLoops, simplifyLoop, toPath, tracePath } from './trace'

const mask = (w: number, h: number, f: (x: number, y: number) => boolean) => {
  const m = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = f(x, y) ? 1 : 0
  return m
}
const subpaths = (d: string) => (d.match(/M/g) ?? []).length

describe('трассировка', () => {
  it('квадрат даёт один контур с четырьмя вершинами', () => {
    const m = mask(20, 20, (x, y) => x >= 5 && x < 15 && y >= 5 && y < 15)
    const loops = maskLoops(m, 20, 20)
    expect(loops).toHaveLength(1)
    expect(simplifyLoop(dropCollinear(loops[0]), 0.5)).toHaveLength(4)
  })
  it('кольцо даёт два контура (внешний и дырка), заливка even-odd', () => {
    const m = mask(30, 30, (x, y) => { const inside = x >= 5 && x < 25 && y >= 5 && y < 25, hole = x >= 12 && x < 18 && y >= 12 && y < 18; return inside && !hole })
    const d = tracePath(m, 30, 30, 1, 0.5)
    expect(subpaths(d)).toBe(2)
  })
  it('два отдельных пятна — два контура', () => {
    const m = mask(30, 10, (x, y) => y >= 2 && y < 8 && ((x >= 2 && x < 10) || (x >= 18 && x < 26)))
    expect(subpaths(tracePath(m, 30, 10, 1, 0.5))).toBe(2)
  })
  it('пустая маска — пустая строка', () => expect(tracePath(new Uint8Array(100), 10, 10, 1, 0.5)).toBe(''))
  it('округление до 0,1 и деление на масштаб; запуск стабилен', () => {
    const m = mask(30, 30, (x, y) => x >= 3 && x < 21 && y >= 3 && y < 12)
    const a = tracePath(m, 30, 30, 3, 0.5), b = tracePath(m, 30, 30, 3, 0.5)
    expect(a).toBe(b)
    expect(a).toMatch(/^M1 1l/) // 3/3 = 1
    for (const num of a.match(/-?\d+\.\d+/g) ?? []) expect(Math.abs(Math.round(Number(num) * 10) - Number(num) * 10)).toBeLessThan(1e-6)
  })
  it('диагональ-лесенка упрощается до нескольких вершин, площадь почти сохраняется', () => {
    const m = mask(60, 60, (x, y) => x + y < 50 && x >= 5 && y >= 5)
    const loops = maskLoops(m, 60, 60)
    expect(loops).toHaveLength(1)
    const simple = simplifyLoop(dropCollinear(loops[0]), 0.8)
    expect(simple.length).toBeLessThanOrEqual(6)
  })
  it('toPath не копит погрешность округления: путь замкнут в начальную точку', () => {
    const d = toPath([[[0.04, 0.04], [10.06, 0.04], [10.06, 10.06], [0.04, 10.06]]], 1)
    expect(d.startsWith('M0 0l')).toBe(true)
    expect(d.endsWith('z')).toBe(true)
  })
})
