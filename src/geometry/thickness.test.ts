import { describe, expect, it } from 'vitest'
import { defaultThickness, validateThickness } from './thickness'

describe('validateThickness', () => {
  it('значения по умолчанию валидны', () => {
    expect(validateThickness(defaultThickness)).toEqual({ ok: true, errors: [] })
  })
  it('отрицательное значение', () => {
    const r = validateThickness({ ...defaultThickness, floor: -1 })
    expect(r.ok).toBe(false)
    expect(r.errors).toEqual([{ field: 'floor', key: 'thickness.negative' }])
  })
  it('нулевая стенка', () => {
    expect(validateThickness({ ...defaultThickness, outerWall: 0 }).errors[0]).toEqual({ field: 'outerWall', key: 'thickness.zero' })
  })
  it('стенки не оставляют внутреннего объёма', () => {
    const r = validateThickness({ ...defaultThickness, outerWall: 21 })
    expect(r.errors).toEqual([{ field: 'outerWall', key: 'thickness.noInterior' }])
  })
  it('зависит от шага сетки', () => {
    expect(validateThickness({ ...defaultThickness, outerWall: 15 }, 42).ok).toBe(true)
    expect(validateThickness({ ...defaultThickness, outerWall: 15 }, 30).ok).toBe(false)
  })
  it('NaN отклоняется', () => {
    expect(validateThickness({ ...defaultThickness, innerWall: NaN }).errors[0].key).toBe('thickness.invalid')
  })
})
