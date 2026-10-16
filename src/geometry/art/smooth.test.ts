import { describe, expect, it } from 'vitest'
import { smoothMask } from './smooth'

const W = 60, H = 40
const mask = (f: (x: number, y: number) => boolean) => { const m = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (f(x, y)) m[y * W + x] = 1; return m }
const area = (m: Uint8Array) => m.reduce((a, b) => a + b, 0)

describe('smoothMask (2.2)', () => {
  it('σ = 0 (и не задан) возвращает ту же маску', () => {
    const m = mask((x) => x < 30)
    expect(smoothMask(m, W, H, 0)).toBe(m)
    expect(smoothMask(m, W, H, NaN)).toBe(m)
  })

  it('ступенчатая граница выпрямляется: у наклонного края нет пиксельных ступеней в один пиксель', () => {
    // наклон 1:4 даёт ступени по 4 пикселя по x; после сглаживания граница на каждой строке идёт монотонно с малым шагом
    const m = mask((x, y) => x < 20 + Math.floor(y / 4))
    const s = smoothMask(m, W, H, 2)
    const edge = (mm: Uint8Array, y: number) => { let x = 0; while (x < W && mm[y * W + x]) x++; return x }
    const steps = (mm: Uint8Array) => { let big = 0; for (let y = 5; y < H - 5; y++) if (Math.abs(edge(mm, y + 1) - edge(mm, y)) > 0) big++; return big }
    expect(steps(s)).toBeLessThan(steps(m) * 3) // не усложняет границу
    for (let y = 6; y < H - 6; y++) expect(edge(s, y + 1) - edge(s, y)).toBeLessThanOrEqual(1)
  })

  it('одиночная игла в один пиксель пропадает', () => {
    const m = mask((x, y) => x < 30 || (y === 20 && x < 36))
    const s = smoothMask(m, W, H, 1.5)
    expect(s[20 * W + 35]).toBe(0)
    expect(s[20 * W + 10]).toBe(1)
  })

  it('большая область почти не меняет площадь (в пределах 1 %) и остаётся внутри кадра', () => {
    const m = mask((x, y) => Math.hypot(x - 30, y - 20) < 15)
    const s = smoothMask(m, W, H, 1.5)
    expect(Math.abs(area(s) - area(m)) / area(m)).toBeLessThan(0.01)
    expect(s.length).toBe(m.length)
  })

  it('детерминирован', () => {
    const m = mask((x, y) => (x * 7 + y * 3) % 5 < 2)
    expect(Array.from(smoothMask(m, W, H, 1.2))).toEqual(Array.from(smoothMask(m, W, H, 1.2)))
  })
})
