import { describe, expect, it } from 'vitest'
import { formatLength, fromDisplay, toDisplay } from './units'

describe('units', () => {
  it('2 in → 50.8 mm', () => expect(fromDisplay(2, 'in')).toBeCloseTo(50.8, 10))
  it('mm → in → mm без потерь', () => expect(fromDisplay(toDisplay(42, 'in'), 'in')).toBeCloseTo(42, 10))
  it('мм не конвертируются', () => expect(toDisplay(42, 'mm')).toBe(42))
  it('форматирование: мм до 2 знаков, дюймы до 3', () => {
    expect(formatLength(42.126, 'mm')).toBe('42.13')
    expect(formatLength(42, 'in')).toBe('1.654')
  })
})
