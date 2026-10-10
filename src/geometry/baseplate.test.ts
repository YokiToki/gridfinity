import { describe, expect, it } from 'vitest'
import { buildBaseplate, defaultParams } from './baseplate'
import { toBinaryStl } from './stl'

describe('baseplate', () => {
  it('2x2 — валидная модель нужного размера', async () => {
    const m = await buildBaseplate(defaultParams)
    const bb = m.boundingBox()
    expect(m.status()).toBe('NoError')
    expect(bb.max[0] - bb.min[0]).toBeCloseTo(84, 3)
    expect(bb.max[2] - bb.min[2]).toBeCloseTo(4.65, 3)
  })
  it('с магнитами и винтами получает пол', async () => {
    const m = await buildBaseplate({ ...defaultParams, magnets: true, screws: true })
    expect(m.status()).toBe('NoError')
    expect(m.boundingBox().max[2]).toBeCloseTo(8.65, 3)
  })
  it('экспорт STL детерминирован: одинаковые параметры дают одинаковые байты', async () => {
    const a = await toBinaryStl(await buildBaseplate(defaultParams)).arrayBuffer()
    const b = await toBinaryStl(await buildBaseplate({ ...defaultParams })).arrayBuffer()
    expect(Array.from(new Uint8Array(a))).toEqual(Array.from(new Uint8Array(b)))
  })
})
