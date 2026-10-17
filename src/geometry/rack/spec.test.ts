import { describe, expect, it } from 'vitest'
import { EAR_HOLE_SPACING, HEIGHT_TOLERANCE, HOLE_OFFSETS, RACK_UNIT, RACK_WIDTH, RACK_WINDOW, rackLayout } from './spec'

describe('размеры 10-дюймовой стойки', () => {
  it('константы по стандарту', () => {
    expect(RACK_WIDTH).toBe(254); expect(RACK_UNIT).toBe(44.45); expect(EAR_HOLE_SPACING).toBe(236.525); expect(RACK_WINDOW).toBe(222.25)
    expect([...HOLE_OFFSETS]).toEqual([6.35, 22.225, 38.1]); expect(HEIGHT_TOLERANCE).toBe(0.45)
  })
  it('1 U: три отверстия на ухо с шагом 15.875, высота 44.45 − допуск', () => {
    const l = rackLayout(1, 0.45)
    expect(l.height).toBeCloseTo(44, 9)
    const left = l.holes.filter((h) => h.x > 0)
    expect(left.map((h) => h.y)).toEqual([6.35, 22.225, 38.1])
    expect(left[1].y - left[0].y).toBeCloseTo(15.875, 9); expect(left[2].y - left[1].y).toBeCloseTo(15.875, 9)
    expect(l.holes).toHaveLength(3)
  })
  it('3 U: девять отверстий на ухо, юниты со сдвигом 44.45', () => {
    const l = rackLayout(3, 0)
    expect(l.holes).toHaveLength(9)
    expect(l.holes[3].y).toBeCloseTo(44.45 + 6.35, 9)
    expect(l.height).toBeCloseTo(133.35, 9)
  })
  it('область узора: окно минус поля', () => {
    const r = rackLayout(2, 0.45, 3).region
    expect(r.x1).toBeCloseTo(111.125 - 3, 9); expect(r.x0).toBeCloseTo(-(111.125 - 3), 9)
    expect(r.y0).toBe(3); expect(r.y1).toBeCloseTo(88.9 - 0.45 - 3, 9)
  })
})
