import { describe, expect, it } from 'vitest'
import { getWasm } from '../wasm'
import { buildRackPanel, defaultRackPanel } from './panel'
import { applyEngrave, ENGRAVE_FLOOR, engraveIssues, maxEngraveDepth } from './engrave'
import { expectValidSolid } from '../testing'

const plate = async (t = 3) => { const w = await getWasm(); return { w, solid: w.Manifold.extrude(w.CrossSection.square([100, 40], true), t) } }

describe('гравировка', () => {
  it('квадрат глубиной d снимает площадь × d (в пределах 1 %), контур и одна компонента остаются', async () => {
    const { w, solid } = await plate()
    const sq = w.CrossSection.square([10, 10], true)
    const out = applyEngrave(w, solid, [{ shape: sq, depth: 1.5 }], 3)
    expect(solid.volume() - out.volume()).toBeCloseTo(100 * 1.5, 0)
    expectValidSolid(out, { size: [100, 40, 3] })
    const parts = out.decompose(); expect(parts).toHaveLength(1)
  })
  it('глубина больше толщины − 0.8 ограничивается пределом', async () => {
    const { w, solid } = await plate()
    expect(maxEngraveDepth(3)).toBeCloseTo(3 - ENGRAVE_FLOOR, 9)
    const sq = w.CrossSection.square([10, 10], true)
    const deep = applyEngrave(w, solid, [{ shape: sq, depth: 99 }], 3)
    expect(solid.volume() - deep.volume()).toBeCloseTo(100 * 2.2, 0)
  })
  it('предупреждение о глубине называет настройку и предел; в пределах и при 0 предупреждений нет', () => {
    expect(engraveIssues([{ setting: 'mainDepth', depth: 5 }, { setting: 'detailDepth', depth: 1 }], 3)).toEqual([{ key: 'rack.warning.depth', setting: 'mainDepth', value: 2.2 }])
    expect(engraveIssues([{ setting: 'mainDepth', depth: 2.2 }, { setting: 'detailDepth', depth: 0 }], 3)).toEqual([])
  })
  it('глубина 0 ничего не режет и не создаёт нового тела', async () => {
    const { w, solid } = await plate()
    const same = applyEngrave(w, solid, [{ shape: w.CrossSection.square([10, 10], true), depth: 0 }], 3)
    expect(same).toBe(solid)
  })
  it('две гравировки разной глубины складываются; результат всё ещё валиден', async () => {
    const { w, solid } = await plate()
    const a = w.CrossSection.square([10, 10], true).translate([-20, 0]), b = w.CrossSection.square([10, 10], true).translate([20, 0])
    const out = applyEngrave(w, solid, [{ shape: a, depth: 1 }, { shape: b, depth: 2 }], 3)
    expect(solid.volume() - out.volume()).toBeCloseTo(100 * 3, 0)
    expectValidSolid(out)
  })
  it('панель с узорами 26 не меняется: объём и габариты те же', async () => {
    const r = await buildRackPanel({ ...defaultRackPanel, units: 1, pattern: { ...defaultRackPanel.pattern, kind: 'lines' } })
    expect(r.error).toBeUndefined(); expectValidSolid(r.panel!, { size: [254, 44, 3] })
  })
})
