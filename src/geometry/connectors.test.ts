import { describe, expect, it } from 'vitest'
import { getWasm } from './wasm'
import {
  connectorExtras, connectorZ, cutFaces, defaultConnector, dovetailFits, END_WALL, faceLength, holeFitsRidge, HOLE_PRESETS, MIN_WALL, nominalPositions,
  planFace, ridgeWidthAt, withHolePreset, type ConnectorConfig,
} from './connectors'
import { baseplateLayout, buildBaseplate, buildBaseplateParts, planSplit, type BaseplateGeometry } from './baseplate'
import { defaultFasteners, type FastenerConfig } from './fasteners'
import { defaultSplit, splitParts } from './split'
import { expectValidSolid, mm, sharpParams, units } from './testing'

const conn = (o: Partial<ConnectorConfig> = {}): ConnectorConfig => ({ ...defaultConnector, ...o })
/** 4×4 ячейки, разрез по X пополам: торец длиной 168 мм с рёбрами на 42, 84, 126. */
const plate = (c: ConnectorConfig, o: Partial<BaseplateGeometry> = {}): BaseplateGeometry => ({
  ...sharpParams, x: units(4), y: units(4), ...o,
  split: { ...defaultSplit, enabled: true, maxX: 100, maxY: 300, connector: c },
})
const holes = (o: Partial<ConnectorConfig> = {}) => conn({ type: 'holes', ...o })

describe('профиль стенки между гнёздами', () => {
  it('ширина: 5.7 внизу, 4.3 на вертикальном участке, 0 на кромке', () => {
    expect(ridgeWidthAt(42, 0)).toBeCloseTo(5.7, 9)
    expect(ridgeWidthAt(42, 0.7)).toBeCloseTo(4.3, 9)
    expect(ridgeWidthAt(42, 2.5)).toBeCloseTo(4.3, 9)
    expect(ridgeWidthAt(42, 4.65)).toBeCloseTo(0, 9)
  })
  it('какие отверстия помещаются в ребро: пруток, штифты и магниты да, 6 мм нет', () => {
    for (const [d, ok] of [[1.9, true], [2.1, true], [3.1, true], [2.95, true], [3.2, true], [6, false]] as const) {
      expect(holeFitsRidge(42, 0, d, connectorZ(0, d))).toBe(ok)
    }
  })
  it('ласточкин хвост по умолчанию помещается, слишком глубокий или высокий — нет', () => {
    expect(dovetailFits(42, 0, defaultConnector)).toBe(true)
    expect(dovetailFits(42, 0, conn({ dovetailDepth: 2 }))).toBe(false)
    expect(dovetailFits(42, 0, conn({ dovetailHeight: 4.5 }))).toBe(false)
    expect(dovetailFits(42, 4, defaultConnector)).toBe(true) // над окном под гнездом стенка шире
  })
})

describe('торцы, рёбра и положения', () => {
  it('рёбра торца — границы ячеек строго внутри него', () => {
    const fp = baseplateLayout(plate(conn())).fp
    const [face] = cutFaces(fp, splitParts(fp, [2], []))
    expect(face.axis).toBe('x')
    expect(face.ribs).toEqual([42, 84, 126])
    expect(faceLength(face)).toBeCloseTo(168, 9)
  })
  it('торец шириной в одну ячейку рёбер не имеет', () => {
    const fp = baseplateLayout({ ...sharpParams, x: units(6), y: units(1) }).fp
    const faces = cutFaces(fp, splitParts(fp, [2, 4], []))
    expect(faces.map((f) => [f.axis, f.cut, f.a.label, f.b.label, f.ribs])).toEqual([['x', 2, 'A1', 'B1', []], ['x', 4, 'B1', 'C1', []]])
  })
  it('разрез по Y: рёбра отсчитываются от конца торца (ось u против x)', () => {
    const fp = baseplateLayout({ ...sharpParams, x: units(4), y: units(4) }).fp
    const faces = cutFaces(fp, splitParts(fp, [], [2]))
    expect(faces).toHaveLength(1)
    expect(faces[0].axis).toBe('y')
    expect(faces[0].ribs).toEqual([42, 84, 126])
  })
  it('дробный размер: рёбра смещены остатком выравнивания', () => {
    const fp = baseplateLayout({ ...sharpParams, x: units(2), y: mm(100, 'start') }).fp
    const [face] = cutFaces(fp, splitParts(fp, [1], []))
    expect(face.ribs).toEqual([42]) // граница ячеек на 42 мм от начала при выравнивании start
    expect(faceLength(face)).toBeCloseTo(100, 9)
  })
  it('количество и отступ задают номинальные положения', () => {
    expect(nominalPositions(84, 2, 10)).toEqual([10, 74])
    expect(nominalPositions(84, 3, 10)).toEqual([10, 42, 74])
    expect(nominalPositions(84, 1, 10)).toEqual([42])
    expect(nominalPositions(15, 2, 10)).toEqual([])
  })
})

describe('пресеты отверстий', () => {
  it('значения: пруток 1.9, штифты, магниты с глубиной толщина + 0.1', () => {
    expect(HOLE_PRESETS.map((p) => [p.id, p.diameter, p.depth])).toEqual([
      ['filament', 1.9, 6], ['pin2', 2.1, 6], ['pin3', 3.1, 6], ['magnet3x2', 3.1, 2.1], ['magnet2_8x0_75', 2.95, 0.85],
    ])
  })
  it('по умолчанию — пруток 1.75 мм', () => {
    expect(defaultConnector).toMatchObject({ preset: 'filament', diameter: 1.9, depth: 6, dovetailHeight: 2 })
  })
  it('применение пресета меняет размеры, custom оставляет текущие, M3 и 6×2 убраны', () => {
    expect(withHolePreset(defaultConnector, 'magnet2_8x0_75')).toMatchObject({ diameter: 2.95, depth: 0.85 })
    expect(withHolePreset({ ...defaultConnector, diameter: 5 }, 'custom')).toMatchObject({ preset: 'custom', diameter: 5 })
    expect(HOLE_PRESETS.some((p) => p.id === 'm3' || p.id === 'm6x2')).toBe(false)
  })
})

describe('отверстия в торцы рёбер', () => {
  it('позиции — ближайшие к номинальным рёбра, одни и те же в обеих частях', () => {
    const [plan] = planSplit(plate(holes({ count: 2, inset: 10 }))).plans
    expect(plan.issues).toEqual([])
    expect(plan.positions).toEqual([42, 126]) // номинальные 10 и 158
    expect(planSplit(plate(holes({ count: 1 }))).plans[0].positions).toEqual([84])
    expect(planSplit(plate(holes({ count: 3, inset: 10 }))).plans[0].positions).toEqual([42, 84, 126])
  })
  it('count больше числа рёбер: используются все рёбра', () => {
    expect(planSplit(plate(holes({ count: 8 }))).plans[0].positions).toEqual([42, 84, 126])
  })
  it('глубина по умолчанию 6 мм в каждую часть; ограничена длиной части минус 2 мм', () => {
    const [plan] = planSplit(plate(holes())).plans
    expect([plan.depthA, plan.depthB]).toEqual([6, 6])
    const deep = planSplit(plate(holes({ depth: 500 }))).plans[0]
    expect(deep.depthA).toBeCloseTo(84 - END_WALL, 9)
    expect(deep.depthB).toBeCloseTo(84 - END_WALL, 9)
  })
  it('отверстие глухое: объём равен цилиндру, связность не меняется, 0.4 мм стенки до гнёзд', async () => {
    const w = await getWasm()
    const g = plate(holes({ count: 2 }))
    const plain = { ...g, split: { ...g.split, connector: conn({ type: 'none' }) } }
    const noConn = await buildBaseplateParts(plain)
    const built = await buildBaseplateParts(g)
    const [plan] = planSplit(g).plans
    expect(plan.positions).toHaveLength(2)
    const cyl = Math.PI * 0.95 ** 2 * 6
    for (let i = 0; i < 2; i++) {
      expectValidSolid(built[i].solid)
      expect(noConn[i].solid.volume() - built[i].solid.volume()).toBeCloseTo(2 * cyl, -0.3) // 2 отверстия, объём цилиндра с точностью многоугольника
      expect(built[i].solid.genus()).toBe(noConn[i].solid.genus()) // ни одно отверстие не стало сквозным
    }
    // расширенный на MIN_WALL цилиндр целиком лежит в материале: до гнёзд остаётся минимум 0.4 мм
    const whole = await buildBaseplate({ ...plain, split: { ...plain.split, enabled: false } })
    const r = 0.95 + MIN_WALL
    for (const u of plan.positions) {
      const big = w.Manifold.cylinder(12, r, r, 48).rotate([0, 90, 0]).translate([plan.face.pos - 6, plan.face.from + u, plan.zc])
      expect(whole.intersect(big).volume()).toBeCloseTo(big.volume(), 1)
    }
  })
  it('оси отверстий в соседних частях совпадают и лежат в плоскости ребра', async () => {
    const w = await getWasm()
    const g = plate(holes({ count: 1 }))
    const [plan] = planSplit(g).plans
    const extras = connectorExtras(w, [plan], g.split.connector)
    const a = extras.get('A1')!.sub[0].boundingBox(), b = extras.get('B1')!.sub[0].boundingBox()
    expect(a.max[0]).toBeCloseTo(plan.face.pos, 6) // отверстие в A кончается у торца и уходит вглубь A
    expect(b.min[0]).toBeCloseTo(plan.face.pos, 6) // отверстие в B начинается у торца
    expect(a.min[0]).toBeCloseTo(plan.face.pos - 6.05, 6)
    expect(b.max[0]).toBeCloseTo(plan.face.pos + 6.05, 6)
    expect((a.min[1] + a.max[1]) / 2).toBeCloseTo((b.min[1] + b.max[1]) / 2, 6)
    expect((a.min[2] + a.max[2]) / 2).toBeCloseTo(plan.zc, 6)
    expect(a.max[1] - a.min[1]).toBeCloseTo(1.9, 1)
  })
  it('магниты 3×2 и 2.8×0.75 помещаются, глубина — толщина магнита', () => {
    for (const [id, depth] of [['magnet3x2', 2.1], ['magnet2_8x0_75', 0.85]] as const) {
      const [plan] = planSplit(plate(withHolePreset(holes(), id))).plans
      expect(plan.issues).toEqual([])
      expect(plan.positions.length).toBe(2)
      expect([plan.depthA, plan.depthB]).toEqual([depth, depth])
    }
  })
  it('своё отверстие 6 мм не помещается в ребро: соединитель не создаётся, нарушение в отчёте', () => {
    const [plan] = planSplit(plate(holes({ preset: 'custom', diameter: 6 }))).plans
    expect(plan.positions).toEqual([])
    expect(plan.issues[0]).toMatchObject({ key: 'connector.tooBigForRidge', cut: 'x:2', parts: 'A1–B1' })
  })
  it('торец без ребра: «noRib», отверстий нет', () => {
    const g = plate(holes(), { y: units(1) })
    const [plan] = planSplit(g).plans
    expect(plan.positions).toEqual([])
    expect(plan.issues[0].key).toBe('connector.noRib')
  })
  it('крепёж не мешает стандартным позициям; огромный магнит перекрывает все рёбра: collision', () => {
    const full = { ...defaultFasteners, magnets: { mode: 'full' as const, slots: [] } }
    expect(planSplit(plate(holes(), { fasteners: full })).plans[0].positions).toEqual([42, 126])
    const huge = planSplit(plate(holes(), { fasteners: { ...full, magnetD: 16, magnetPreset: 'custom' } })).plans[0]
    expect(huge.positions).toEqual([])
    expect(huge.issues.map((i) => i.key)).toContain('connector.collision')
  })
  it('соединитель выбирается заново, если одно ребро занято крепежом: берётся свободное', () => {
    // ухо винта в углу ячейки рядом с ребром u = 42 (положение в ячейке ±13)
    const f: FastenerConfig = { ...defaultFasteners, screws: { mode: 'manual' as const, slots: [{ i: 1, j: 1, sx: 1, sy: -1 }] }, screwD: 14, screwPreset: 'custom' }
    const [plan] = planSplit(plate(holes({ count: 1 }), { fasteners: f })).plans
    expect(plan.positions.length).toBe(1)
  })
  it('тип none: торцы плоские; переопределение по разрезу', () => {
    expect(planSplit(plate(conn({ type: 'none' }))).plans[0].positions).toEqual([])
    const g = plate(holes({ overrides: { 'x:2': 'none' } }))
    expect(planSplit(g).plans[0].type).toBe('none')
  })
  it('части с отверстиями валидны и стыкуются без изменения габаритов', async () => {
    const g = plate(holes({ count: 3 }))
    const none = await buildBaseplateParts({ ...g, split: { ...g.split, connector: conn({ type: 'none' }) } })
    const built = await buildBaseplateParts(g)
    built.forEach((b, i) => {
      expectValidSolid(b.solid)
      expect(b.solid.volume()).toBeLessThan(none[i].solid.volume())
      expect(b.solid.boundingBox().max[0]).toBeCloseTo(none[i].solid.boundingBox().max[0], 6)
    })
  })
  it('planFace напрямую: ширина торца, рёбра и положения согласованы', () => {
    const fp = baseplateLayout(plate(conn())).fp
    const [face] = cutFaces(fp, splitParts(fp, [2], []))
    const plan = planFace(face, holes({ count: 2 }), { pitch: 42, pocketBottom: 0, holes: [] })
    expect(plan.positions).toEqual([42, 126])
    expect(plan.zc).toBeCloseTo(connectorZ(0, 1.9), 9)
  })
})

describe('ласточкин хвост на столе', () => {
  const dove = (o: Partial<ConnectorConfig> = {}) => conn({ type: 'dovetail', count: 1, ...o })

  it('ключ лежит на столе: от z = 0, высота по настройке (2 мм по умолчанию)', async () => {
    const w = await getWasm()
    const c = dove()
    const plan = planSplit(plate(c)).plans[0]
    expect(plan.issues).toEqual([])
    const key = connectorExtras(w, [plan], c).get('A1')!.add[0].boundingBox()
    expect(key.min[2]).toBeCloseTo(0, 9)
    expect(key.max[2]).toBeCloseTo(2, 9)
    const taller = connectorExtras(w, [planSplit(plate(dove({ dovetailHeight: 2.4 }))).plans[0]], dove({ dovetailHeight: 2.4 })).get('A1')!.add[0].boundingBox()
    expect(taller.max[2]).toBeCloseTo(2.4, 9)
  })
  it('гнездо открыто снизу и на зазор выше ключа; шире ключа на зазор по глубине', async () => {
    const w = await getWasm()
    const c = dove({ clearance: 0.2 })
    const plan = planSplit(plate(c)).plans[0]
    const extras = connectorExtras(w, [plan], c)
    const k = extras.get('A1')!.add[0].boundingBox(), s = extras.get('B1')!.sub[0].boundingBox()
    expect(s.min[2]).toBeLessThan(0) // выходит за низ части: гнездо открыто снизу
    expect(s.max[2] - k.max[2]).toBeCloseTo(0.2, 6)
    expect(s.max[0] - k.max[0]).toBeCloseTo(0.2, 6)
    const dw = s.max[1] - s.min[1] - (k.max[1] - k.min[1])
    expect(dw).toBeGreaterThanOrEqual(0.4 - 1e-6)
    expect(dw).toBeLessThanOrEqual(0.8)
    expect(extras.get('A1')!.sub).toEqual([])
    expect(extras.get('B1')!.add).toEqual([])
  })
  it('части валидны: A получает ключ на столе, B теряет материал снизу; части собираются опусканием', async () => {
    const c = dove({ count: 2 })
    const g = plate(c)
    const none = await buildBaseplateParts({ ...g, split: { ...g.split, connector: conn({ type: 'none' }) } })
    const built = await buildBaseplateParts(g)
    built.forEach((b) => expectValidSolid(b.solid))
    expect(built[0].solid.volume()).toBeGreaterThan(none[0].solid.volume())
    expect(built[1].solid.volume()).toBeLessThan(none[1].solid.volume())
    expect(built[0].solid.boundingBox().min[2]).toBeCloseTo(0, 9) // ключ не опускает деталь ниже стола
    expect(built[0].solid.boundingBox().max[0] - none[0].solid.boundingBox().max[0]).toBeCloseTo(c.dovetailDepth, 3)
    // ключ А влезает в гнездо B: ключ ∩ материал B пуст
    const w = await getWasm()
    const extras = connectorExtras(w, [planSplit(g).plans[0]], c)
    const keyIn = extras.get('A1')!.add[0].intersect(built[1].solid)
    expect(keyIn.volume()).toBeCloseTo(0, 3)
  })
  it('с ушами и полом: ключ всё равно на столе', async () => {
    const f = { ...defaultFasteners, magnets: { mode: 'full' as const, slots: [] } }
    const c = dove()
    const g = plate(c, { fasteners: f })
    const [plan] = planSplit(g).plans
    expect(plan.issues).toEqual([])
    const built = await buildBaseplateParts(g)
    built.forEach((b) => expectValidSolid(b.solid))
    expect(built[0].solid.boundingBox().min[2]).toBeCloseTo(0, 9)
  })
  it('замок на разрезе по Y лежит вдоль оси y', async () => {
    const c = dove()
    const g = { ...plate(c), split: { ...defaultSplit, enabled: true, maxX: 300, maxY: 100, connector: c } }
    const [plan] = planSplit(g).plans
    expect(plan.face.axis).toBe('y')
    const w = await getWasm()
    const key = connectorExtras(w, [plan], c).get(plan.face.a.label)!.add[0].boundingBox()
    expect(key.max[1]).toBeCloseTo(plan.face.pos + c.dovetailDepth, 3)
    expect(key.min[2]).toBeCloseTo(0, 9)
  })
  it('слишком глубокий хвост: отчёт, замок не создаётся', () => {
    const [plan] = planSplit(plate(dove({ dovetailDepth: 2 }))).plans
    expect(plan.positions).toEqual([])
    expect(plan.issues[0].key).toBe('connector.dovetailTooDeep')
  })
  it('мало места на торце: «noRoom»', () => {
    const [plan] = planSplit(plate(dove({ inset: 100, count: 2 }), { y: units(1) })).plans
    expect(plan.issues[0].key).toBe('connector.noRoom')
  })
})
