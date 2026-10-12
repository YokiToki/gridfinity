import { describe, expect, it } from 'vitest'
import { defaultText, textBoxMm, textCenterMm, textRasterKey, textSampler, type TextParams, type TextRaster } from './text'

/** Растр 40 × 20 px при 10 px/мм (4 × 2 мм): левая половина закрашена. */
const raster = (): TextRaster => {
  const w = 40, h = 20, mask = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < 20; x++) mask[y * w + x] = 255
  return { mask, width: w, height: h, pxPerMm: 10 }
}
const T = (over: Partial<TextParams> = {}): TextParams => ({ ...defaultText, enabled: true, content: 'A', x: 0.5, y: 0.5, ...over })

describe('textSampler', () => {
  it('в центре надписи — граница закрашенной половины, слева покрытие 1, справа 0, вне коробки 0', () => {
    const s = textSampler(raster(), T(), 100, 100)
    expect(s(-1, 0)).toBeCloseTo(1, 6)
    expect(s(1, 0)).toBeCloseTo(0, 6)
    expect(s(-10, 0)).toBe(0)
    expect(s(0, 5)).toBe(0)
  })
  it('положение: доли габарита → мм от центра, Y вверх', () => {
    expect(textCenterMm(T({ x: 0.5, y: 0.5 }), 100, 60)).toEqual({ x: 0, y: 0 })
    expect(textCenterMm(T({ x: 1, y: 1 }), 100, 60)).toEqual({ x: 50, y: 30 })
    const s = textSampler(raster(), T({ x: 0.75, y: 0.25 }), 100, 60) // центр (25, −15)
    expect(s(24, -15)).toBeCloseTo(1, 6)
    expect(s(26, -15)).toBeCloseTo(0, 6)
    expect(s(-1, 0)).toBe(0)
  })
  it('поворот 90° против часовой: закрашенная левая половина уходит вниз', () => {
    const s = textSampler(raster(), T({ rotation: 90 }), 100, 100)
    expect(s(0, -1)).toBeCloseTo(1, 6)
    expect(s(0, 1)).toBeCloseTo(0, 6)
    expect(s(-1, 0)).toBeCloseTo(0, 6)
  })
  it('поворот 180°: левая половина становится правой', () => {
    const s = textSampler(raster(), T({ rotation: 180 }), 100, 100)
    expect(s(1, 0)).toBeCloseTo(1, 6)
    expect(s(-1, 0)).toBeCloseTo(0, 6)
  })
  it('билинейная выборка: на границе пикселей покрытие между 0 и 1', () => {
    const s = textSampler(raster(), T(), 100, 100)
    const v = s(-0.001, 0)
    expect(v).toBeGreaterThan(0.4); expect(v).toBeLessThan(0.6)
  })
  it('масштаб: 10 px/мм → коробка 4 × 2 мм', () => {
    expect(textBoxMm(raster())).toEqual({ w: 4, h: 2 })
  })
})

describe('textRasterKey', () => {
  it('зависит от содержимого, шрифта, размера, интервалов и выравнивания', () => {
    const k = textRasterKey(T())
    for (const over of [{ content: 'B' }, { size: 9 }, { letterSpacing: 1 }, { lineSpacing: 1.5 }, { align: 'left' as const }, { font: { id: 'lobster', bold: false, italic: false } }, { font: { id: 'roboto', bold: true, italic: false } }])
      expect(textRasterKey(T(over)), JSON.stringify(over)).not.toBe(k)
    expect(textRasterKey(T(), 'v2')).not.toBe(k)
  })
  it('не зависит от положения, поворота, режима, высоты, глубины и maskId', () => {
    const k = textRasterKey(T())
    expect(textRasterKey(T({ x: 0.1, y: 0.9, rotation: 33, mode: 'engrave', height: 2, depth: 1, maskId: 'm', enabled: false }))).toBe(k)
  })
})
