import { describe, expect, it } from 'vitest'
import { fitsBed, presetFor } from './bedPresets'

describe('bedPresets', () => {
  it('300 мм не помещается на стол 256, 250 помещается', () => {
    expect(fitsBed(300, 200, 256, 256)).toBe(false)
    expect(fitsBed(250, 250, 256, 256)).toBe(true)
  })
  it('в любой ориентации', () => {
    expect(fitsBed(300, 200, 220, 320)).toBe(true)
    expect(fitsBed(300, 200, 250, 250)).toBe(false)
  })
  it('граница включена', () => expect(fitsBed(256, 256, 256, 256)).toBe(true))
  it('пресет по размерам', () => {
    expect(presetFor(256, 256)?.id).toBe('256')
    expect(presetFor(256, 255)).toBeUndefined()
  })
})
