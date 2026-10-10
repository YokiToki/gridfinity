import { describe, expect, it } from 'vitest'
import { generate, modelBounds } from './model'
import { defaultSplit } from './split'
import { defaultConnector } from './connectors'
import { mm, sharpParams, units } from './testing'

describe('generate: части модели', () => {
  it('без разделения одна часть A1 с габаритами плиты', async () => {
    const r = await generate('baseplate', sharpParams)
    expect(r.parts.map((p) => p.label)).toEqual(['A1'])
    const b = modelBounds(r)
    expect(b.max[0] - b.min[0]).toBeCloseTo(84, 3)
    expect(r.parts[0].mesh.volume).toBeGreaterThan(0)
    expect(r.parts[0].oversize).toBe(false)
  })
  it('300×200 на столе 256: две части A1 и B1, собранные в габарит плиты, подписи и позиции в сетке', async () => {
    const g = { ...sharpParams, x: mm(300), y: mm(200), split: { ...defaultSplit, enabled: true, maxX: 246, maxY: 246 } }
    const r = await generate('baseplate', g)
    expect(r.parts.map((p) => [p.label, p.col, p.row])).toEqual([['A1', 0, 0], ['B1', 1, 0]])
    const b = modelBounds(r)
    expect(b.max[0] - b.min[0]).toBeCloseTo(300, 3)
    expect(b.max[1] - b.min[1]).toBeCloseTo(200, 3)
    for (const p of r.parts) expect(p.mesh.max[0] - p.mesh.min[0]).toBeLessThanOrEqual(246)
  })
  it('часть, не помещающаяся на стол, помечена oversize', async () => {
    const g = { ...sharpParams, x: units(7), y: units(1), split: { ...defaultSplit, enabled: true, auto: false, xCuts: [1], maxX: 246, maxY: 246 } }
    const r = await generate('baseplate', g)
    expect(r.parts.map((p) => p.oversize)).toEqual([false, true])
  })
  it('соединители попадают в сетки частей', async () => {
    const base = { ...sharpParams, x: units(4), y: units(2), split: { ...defaultSplit, enabled: true, maxX: 100, maxY: 300 } }
    const plain = await generate('baseplate', base)
    const dove = await generate('baseplate', { ...base, split: { ...base.split, connector: { ...defaultConnector, type: 'dovetail' as const } } })
    expect(dove.parts[0].mesh.volume).toBeGreaterThan(plain.parts[0].mesh.volume)
    expect(dove.parts[1].mesh.volume).toBeLessThan(plain.parts[1].mesh.volume)
  })
})
