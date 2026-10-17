import { describe, expect, it } from 'vitest'
import { decodeColorImage, decodeImage, ImageError, type DecodeBackend } from './decodeImage'

/** Подставной бэкенд: картинка 3 × 2 с известным цветом пикселей. */
const backend = (w = 3, h = 2): DecodeBackend => ({
  async load() {
    return {
      width: w, height: h,
      rgba(rw: number, rh: number) {
        const out = new Uint8ClampedArray(rw * rh * 4)
        for (let i = 0; i < rw * rh; i++) { out[i * 4] = 200; out[i * 4 + 1] = 100; out[i * 4 + 2] = 50; out[i * 4 + 3] = 255 }
        return out
      },
    }
  },
})
const png = (type = 'image/png') => new Blob(['x'], { type })

describe('цветное декодирование (25a 1.1)', () => {
  it('цвет и яркость одного размера, каналы сохранены, яркость как у decodeImage', async () => {
    const c = await decodeColorImage(png(), backend())
    expect([c.color.width, c.color.height, c.color.rgb.length]).toEqual([3, 2, 18])
    expect([c.color.rgb[0], c.color.rgb[1], c.color.rgb[2]]).toEqual([200, 100, 50])
    const g = await decodeImage(png(), backend())
    expect(Array.from(c.image.gray)).toEqual(Array.from(g.image.gray))
    expect(c.original).toEqual({ width: 3, height: 2 })
  })
  it('большой снимок уменьшается до предела так же, как серый', async () => {
    const c = await decodeColorImage(png(), backend(8192, 4096))
    expect([c.color.width, c.color.height, c.downscaled]).toEqual([4096, 2048, true])
    expect(c.color.rgb.length).toBe(4096 * 2048 * 3)
  })
  it('неподдерживаемый тип, ошибка чтения и пустой снимок дают ImageError с тем же кодом', async () => {
    await expect(decodeColorImage(png('application/pdf'), backend())).rejects.toMatchObject({ code: 'unsupported' })
    await expect(decodeColorImage(png(), { load: async () => { throw new Error('boom') } })).rejects.toMatchObject({ code: 'decode' })
    await expect(decodeColorImage(png(), backend(0, 0))).rejects.toBeInstanceOf(ImageError)
  })
})
