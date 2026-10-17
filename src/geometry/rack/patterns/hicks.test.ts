import { describe, expect, it } from 'vitest'
import { getWasm } from '../../wasm'
import { buildRackPanel, defaultRackPanel, validateRackPanel } from '../panel'
import { cutPattern } from '.'
import { bridgeVertices, hicksCell, hicksRings } from './hicks'
import { defaultPattern, type HicksParams, type PatternParams } from './types'

const H = defaultPattern.hicks
const pat = (o: Partial<HicksParams> = {}, rotate = false): PatternParams => ({ ...defaultPattern, kind: 'hicks', rotate, hicks: { ...H, ...o } })

describe('Hicks: кольца ячейки', () => {
  it('кольца идут снаружи внутрь: штрих у края, вырез, штрих, вырез…; в центре остаётся не менее stroke / 2', () => {
    const rings = hicksRings(24, 1.2, 1.2)
    expect(rings[0].outer).toBeCloseTo(10.8, 9); expect(rings[0].inner).toBeCloseTo(9.6, 9)
    rings.forEach((r, i) => {
      expect(r.outer - r.inner).toBeCloseTo(1.2, 9)
      if (i) expect(rings[i - 1].inner - r.outer).toBeCloseTo(1.2, 9) // штрих между кольцами
    })
    expect(rings[rings.length - 1].inner).toBeGreaterThanOrEqual(0.6 - 1e-9)
  })
  it('слишком маленькая ячейка колец не имеет, нулевые ширины тоже', () => {
    expect(hicksRings(2.5, 1.2, 1.2)).toEqual([])
    expect(hicksRings(24, 0, 1.2)).toEqual([]); expect(hicksRings(24, 1.2, 0)).toEqual([])
  })
  it('перемычки чередуются: чётные кольца на вершинах 0, 2, 4, нечётные на 1, 3, 5', () => {
    expect(bridgeVertices(0)).toEqual([0, 2, 4]); expect(bridgeVertices(1)).toEqual([1, 3, 5]); expect(bridgeVertices(2)).toEqual([0, 2, 4])
    for (let k = 0; k < 4; k++) expect(bridgeVertices(k).filter((v) => bridgeVertices(k + 1).includes(v))).toEqual([])
  })
  it('зазор вырезов равен gap: щуп по оси Y (между перемычками) даёт число колец × gap', async () => {
    const w = await getWasm()
    for (const gap of [0.8, 1.2, 2]) {
      const p = { ...H, gap }, cell = hicksCell(w, p)!
      const strip = w.CrossSection.square([0.1, 20], false).translate([-0.05, 0])
      expect(cell.intersect(strip).area()).toBeCloseTo(0.1 * hicksRings(p.width, p.stroke, gap).length * gap, 4)
    }
  })
  it('на оси вершины 0 кольцо 0 перекрыто перемычкой, а кольцо 1 вырезано', async () => {
    const w = await getWasm()
    const cell = hicksCell(w, H)!
    const strip = w.CrossSection.square([20, 0.1], false).translate([0, -0.05])
    // от центра вправо вдоль вершины 0: перемычки кольца 0 (вырез отсутствует), кольцо 1 — вырез шириной gap
    const rings = hicksRings(H.width, H.stroke, H.gap)
    expect(rings.length).toBeGreaterThanOrEqual(2)
    const hexR = (a: number) => (2 * a) / Math.sqrt(3)
    const onRay = (a0: number, a1: number) => cell.intersect(w.CrossSection.square([hexR(a0) - hexR(a1), 0.1], false).translate([hexR(a1), -0.05])).area()
    expect(onRay(rings[0].outer, rings[0].inner)).toBeCloseTo(0, 6)
    expect(onRay(rings[1].outer, rings[1].inner)).toBeCloseTo(0.1 * (hexR(rings[1].outer) - hexR(rings[1].inner)), 2)
    void strip
  })
})

describe('Hicks: краевые ячейки', () => {
  const region = { x0: -100, x1: 100, y0: 0, y1: 80 }
  it('без краевых — только целые ячейки; с краевыми добавляются задевающие область, целые те же', async () => {
    const { hicksCells } = await import('./hicks')
    const box = { width: 200, height: 80 }
    const off = hicksCells(box, { ...H, edgeCells: false }), on = hicksCells(box, { ...H, edgeCells: true })
    expect(off.edge).toEqual([]); expect(off.complete.length).toBeGreaterThan(5)
    expect(on.complete).toEqual(off.complete); expect(on.edge.length).toBeGreaterThan(4)
    const R = H.width / Math.sqrt(3)
    for (const c of on.complete) { expect(Math.abs(c.x) + R).toBeLessThanOrEqual(100 + 1e-6); expect(Math.abs(c.y) + H.width / 2).toBeLessThanOrEqual(40 + 1e-6) }
    for (const c of on.edge) { const whole = Math.abs(c.x) + R <= 100 + 1e-6 && Math.abs(c.y) + H.width / 2 <= 40 + 1e-6; expect(whole).toBe(false) }
  })
  it('с краевыми вырез доходит до границы области, но не выходит за неё', async () => {
    const w = await getWasm()
    const off = cutPattern(w, pat({ edgeCells: false }), region)!.bounds(), on = cutPattern(w, pat({ edgeCells: true }), region)!.bounds()
    expect(on.max[1] - on.min[1]).toBeGreaterThan(off.max[1] - off.min[1])
    expect(on.min[0]).toBeGreaterThanOrEqual(-100 - 1e-6); expect(on.max[0]).toBeLessThanOrEqual(100 + 1e-6); expect(on.min[1]).toBeGreaterThanOrEqual(-1e-6); expect(on.max[1]).toBeLessThanOrEqual(80 + 1e-6)
    expect(cutPattern(w, pat({ edgeCells: true }), region)!.area()).toBeGreaterThan(cutPattern(w, pat({ edgeCells: false }), region)!.area())
  })
  it('область меньше одной ячейки: без краевых пусто, с краевыми режется обрезок', async () => {
    const w = await getWasm()
    const small = { x0: -8, x1: 8, y0: 0, y1: 14 }
    expect(cutPattern(w, pat({ edgeCells: false }), small)).toBeNull()
    expect(cutPattern(w, pat({ edgeCells: true }), small)).not.toBeNull()
  })
  it.each([[{}], [{ stroke: 0.8, gap: 0.8 }], [{ width: 12, stroke: 0.8, gap: 0.8 }], [{ width: 40, stroke: 2, gap: 3 }], [{ width: 16, stroke: 3, gap: 0.8 }], [{ width: 31, stroke: 1.5, gap: 1 }]])('с краевыми панель одним куском при %j (и с поворотом)', async (o) => {
    for (const rotate of [false, true]) {
      const r = await buildRackPanel({ ...defaultRackPanel, units: 2, pattern: pat({ ...o, edgeCells: true }, rotate) })
      expect(r.error).toBeUndefined(); expect(r.panel!.decompose()).toHaveLength(1)
    }
  })
})

describe('Hicks: панель', () => {
  const panel = (o: Partial<HicksParams> = {}, rotate = false, units = 2) => ({ ...defaultRackPanel, units, pattern: pat(o, rotate) })
  it.each([
    [{}], [{ stroke: 0.8, gap: 0.8 }], [{ width: 12, stroke: 0.8, gap: 0.8 }], [{ width: 40, stroke: 2, gap: 3 }], [{ width: 16, stroke: 3, gap: 0.8 }],
  ])('одна компонента при %j', async (o) => {
    const r = await buildRackPanel(panel(o))
    expect(r.error).toBeUndefined()
    expect(r.panel!.decompose()).toHaveLength(1)
    expect(r.panel!.volume()).toBeLessThan((await buildRackPanel({ ...defaultRackPanel, units: 2 })).panel!.volume() * 0.99)
  })
  it('поворот на 90° тоже одна компонента', async () => {
    const r = await buildRackPanel(panel({}, true))
    expect(r.error).toBeUndefined(); expect(r.panel!.decompose()).toHaveLength(1)
  })
  it('узор в области: вырез целиком внутри и с центровкой', async () => {
    const w = await getWasm()
    const c = cutPattern(w, pat(), { x0: -100, x1: 100, y0: 0, y1: 80 })!.bounds()
    expect(c.min[0]).toBeGreaterThanOrEqual(-100 - 1e-6); expect(c.max[0]).toBeLessThanOrEqual(100 + 1e-6); expect(c.min[1]).toBeGreaterThanOrEqual(-1e-6); expect(c.max[1]).toBeLessThanOrEqual(80 + 1e-6)
    expect(Math.abs((c.min[0] + c.max[0]) / 2)).toBeLessThan(0.5) // перемычки на вершинах 0, 2, 4 чуть сдвигают габарит
  })
  it('тонкие настройки предупреждают с именем', () => {
    expect(validateRackPanel(panel({ stroke: 0.5 })).warnings).toEqual([{ key: 'rack.warning.thin', setting: 'stroke' }])
    expect(validateRackPanel(panel({ gap: 0.5 })).warnings).toEqual([{ key: 'rack.warning.thin', setting: 'gap' }])
    expect(validateRackPanel(panel()).warnings).toEqual([])
  })
  it('10 U строится быстрее 2 с', async () => {
    const t0 = performance.now()
    const r = await buildRackPanel(panel({}, false, 10))
    expect(r.error).toBeUndefined(); expect(performance.now() - t0).toBeLessThan(2000)
  }, 20000)
})
