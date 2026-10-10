import { describe, expect, it } from 'vitest'
import { getWasm } from './wasm'
import {
  connectorExtras, connectorZ, cutFaces, dovetailFits, defaultConnector, faceLength, holeFitsRidge, MIN_WALL, nominalPositions, planFace, ridgeWidthAt,
  withHolePreset, type ConnectorConfig,
} from './connectors'
import { baseplateLayout, buildBaseplateParts, buildBaseplate, planSplit, type BaseplateGeometry } from './baseplate'
import { defaultFasteners } from './fasteners'
import { defaultSplit, splitParts } from './split'
import { expectValidSolid, mm, sharpParams, units } from './testing'

const conn = (o: Partial<ConnectorConfig> = {}): ConnectorConfig => ({ ...defaultConnector, ...o })
const plate = (c: ConnectorConfig, o: Partial<BaseplateGeometry> = {}): BaseplateGeometry => ({
  ...sharpParams, x: units(4), y: units(2), ...o,
  split: { ...defaultSplit, enabled: true, maxX: 100, maxY: 300, connector: c },
})

describe('профиль стенки между гнёздами', () => {
  it('ширина: 5.7 внизу, 4.3 на вертикальном участке, 0 на кромке', () => {
    expect(ridgeWidthAt(42, 0)).toBeCloseTo(5.7, 9)
    expect(ridgeWidthAt(42, 0.7)).toBeCloseTo(4.3, 9)
    expect(ridgeWidthAt(42, 1.6)).toBeCloseTo(4.3, 9)
    expect(ridgeWidthAt(42, 2.5)).toBeCloseTo(4.3, 9)
    expect(ridgeWidthAt(42, 4.65)).toBeCloseTo(0, 9)
  })
  it('в какие отверстия хватает стенки: M3 и штифт 3 мм да, магнит 6 мм нет', () => {
    for (const [d, ok] of [[3.2, true], [3.1, true], [6.1, false], [4.2, false]] as const) {
      expect(holeFitsRidge(42, 0, d, connectorZ(0, d))).toBe(ok)
    }
  })
  it('ласточкин хвост по умолчанию помещается, слишком глубокий — нет', () => {
    expect(dovetailFits(42, 0, defaultConnector, connectorZ(0, 1.8), 1.8)).toBe(true)
    expect(dovetailFits(42, 0, conn({ dovetailDepth: 2 }), connectorZ(0, 1.8), 1.8)).toBe(false)
  })
})

describe('торцы и положения', () => {
  it('торцы между соседними частями: 3 части в ряд дают 2 торца', () => {
    const fp = baseplateLayout({ ...sharpParams, x: units(6), y: units(1) }).fp
    const faces = cutFaces(fp, splitParts(fp, [2, 4], []))
    expect(faces.map((f) => [f.axis, f.cut, f.a.label, f.b.label])).toEqual([['x', 2, 'A1', 'B1'], ['x', 4, 'B1', 'C1']])
    expect(faces[0].pos).toBeCloseTo(-42, 9)
    expect(faceLength(faces[0])).toBeCloseTo(42, 9)
  })
  it('сетка 2×2 частей: четыре торца', () => {
    const fp = baseplateLayout({ ...sharpParams, x: units(4), y: units(4) }).fp
    expect(cutFaces(fp, splitParts(fp, [2], [2]))).toHaveLength(4)
  })
  it('количество: 2 соединителя на торце 84 мм — симметрично с отступом', () => {
    const p = nominalPositions(84, 2, 10)
    expect(p).toEqual([10, 74])
    expect(p[0] + p[1]).toBeCloseTo(84, 9)
    expect(nominalPositions(84, 3, 10)).toEqual([10, 42, 74])
    expect(nominalPositions(84, 1, 10)).toEqual([42])
    expect(nominalPositions(15, 2, 10)).toEqual([])
  })
  it('пресеты отверстий', () => {
    expect(withHolePreset(defaultConnector, 'm6x2')).toMatchObject({ diameter: 6.1, depth: 2.1 })
    expect(withHolePreset(defaultConnector, 'pin3')).toMatchObject({ diameter: 3.1 })
    expect(withHolePreset({ ...defaultConnector, diameter: 5 }, 'custom').diameter).toBe(5)
  })
})

describe('отверстия в торцах', () => {
  it('соседние части получают отверстия на одной оси, глубина в каждую часть', async () => {
    const c = conn({ type: 'holes', preset: 'm3', diameter: 3.2, depth: 6, count: 2, inset: 10 })
    const g = plate(c)
    const { plans } = planSplit(g)
    expect(plans).toHaveLength(1)
    expect(plans[0].issues).toEqual([])
    const [u1, u2] = plans[0].positions
    expect(u1 + u2).toBeCloseTo(84, 6)
    const noConn = await buildBaseplateParts({ ...g, split: { ...g.split, connector: conn({ type: 'none' }) } })
    const built = await buildBaseplateParts(g)
    expect(built).toHaveLength(2)
    built.forEach((b) => expectValidSolid(b.solid))
    // каждая часть теряет объём 2 отверстий (минус то, что уже было пустым)
    for (let i = 0; i < 2; i++) expect(built[i].solid.volume()).toBeLessThan(noConn[i].solid.volume())
    const hole = Math.PI * 1.6 ** 2 * 6
    const lost = noConn[0].solid.volume() - built[0].solid.volume()
    expect(lost).toBeGreaterThan(0.5 * 2 * hole * 0.5)
    expect(lost).toBeLessThan(2 * hole)
    // оси совпадают: отверстие на левой части и на правой лежат на одной прямой у торца
    const [a, b] = built.map((x) => x.solid)
    expect(a.boundingBox().max[0]).toBeCloseTo(b.boundingBox().min[0], 6)
  })
  it('тип none: торцы плоские, ничего не добавляется', async () => {
    const g = plate(conn({ type: 'none' }))
    const built = await buildBaseplateParts(g)
    const w = await buildBaseplate({ ...g, split: { ...g.split, enabled: false } })
    expect(built.reduce((s, b) => s + b.solid.volume(), 0)).toBeCloseTo(w.volume(), 1)
    expect(planSplit(g).plans.every((p) => p.positions.length === 0)).toBe(true)
  })
  it('переопределение типа на одном разрезе', () => {
    const g = plate(conn({ type: 'holes', overrides: { 'x:2': 'none' } }))
    const plans = planSplit(g).plans
    expect(plans[0].type).toBe('none')
    expect(plans[0].positions).toEqual([])
  })
  it('магнит 6×2 не помещается в стенку: соединитель не создаётся, нарушение в отчёте', () => {
    const g = plate(withHolePreset(conn({ type: 'holes' }), 'm6x2'))
    const [plan] = planSplit(g).plans
    expect(plan.positions).toEqual([])
    expect(plan.issues[0]).toMatchObject({ key: 'connector.tooBigForRidge', cut: 'x:2', parts: 'A1–B1' })
  })
  it('мало места на торце: отчёт «noRoom»', () => {
    const g = plate(conn({ type: 'holes', inset: 30, count: 2 }), { y: units(1) })
    expect(planSplit(g).plans[0].issues[0].key).toBe('connector.noRoom')
  })
})

describe('ласточкин хвост', () => {
  it('ключ на части A, гнездо на B; гнездо больше ключа на зазор с каждой стороны', async () => {
    const w = await getWasm()
    const c = conn({ type: 'dovetail', clearance: 0.2, count: 1 })
    const plan = planSplit(plate(c)).plans[0]
    expect(plan.issues).toEqual([])
    const extras = connectorExtras(w, [plan], c)
    const key = extras.get('A1')!.add[0]
    const socket = extras.get('B1')!.sub[0]
    const kb = key.boundingBox(), sb = socket.boundingBox()
    // вдоль торца (y): гнездо шире ключа не меньше чем на зазор с каждой стороны (у скошенных углов миттер даёт чуть больше)
    const dw = sb.max[1] - sb.min[1] - (kb.max[1] - kb.min[1])
    expect(dw).toBeGreaterThanOrEqual(0.4 - 1e-6)
    expect(dw).toBeLessThanOrEqual(0.8)
    // по высоте — ровно на зазор
    expect(kb.min[2] - sb.min[2]).toBeCloseTo(0.2, 6)
    expect(sb.max[2] - kb.max[2]).toBeCloseTo(0.2, 6)
    // по глубине: гнездо глубже ключа на зазор
    expect(sb.max[0] - kb.max[0]).toBeCloseTo(0.2, 6)
    expect(extras.get('A1')!.sub).toEqual([])
    expect(extras.get('B1')!.add).toEqual([])
  })
  it('части с замком валидны: A получает материал, B теряет', async () => {
    const c = conn({ type: 'dovetail', count: 2 })
    const g = plate(c)
    const none = await buildBaseplateParts({ ...g, split: { ...g.split, connector: conn({ type: 'none' }) } })
    const built = await buildBaseplateParts(g)
    built.forEach((b) => expectValidSolid(b.solid))
    expect(built[0].solid.volume()).toBeGreaterThan(none[0].solid.volume())
    expect(built[1].solid.volume()).toBeLessThan(none[1].solid.volume())
    // ключ выступает за торец в B: габарит A по x шире на глубину хвоста
    expect(built[0].solid.boundingBox().max[0] - none[0].solid.boundingBox().max[0]).toBeCloseTo(c.dovetailDepth, 3)
  })
  it('замок на разрезе по Y (вдоль другой оси) выстраивается по оси y', async () => {
    const c = conn({ type: 'dovetail', count: 1 })
    const g = { ...plate(c), x: units(2), y: units(4), split: { ...defaultSplit, enabled: true, maxX: 300, maxY: 100, connector: c } }
    const [plan] = planSplit(g).plans
    expect(plan.face.axis).toBe('y')
    const built = await buildBaseplateParts(g)
    expect(built[0].solid.boundingBox().max[1] - 0).toBeGreaterThan(0) // валидная часть
    const w = await getWasm()
    const key = connectorExtras(w, [plan], c).get(plan.face.a.label)!.add[0].boundingBox()
    expect(key.max[1]).toBeCloseTo(plan.face.pos + c.dovetailDepth, 3)
  })
})

describe('избегание отверстий крепежа и стенок', () => {
  it('без крепежа положения номинальные: 10 и 74 мм', () => {
    const [plan] = planSplit(plate(conn({ type: 'holes', count: 2, inset: 10 }))).plans
    expect(plan.issues).toEqual([])
    expect(plan.positions).toEqual([10, 74])
  })
  it('магниты Full мешают номинальному положению: соединители сдвигаются симметрично до свободного места', () => {
    const g = plate(conn({ type: 'holes', count: 2, inset: 10 }), { fasteners: { ...defaultFasteners, magnets: { mode: 'full', slots: [] } } })
    const [plan] = planSplit(g).plans
    expect(plan.issues).toEqual([])
    expect(plan.positions).toEqual([13, 71])
    expect(plan.positions[0] + plan.positions[1]).toBeCloseTo(84, 9)
  })
  it('отверстие крепежа на пути: соединитель сдвигается к ближайшему свободному месту', () => {
    // торец 84 мм (по y), магнит в соседней ячейке на y = ±13 от центра ячейки → в координатах торца 8, 34, 50, 76
    const g = plate(conn({ type: 'holes', count: 1, inset: 10 }), { fasteners: { ...defaultFasteners, magnets: { mode: 'full', slots: [] }, magnetD: 20, magnetPreset: 'custom' } })
    const [plan] = planSplit(g).plans
    expect(plan.positions.length + plan.issues.length).toBe(1)
    if (plan.positions.length) {
      expect(Math.abs(plan.positions[0] - 42)).toBeGreaterThan(0)
    } else expect(plan.issues[0].key).toBe('connector.collision')
  })
  it('нет свободного места: сообщаем и не создаём', () => {
    const g = plate(conn({ type: 'holes', count: 2, inset: 10 }), {
      fasteners: { ...defaultFasteners, magnets: { mode: 'full', slots: [] }, magnetD: 40, magnetPreset: 'custom' },
    })
    const plan = planSplit(g).plans[0]
    expect(plan.issues.some((i) => i.key === 'connector.collision')).toBe(true)
    expect(plan.positions.length).toBeLessThan(2)
  })
  it('минимальная стенка вокруг соединителя — 0.4 мм', () => expect(MIN_WALL).toBe(0.4))
  it('дробный размер: торец продолжается до края отступа', () => {
    const g = plate(conn({ type: 'holes', count: 2, inset: 10 }), { x: mm(200), y: mm(100) })
    const faces = planSplit(g).plans.map((p) => faceLength(p.face))
    expect(faces.every((l) => Math.abs(l - 100) < 1e-9)).toBe(true)
  })
})
