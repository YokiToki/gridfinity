import { describe, expect, it } from 'vitest'
import { buildBaseplate, defaultParams } from './baseplate'
import { defaultFasteners } from './fasteners'

const full = { ...defaultFasteners, magnets: { mode: 'full' as const, manual: [] }, screws: { mode: 'full' as const, manual: [] } }
import { meshOf } from './mesh'
import { toBinaryStl } from './stl'
import { expectValidSolid } from './testing'

describe('baseplate', () => {
  it('2x2 — валидная модель нужного размера', async () => {
    expectValidSolid(await buildBaseplate(defaultParams), { size: [84, 84, 4.65] })
  })
  it('с магнитами и винтами получает пол', async () => {
    const m = await buildBaseplate({ ...defaultParams, fasteners: full })
    expectValidSolid(m)
    expect(m.boundingBox().max[2]).toBeCloseTo(8.65, 3)
  })
  it('экспорт STL детерминирован: одинаковые параметры дают одинаковые байты', async () => {
    const a = await toBinaryStl(meshOf(await buildBaseplate(defaultParams))).arrayBuffer()
    const b = await toBinaryStl(meshOf(await buildBaseplate({ ...defaultParams }))).arrayBuffer()
    expect(Array.from(new Uint8Array(a))).toEqual(Array.from(new Uint8Array(b)))
  })
})

// Регрессия: объём и габариты до рефакторинга на модули geometry/ (значения сняты с исходной реализации)
describe('baseplate regression', () => {
  const cases = [
    { name: '2×2', p: defaultParams, volume: 5169.7336, min: [-42, -42, 0], max: [42, 42, 4.65] },
    { name: '2×2 магниты+винты', p: { ...defaultParams, fasteners: full }, volume: 31948.7798, min: [-42, -42, 0], max: [42, 42, 8.65] },
    { name: '1×1', p: { ...defaultParams, x: 1, y: 1 }, volume: 1292.4334, min: [-21, -21, 0], max: [21, 21, 4.65] },
    { name: '3×2', p: { ...defaultParams, x: 3 }, volume: 7754.6004, min: [-63, -42, 0], max: [63, 42, 4.65] },
  ]
  for (const c of cases) {
    it(c.name, async () => {
      const m = await buildBaseplate(c.p)
      expectValidSolid(m, { min: c.min, max: c.max })
      expect(m.volume()).toBeCloseTo(c.volume, 2)
    })
  }
})
