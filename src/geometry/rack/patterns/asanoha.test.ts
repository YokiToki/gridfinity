import { describe, expect, it } from 'vitest'
import { getWasm } from '../../wasm'
import { buildRackPanel, defaultRackPanel, validateRackPanel } from '../panel'
import { cutPattern } from '.'
import { asanohaCut, asanohaSegments, asanohaStep } from './asanoha'
import { defaultPattern, type PatternParams } from './types'

const A = defaultPattern.asanoha
const R = asanohaStep(A.width)
const pat = (o: Partial<PatternParams['asanoha']> = {}, rotate = false): PatternParams => ({ ...defaultPattern, kind: 'asanoha', rotate, asanoha: { ...A, ...o } })
const key = (s: { x0: number; y0: number; x1: number; y1: number }) => [[s.x0, s.y0], [s.x1, s.y1]].map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).sort().join('|')

describe('асаноха: решётка', () => {
  const box = { width: 200, height: 120 }
  const { main, detail } = asanohaSegments(box, A.width)
  it('главные штрихи: каждое ребро один раз, длина R', () => {
    expect(new Set(main.map(key)).size).toBe(main.length)
    for (const s of main) expect(Math.hypot(s.x1 - s.x0, s.y1 - s.y0)).toBeCloseTo(R, 9)
  })
  it('узлы лежат на треугольной решётке с шагом R', () => {
    const by = (R * Math.sqrt(3)) / 2
    for (const s of main) for (const [x, y] of [[s.x0, s.y0], [s.x1, s.y1]]) {
      const j = y / by, i = (x - j * (R / 2)) / R
      expect(Math.abs(j - Math.round(j))).toBeLessThan(1e-6); expect(Math.abs(i - Math.round(i))).toBeLessThan(1e-6)
    }
  })
  it('по формуле: на узел приходится 3 ребра и 6 отрезков детали (шесть на два треугольника)', () => {
    const points = (box.width * box.height) / ((R * R * Math.sqrt(3)) / 2)
    expect(main.length / points).toBeGreaterThan(2.7); expect(main.length / points).toBeLessThan(4)
    expect(detail.length % 3).toBe(0)
    expect(detail.length / points).toBeGreaterThan(5.4); expect(detail.length / points).toBeLessThan(9)
    for (const s of detail) expect(Math.hypot(s.x1 - s.x0, s.y1 - s.y0)).toBeCloseTo(R / Math.sqrt(3), 9)
  })
  it('область меньше половины шестиугольника — отрезков нет или они только у узла, без ошибок', () => {
    expect(() => asanohaSegments({ width: 0.2, height: 0.2 }, A.width)).not.toThrow()
    expect(asanohaSegments({ width: 5, height: 5 }, 0).main).toEqual([])
  })
})

describe('асаноха: отверстия', () => {
  const region = { x0: -60, x1: 60, y0: 0, y1: 50 }
  it('вырезаются целые отверстия внутри области; штрихи остаются материалом', async () => {
    const w = await getWasm()
    const c = cutPattern(w, pat(), region)!
    const b = c.bounds()
    expect(b.min[0]).toBeGreaterThanOrEqual(-60); expect(b.max[0]).toBeLessThanOrEqual(60); expect(b.min[1]).toBeGreaterThanOrEqual(0); expect(b.max[1]).toBeLessThanOrEqual(50)
    const holes = c.decompose()
    expect(holes.length).toBeGreaterThan(20)
    holes.forEach((h) => { const hb = h.bounds(); expect(hb.min[0]).toBeGreaterThan(-60); expect(hb.max[0]).toBeLessThan(60); expect(h.area()).toBeGreaterThan(0.05) })
    expect(c.area()).toBeLessThan(120 * 50) // штрихи занимают заметную часть
  })
  it('толщина штриха определяет площадь отверстий: шире штрих — меньше вырезано', async () => {
    const w = await getWasm()
    const area = (mw: number) => cutPattern(w, pat({ mainWidth: mw }), region)!.area()
    expect(area(2.4)).toBeLessThan(area(1.6)); expect(area(1.6)).toBeLessThan(area(0.8))
  })
  it('детальные штрихи делят отверстие: с ними отверстий втрое больше, чем без них', async () => {
    const w = await getWasm()
    const n = (dw: number) => cutPattern(w, pat({ detailWidth: dw }), region)!.decompose().length
    expect(n(1.2) / n(0)).toBeGreaterThan(2); expect(n(1.2) / n(0)).toBeLessThan(3.6)
  })
  it('поворот на 90° остаётся в области и режет сравнимую площадь', async () => {
    const w = await getWasm()
    const flat = cutPattern(w, pat(), region)!, turned = cutPattern(w, pat({}, true), region)!
    const b = turned.bounds(); expect(b.min[0]).toBeGreaterThanOrEqual(-60 - 1e-6); expect(b.max[0]).toBeLessThanOrEqual(60 + 1e-6); expect(b.max[1]).toBeLessThanOrEqual(50 + 1e-6)
    expect(Math.abs(turned.area() - flat.area()) / flat.area()).toBeLessThan(0.4)
  })
  it('область меньше одного отверстия ничего не режет и не ломается', async () => {
    const w = await getWasm()
    expect(cutPattern(w, pat(), { x0: 0, x1: 0, y0: 0, y1: 5 })).toBeNull()
    expect(() => asanohaCut(w, { width: 4, height: 4 }, A)).not.toThrow()
    expect(asanohaCut(w, { width: 4, height: 4 }, A)).toBeNull()
    expect(asanohaCut(w, { width: 100, height: 100 }, { ...A, mainWidth: 0 })).toBeNull()
  })
})

describe('асаноха: панель', () => {
  const panel = (o: Partial<PatternParams['asanoha']> = {}, units = 2) => ({ ...defaultRackPanel, units, pattern: pat(o) })
  it('панель одним куском с отверстиями сквозь, габарит прежний', async () => {
    const plain = (await buildRackPanel({ ...defaultRackPanel, units: 2 })).panel!
    const r = await buildRackPanel(panel())
    expect(r.error).toBeUndefined()
    expect(r.panel!.decompose()).toHaveLength(1)
    expect(r.panel!.genus()).toBeGreaterThan(plain.genus() + 20)
    const bp = plain.boundingBox(), bq = r.panel!.boundingBox()
    for (let k = 0; k < 3; k++) { expect(bq.min[k]).toBeCloseTo(bp.min[k], 6); expect(bq.max[k]).toBeCloseTo(bp.max[k], 6) }
    expect(plain.volume() - r.panel!.volume()).toBeGreaterThan(1000)
  })
  it.each([[{ mainWidth: 0.8, detailWidth: 0.8 }], [{ width: 12, mainWidth: 0.8, detailWidth: 0 }], [{ width: 60 }], [{ mainWidth: 4, detailWidth: 3 }]])('одна компонента при %j', async (o) => {
    const r = await buildRackPanel(panel(o))
    expect(r.error).toBeUndefined(); expect(r.panel!.decompose()).toHaveLength(1)
  })
  it('тонкий штрих предупреждает; выключенные детали не проверяются', () => {
    expect(validateRackPanel(panel({ detailWidth: 0.5 })).warnings).toEqual([{ key: 'rack.warning.thin', setting: 'detailWidth' }])
    expect(validateRackPanel(panel({ detailWidth: 0 })).warnings).toEqual([])
    expect(validateRackPanel(panel({ mainWidth: 0.5 })).warnings).toEqual([{ key: 'rack.warning.thin', setting: 'mainWidth' }])
  })
  it('10 U по умолчанию строится быстрее 2 с', async () => {
    const t0 = performance.now()
    const r = await buildRackPanel(panel({}, 10))
    expect(r.error).toBeUndefined()
    expect(performance.now() - t0).toBeLessThan(2000)
  }, 20000)
})
