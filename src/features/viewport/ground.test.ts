import { describe, expect, it } from 'vitest'
import { GROUND_RAMP, groundOpacity } from './ground'

describe('groundOpacity', () => {
  it('над плоскостью выше рампы — 1, на плоскости и под ней — 0', () => {
    expect(groundOpacity(200, 300)).toBe(1)
    expect(groundOpacity(0, 300)).toBe(0)
    expect(groundOpacity(-1, 300)).toBe(0)
    expect(groundOpacity(-500, 300)).toBe(0)
  })
  it('переход плавный и монотонный', () => {
    const w = GROUND_RAMP * 300
    let prev = -1
    for (let k = 0; k <= 20; k++) {
      const o = groundOpacity((w * k) / 20, 300)
      expect(o).toBeGreaterThanOrEqual(prev)
      prev = o
    }
    expect(groundOpacity(w / 2, 300)).toBeCloseTo(0.5, 9)
    expect(groundOpacity(w, 300)).toBe(1)
  })
  it('ширина рампы пропорциональна расстоянию до цели', () => {
    expect(groundOpacity(12, 300)).toBeCloseTo(groundOpacity(24, 600), 9)
  })
  it('вырожденное расстояние не даёт NaN', () => {
    expect(Number.isFinite(groundOpacity(1, 0))).toBe(true)
    expect(groundOpacity(0, 0)).toBe(0)
  })
  it('прямо в плоскости почти не видно: малая высота даёт малую непрозрачность', () => {
    expect(groundOpacity(0.5, 300)).toBeLessThan(0.01)
  })
})
