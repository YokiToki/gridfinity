import { describe, expect, it } from 'vitest'
import { circleCutout, rectCutout, type Cutout } from '../../geometry/cutout'
import { migrateCutout } from './migrate'

const list = (raw: unknown[]) => (migrateCutout({ cutouts: raw }).cutouts as Cutout[])

describe('migrateCutout: круги (2.1)', () => {
  it('сохранённая сессия с прямоугольником, кругом и деталью загружается без изменений', () => {
    const mesh = { id: 'm', name: 'Part', x: 1, y: 2, rotation: 3, depth: 4, clearance: 0.5, visible: true, source: { kind: 'mesh', meshId: 'a', filename: 'a.stl', unit: 'mm', orientation: {}, mode: 'projected', size: [1, 1, 1], hull: [] } }
    const raw = [rectCutout({ id: 'r', color: 0 }), circleCutout({ id: 'c', x: 5, color: 1, source: { diameter: 33 } }), { ...mesh, color: 2 }]
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

describe('migrateCutout: цвета (1.3)', () => {
  it('старая сессия без цветов получает цвета по порядку списка, остальные поля не меняются', () => {
    const raw = [rectCutout({ id: 'a' }), circleCutout({ id: 'b' }), rectCutout({ id: 'c' })]
    const out = list(JSON.parse(JSON.stringify(raw)))
    expect(out.map((c) => c.color)).toEqual([0, 1, 2])
    expect(out.map((c) => ({ ...c, color: undefined }))).toEqual(raw.map((c) => ({ ...c, color: undefined })))
  })
  it('сохранённые допустимые цвета не трогаются, битые заменяются первым свободным', () => {
    const raw = [rectCutout({ id: 'a', color: 3 }), rectCutout({ id: 'b', color: 99 }), rectCutout({ id: 'c', color: 0 }), { ...rectCutout({ id: 'd' }), color: 'red' }]
    expect(list(JSON.parse(JSON.stringify(raw))).map((c) => c.color)).toEqual([3, 1, 0, 2])
  })
  it('пустой и повреждённый список не падают', () => {
    expect(migrateCutout({}).cutouts).toEqual([])
    expect(migrateCutout({ cutouts: 'x' }).cutouts).toEqual([])
  })
})
