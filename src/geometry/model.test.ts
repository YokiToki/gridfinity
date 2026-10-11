import { describe, expect, it } from 'vitest'
import { generate, modelBounds, registerMesh } from './model'
import { defaultSplit } from './split'
import { defaultConnector } from './connectors'
import { defaultCutout, rectCutout } from './cutout'
import { toBinaryStl } from './stl'
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

describe('generate: вырезающий инструмент (cutout)', () => {
  const params = { ...defaultCutout, lip: 'none' as const }
  it('по одному телу на видимый вырез, скрытые отсутствуют', async () => {
    const a = rectCutout({ id: 'a', depth: 10, source: { width: 30, length: 20, radius: 0 } }), b = rectCutout({ id: 'b', visible: false, x: 20 })
    const r = await generate('cutout', { ...params, cutouts: [a, b] })
    expect(r.tools?.map((t) => t.id)).toEqual(['a'])
    const t = r.tools![0].mesh
    expect(t.volume).toBeCloseTo(30 * 20 * 10, 0)
    expect(t.max[2]).toBeCloseTo(21, 3) // верх инструмента на уровне стенки: он стоит на дне кармана
  })
  it('инструмент не входит в габариты, объём и экспорт', async () => {
    const plain = await generate('cutout', params)
    const r = await generate('cutout', { ...params, cutouts: [rectCutout({ depth: 10 })] })
    expect(modelBounds(r)).toEqual(modelBounds(plain))
    expect(r.parts).toHaveLength(1)
    expect(toBinaryStl(r.parts[0].mesh).size).toBe(84 + 50 * (r.parts[0].mesh.triVerts.length / 3))
    expect(plain.tools).toEqual([])
  })
})

describe('generate: инструмент из STL', () => {
  it('деталь показывается исходной сеткой, в том числе незамкнутой', async () => {
    const { boxSoup } = await import('./stl-fixtures')
    const { repairMesh, describeMesh, defaultOrientation } = await import('./stl-import')
    const mesh = repairMesh(boxSoup(30, 12, 6)).mesh
    const open = { vertProperties: mesh.vertProperties, triVerts: mesh.triVerts.slice(0, mesh.triVerts.length - 3) }
    const info = describeMesh(mesh.vertProperties, 'mm', defaultOrientation)
    const c = rectCutout({ id: 'm', depth: 10, x: 5, y: -3, rotation: 90, source: { kind: 'rect' } })
    c.source = { kind: 'mesh', meshId: 'x', filename: 'x.stl', unit: 'mm', orientation: defaultOrientation, mode: '3d', size: info.size, hull: info.hull }
    for (const [m, tris] of [[mesh, 12], [open, 11]] as const) {
      registerMesh('x', m)
      const r = await generate('cutout', { ...defaultCutout, lip: 'none', cutouts: [c] })
      const t = r.tools![0].mesh
      expect(t.triVerts.length / 3).toBe(tris) // ровно исходные треугольники, без ступеней и упрощения
      expect(t.min[2]).toBeCloseTo(11, 3); expect(t.max[2]).toBeCloseTo(17, 3)
      expect([t.max[0] - t.min[0], t.max[1] - t.min[1]].map((v) => +v.toFixed(3))).toEqual([12, 30]) // повёрнут на 90°
    }
  })
})
