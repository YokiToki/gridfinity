import { describe, expect, it } from 'vitest'
import { buildRackPanel, defaultRackPanel, validateRackPanel, type RackPanelParams } from './panel'
import { EAR_HOLE_SPACING, HOLE_OFFSETS, RACK_UNIT } from './spec'
import { expectValidSolid } from '../testing'

const P = (o: Partial<RackPanelParams> = {}): RackPanelParams => ({ ...defaultRackPanel, ...o })
const build = async (p: RackPanelParams) => { const r = await buildRackPanel(p); expect(r.error).toBeUndefined(); return r.panel! }

describe('панель стойки: размеры', () => {
  it.each([1, 2, 10])('%i U: габарит 254 × (n × 44.45 − 0.45) × толщина', async (n) => {
    const m = await build(P({ units: n, thickness: 3 }))
    expectValidSolid(m, { size: [254, n * RACK_UNIT - 0.45, 3], min: [-127, 0, 0] })
  })
  it('без допуска высота ровно n × 44.45', async () => {
    const m = await build(P({ units: 3, tolerance: false }))
    expectValidSolid(m, { size: [254, 3 * RACK_UNIT, 3] })
  })
  it('объём равен пластине без скруглений минус отверстия (в пределах 0.5 %)', async () => {
    const p = P({ units: 1, cornerRadius: 0, thickness: 4, ears: { positions: 'all', shape: 'round', size: 6.5, slotLength: 10 } })
    const m = await build(p)
    const expected = (254 * 44 - 6 * Math.PI * 3.25 ** 2) * 4
    expect(Math.abs(m.volume() - expected) / expected).toBeLessThan(0.005)
  })
  it('скругление углов уменьшает площадь на (4 − π) r² (четыре угла вместе)', async () => {
    const sharp = await build(P({ units: 1, cornerRadius: 0, ears: { ...defaultRackPanel.ears, positions: 'none' } }))
    const round = await build(P({ units: 1, cornerRadius: 3, ears: { ...defaultRackPanel.ears, positions: 'none' } }))
    expect((sharp.volume() - round.volume()) / 3).toBeCloseTo((4 - Math.PI) * 9, 0)
  })
})

describe('панель стойки: отверстия в ушах', () => {
  /** Сколько отверстий (сквозных колец) в срезе у каждого уха: считаем компоненты сечения. */
  const holesAt = async (p: RackPanelParams, x: number) => {
    const m = await build(p)
    const slice = m.slice(p.thickness / 2)
    const polys = slice.toPolygons()
    slice.delete()
    // контуры вокруг отверстий: меньшие 50 мм площади и центром у нужного уха
    const out: { cx: number; cy: number }[] = []
    for (const poly of polys) {
      const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1])
      const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys)
      if (w < 20 && h < 20) { const cx = (Math.max(...xs) + Math.min(...xs)) / 2; if (Math.abs(cx - x) < 1) out.push({ cx, cy: (Math.max(...ys) + Math.min(...ys)) / 2 }) }
    }
    return out.sort((a, b) => a.cy - b.cy)
  }
  it('1 U все позиции: три отверстия на ухо, 15.875 друг от друга, нижнее на 6.35, уши на 236.525', async () => {
    const p = P({ units: 1, ears: { positions: 'all', shape: 'round', size: 6.5, slotLength: 10 } })
    const right = await holesAt(p, EAR_HOLE_SPACING / 2), left = await holesAt(p, -EAR_HOLE_SPACING / 2)
    expect(right.map((h) => h.cy)).toHaveLength(3)
    right.forEach((h, i) => expect(h.cy).toBeCloseTo(HOLE_OFFSETS[i], 1))
    expect(right[1].cy - right[0].cy).toBeCloseTo(15.875, 1)
    expect(left).toHaveLength(3)
    expect(right[0].cx - left[0].cx).toBeCloseTo(236.525, 1)
  })
  it('3 U: девять отверстий на ухо, количество по вариантам', async () => {
    const e = (positions: 'all' | 'outer' | 'none') => ({ positions, shape: 'round' as const, size: 6.5, slotLength: 10 })
    expect(await holesAt(P({ units: 3, ears: e('all') }), 118.2625)).toHaveLength(9)
    expect(await holesAt(P({ units: 3, ears: e('outer') }), 118.2625)).toHaveLength(6)
    expect(await holesAt(P({ units: 3, ears: e('none') }), 118.2625)).toHaveLength(0)
  })
  it('паз: вертикальный, нужной ширины и длины, по центру стандартной позиции', async () => {
    const h = await holesAt(P({ units: 1, ears: { positions: 'all', shape: 'slot', size: 6.5, slotLength: 10 } }), 118.2625)
    expect(h).toHaveLength(3)
    h.forEach((q, i) => expect(q.cy).toBeCloseTo(HOLE_OFFSETS[i], 1))
  })
})

describe('проверка параметров', () => {
  it('допустимые по умолчанию', () => expect(validateRackPanel(defaultRackPanel).errors).toEqual([]))
  it.each([
    [{ units: 0 }, 'rack.error.units'], [{ units: 11 }, 'rack.error.units'], [{ units: 1.5 }, 'rack.error.units'],
    [{ thickness: 1 }, 'rack.error.thickness'], [{ cornerRadius: 11 }, 'rack.error.cornerRadius'],
  ])('%j → %s', (o, key) => expect(validateRackPanel(P(o)).errors).toContain(key))
  it('паз короче ширины и слишком большое поле отвергаются', () => {
    expect(validateRackPanel(P({ ears: { ...defaultRackPanel.ears, slotLength: 3 } })).errors).toContain('rack.error.slotLength')
    expect(validateRackPanel(P({ units: 1, pattern: { ...defaultRackPanel.pattern, kind: 'lines', margin: 25 } })).errors).toContain('rack.error.region')
  })
  it('недопустимые параметры не строятся', async () => {
    const r = await buildRackPanel(P({ units: 0 }))
    expect(r.panel).toBeNull(); expect(r.error).toBe('rack.error.units')
  })
})
