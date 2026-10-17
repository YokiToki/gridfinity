import { describe, expect, it } from 'vitest'
import { circleCutout, rectCutout, type Cutout } from '../../geometry/cutout'
import { migrateCutout } from './migrate'

const list = (raw: unknown[]) => (migrateCutout({ cutouts: raw }).cutouts as Cutout[])

describe('migrateCutout: круги (2.1)', () => {
  it('сохранённая сессия с прямоугольником, кругом и деталью загружается без изменений', () => {
    const mesh = { id: 'm', name: 'Part', x: 1, y: 2, rotation: 3, depth: 4, clearance: 0.5, visible: true, source: { kind: 'mesh', meshId: 'a', filename: 'a.stl', unit: 'mm', orientation: {}, mode: 'projected', size: [1, 1, 1], hull: [] } }
    const raw = [rectCutout({ id: 'r' }), circleCutout({ id: 'c', x: 5, source: { diameter: 33 } }), mesh]
    const out = list(JSON.parse(JSON.stringify(raw)))
    expect(out).toEqual(raw)
  })

  it('круг без диаметра, с нулевым, отрицательным или нечисловым диаметром отбрасывается, остальные остаются', () => {
    const bad = (diameter: unknown) => ({ ...circleCutout({ id: 'x' }), source: { kind: 'circle', diameter } })
    const out = list([bad(undefined), bad(0), bad(-3), bad('20'), circleCutout({ id: 'ok' }), rectCutout({ id: 'r' })])
    expect(out.map((c) => c.id)).toEqual(['ok', 'r'])
  })

  it('старые записи без новых полей донаполняются умолчаниями (как раньше)', () => {
    const out = list([{ id: 'c', source: { kind: 'circle', diameter: 12 } }])
    expect(out[0]).toMatchObject({ x: 0, y: 0, rotation: 0, depth: 10, clearance: 0.5, visible: true, source: { diameter: 12 } })
  })

  it('неизвестный вид источника по-прежнему отбрасывается', () => {
    expect(list([{ id: 'u', source: { kind: 'ellipse' } }])).toEqual([])
  })
})
