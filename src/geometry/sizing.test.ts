import { describe, expect, it } from 'vitest'
import { mmToUnits, resolveAxis, unitsToMm, type Align } from './sizing'

describe('resolveAxis', () => {
  const cases: [number, Align, number, number, number, boolean][] = [
    // size, align, cells, padding, offset, truncated
    [100, 'center', 2, 16, 8, false],
    [100, 'start', 2, 16, 0, false],
    [100, 'end', 2, 16, 16, false],
    [84, 'center', 2, 0, 0, false],
    [84, 'end', 2, 0, 0, false],
    [30, 'center', 1, 0, 0, true],
    [42, 'center', 1, 0, 0, false],
    [126.0000000001, 'center', 3, 0, 0, false],
  ]
  for (const [size, align, cells, padding, offset, truncated] of cases) {
    it(`${size} мм, ${align}`, () => {
      const r = resolveAxis(size, 42, align)
      expect(r.cells).toBe(cells)
      expect(r.padding).toBeCloseTo(padding, 6)
      expect(r.offset).toBeCloseTo(offset, 6)
      expect(r.truncated).toBe(truncated)
    })
  }
  it('учитывает шаг сетки', () => {
    expect(resolveAxis(100, 40).cells).toBe(2)
    expect(resolveAxis(100, 40).padding).toBeCloseTo(20, 6)
  })
  it('конвертация единиц', () => {
    expect(unitsToMm(2.5, 42)).toBe(105)
    expect(mmToUnits(100, 42)).toBeCloseTo(2.381, 3)
  })
})
