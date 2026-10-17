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
    expect(detail.length / points).toBeGreaterThan(5.4); expect(detail.length / points).toBeLessThan(8)
    for (const s of detail) expect(Math.hypot(s.x1 - s.x0, s.y1 - s.y0)).toBeCloseTo(R / Math.sqrt(3), 9)
  })
  it('область меньше половины шестиугольника — отрезков нет или они только у узла, без ошибок', () => {
    expect(() => asanohaSegments({ width: 0.2, height: 0.2 }, A.width)).not.toThrow()
    expect(asanohaSegments({ width: 5, height: 5 }, 0).main).toEqual([])
  })
})

describe('асаноха: штрихи в панели', () => {
  const region = { x0: -50, x1: 50, y0: 0, y1: 40 }
  it('оба набора гравируются на своих глубинах и лежат внутри области', async () => {
    const w = await getWasm()
    const c = cutPattern(w, pat(), region)
    expect(c.through ?? null).toBeNull()
    expect(c.engrave?.map((e) => e.depth).sort()).toEqual([0.8, 1.2])
    for (const e of c.engrave!) { const b = e.shape.bounds(); expect(b.min[0]).toBeGreaterThanOrEqual(-50 - 1e-6); expect(b.max[0]).toBeLessThanOrEqual(50 + 1e-6); expect(b.min[1]).toBeGreaterThanOrEqual(-1e-6); expect(b.max[1]).toBeLessThanOrEqual(40 + 1e-6); expect(e.shape.area()).toBeGreaterThan(50) }
  })
  it('глубина детали 0 — только главные штрихи; глубина главных 0 — только детали', async () => {
    const w = await getWasm()
    expect(cutPattern(w, pat({ detailDepth: 0 }), region).engrave?.map((e) => e.depth)).toEqual([1.2])
    expect(cutPattern(w, pat({ mainDepth: 0 }), region).engrave?.map((e) => e.depth)).toEqual([0.8])
    expect(cutPattern(w, pat({ mainDepth: 0, detailDepth: 0 }), region).engrave).toEqual([])
  })
  it('ширина штриха определяет площадь: вдвое шире — почти вдвое больше', async () => {
    const w = await getWasm()
    const area = (mw: number) => cutPattern(w, pat({ detailDepth: 0, mainWidth: mw }), region).engrave![0].shape.area()
    expect(area(2.4) / area(1.2)).toBeGreaterThan(1.8); expect(area(2.4) / area(1.2)).toBeLessThan(2.05)
  })
  it('поворот на 90° переносит узор целиком и оставляет его в области', async () => {
    const w = await getWasm()
    const flat = cutPattern(w, pat({ detailDepth: 0 }), region).engrave![0].shape, turned = cutPattern(w, pat({ detailDepth: 0 }, true), region).engrave![0].shape
    const b = turned.bounds(); expect(b.min[0]).toBeGreaterThanOrEqual(-50 - 1e-6); expect(b.max[1]).toBeLessThanOrEqual(40 + 1e-6)
    expect(Math.abs(turned.area() - flat.area()) / flat.area()).toBeLessThan(0.15)
    // решётка с горизонтальными рёбрами: без поворота шов вдоль X есть, при повороте — вдоль Y (центральный узел остаётся в центре области)
    expect(flat.area()).toBeGreaterThan(0)
  })
  it('область меньше шестиугольника не ломается', async () => {
    const w = await getWasm()
    expect(() => asanohaCut(w, { width: 0.4, height: 0.4 }, A)).not.toThrow()
    expect(cutPattern(w, pat(), { x0: 0, x1: 0, y0: 0, y1: 5 }).engrave ?? []).toEqual([])
  })
})

describe('асаноха: панель', () => {
  const panel = (o: Partial<PatternParams['asanoha']> = {}, thickness = 3) => ({ ...defaultRackPanel, units: 2, thickness, pattern: pat(o) })
  it('панель целая: тот же габарит и число отверстий, объём меньше на площадь штрихов × глубину', async () => {
    const plain = (await buildRackPanel({ ...defaultRackPanel, units: 2 })).panel!
    const r = await buildRackPanel(panel())
    expect(r.error).toBeUndefined()
    expect(r.panel!.genus()).toBe(plain.genus())
    const bp = plain.boundingBox(), bq = r.panel!.boundingBox()
    for (let k = 0; k < 3; k++) { expect(bq.min[k]).toBeCloseTo(bp.min[k], 6); expect(bq.max[k]).toBeCloseTo(bp.max[k], 6) }
    const removed = plain.volume() - r.panel!.volume()
    expect(removed).toBeGreaterThan(300); expect(removed).toBeLessThan(plain.volume() * 0.3)
    expect(r.panel!.decompose()).toHaveLength(1)
  })
  it('глубина выше предела: предупреждение и глубина ограничена', async () => {
    const warn = validateRackPanel(panel({ mainDepth: 5 })).warnings
    expect(warn).toEqual([{ key: 'rack.warning.depth', setting: 'mainDepth', value: 2.2 }])
    const shallow = (await buildRackPanel(panel({ mainDepth: 2.2, detailDepth: 0 }))).panel!, over = (await buildRackPanel(panel({ mainDepth: 5, detailDepth: 0 }))).panel!
    expect(over.volume()).toBeCloseTo(shallow.volume(), 3)
  })
  it('тонкий штрих предупреждает только у включённого набора', () => {
    expect(validateRackPanel(panel({ detailWidth: 0.5 })).warnings).toEqual([{ key: 'rack.warning.thin', setting: 'detailWidth' }])
    expect(validateRackPanel(panel({ detailWidth: 0.5, detailDepth: 0 })).warnings).toEqual([])
  })
  it('10 U по умолчанию строится быстрее 2 с', async () => {
    const t0 = performance.now()
    const r = await buildRackPanel({ ...defaultRackPanel, units: 10, pattern: pat() })
    expect(r.error).toBeUndefined()
    expect(performance.now() - t0).toBeLessThan(2000)
  }, 20000)
})
