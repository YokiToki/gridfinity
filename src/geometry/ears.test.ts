import { describe, expect, it } from 'vitest'
import { getWasm } from './wasm'
import { buildBaseplate, defaultParams } from './baseplate'
import { footprintFromCells } from './footprint'
import { cellOfPoint, cellWindows, checkFasteners, defaultFasteners, earRadius, fastenerEar, type FastenerConfig, type FastenerMode } from './fasteners'
import { socketPocket, socketWindow, socketWindowWidth } from './profiles'
import { SOCKET_HEIGHT } from './spec'
import { expectValidSolid } from './testing'

const withModes = (m: FastenerMode, s: FastenerMode, extra: Partial<FastenerConfig> = {}): FastenerConfig =>
  ({ ...defaultFasteners, magnets: { mode: m, slots: [] }, screws: { mode: s, slots: [] }, ...extra })
const area = (m: { slice: (z: number) => { area: () => number } }, z: number) => m.slice(z).area()

describe('socketWindow', () => {
  it('ширина окна совпадает с нижним слоем гнезда и тело валидно', async () => {
    const w = await getWasm()
    const win = socketWindow(w, 42, -1, 4.002)
    expectValidSolid(win, { size: [socketWindowWidth(42), socketWindowWidth(42), 5.002] })
    expect(socketWindowWidth(42)).toBeCloseTo(36.3, 9)
    // нижний слой гнезда имеет ту же ширину
    const b = socketPocket(w, 42).slice(0.0005).bounds()
    expect(b.max[0] - b.min[0]).toBeCloseTo(socketWindowWidth(42), 2)
  })
  it('зависит от шага сетки', async () => {
    const w = await getWasm()
    expect(socketWindowWidth(40)).toBeCloseTo(34.3, 9)
    expectValidSolid(socketWindow(w, 40, 0, 1), { size: [34.3, 34.3, 1] })
  })
})

describe('fastenerEar', () => {
  it('ухо накрывает отверстие с запасом earWall и доходит до угла окна', async () => {
    const w = await getWasm()
    const r = 3.25 + 1.2
    const ear = fastenerEar(w, { x: -13, y: -13 }, { x: 0, y: 0 }, -1, -1, r, 42, 0, 4)
    expectValidSolid(ear)
    const bb = ear.boundingBox()
    expect(bb.max[0]).toBeCloseTo(-13 + r, 3) // к центру ячейки уха на earWall дальше края отверстия
    expect(bb.min[0]).toBeLessThan(-socketWindowWidth(42) / 2) // уходит в стенку
    const hole = w.Manifold.cylinder(4, 3.25, 3.25, 32).translate([-13, -13, 0])
    expect(ear.intersect(hole).volume()).toBeCloseTo(hole.volume(), 3) // отверстие целиком внутри уха
  })
  it('радиус уха = радиус отверстия + earWall', () => {
    expect(earRadius({ ...defaultFasteners, magnetD: 6, magnetDepth: 2, tolerance: 0.2, earWall: 1.5 }, 'magnets')).toBeCloseTo(3.1 + 1.5, 9)
    expect(earRadius(defaultFasteners, 'screws')).toBeCloseTo(1.5 + 1.2, 9)
  })
  it('угол ячейки определяется по точке', () => {
    const fp = footprintFromCells(2, 2, 42)
    const c = cellOfPoint(fp, { x: 34, y: -34 })
    expect([c.i, c.j, c.sx, c.sy]).toEqual([1, 0, 1, -1])
    expect(c.center).toEqual({ x: 21, y: -21 })
  })
})

describe('baseplate с ушами', () => {
  it('без отверстий окон нет и высота 4.65', async () => {
    const w = await getWasm()
    expect(cellWindows(w, defaultFasteners, footprintFromCells(2, 2, 42))).toEqual([])
    expectValidSolid(await buildBaseplate(defaultParams), { size: [84, 84, 4.65] })
  })
  it('Full 2×2: высота 8.65, сплошного пола нет, остаются уши', async () => {
    const w = await getWasm()
    const fp = footprintFromCells(2, 2, 42)
    const p = { ...defaultParams, fasteners: withModes('full', 'none') }
    const m = await buildBaseplate(p)
    expectValidSolid(m, { size: [84, 84, 8.65] })
    // сечение ниже магнитных гнёзд (z = 1): плита минус окна плюс уши внутри окон
    const win = socketWindow(w, 42, -1, 4.002)
    const winArea = area(win, 1)
    const ear = fastenerEar(w, { x: -13, y: -13 }, { x: 0, y: 0 }, -1, -1, earRadius(p.fasteners, 'magnets'), 42, -2, 5)
    const earInside = area(win.intersect(ear), 1)
    const frame = 84 * 84 - 4 * winArea
    expect(area(m, 1)).toBeCloseTo(frame + 16 * earInside, 1) // 16 ушей, а не сплошной пол
    expect(area(m, 1)).toBeLessThan(84 * 84 * 0.6)
    // выше пола (z = 6) сечение — просто рамка стенок гнёзд
    expect(area(m, 6)).toBeLessThan(area(m, 1))
  })
  it('Corner 3×3: ячейки без отверстий открыты насквозь', async () => {
    const w = await getWasm()
    const p = { ...defaultParams, x: 3, y: 3, fasteners: withModes('corner', 'none') }
    const m = await buildBaseplate(p)
    expectValidSolid(m, { size: [126, 126, 8.65] })
    const win = socketWindow(w, 42, -1, 4.002)
    const ear = fastenerEar(w, { x: -13, y: -13 }, { x: 0, y: 0 }, -1, -1, earRadius(p.fasteners, 'magnets'), 42, -2, 5)
    const earInside = area(win.intersect(ear), 1)
    // девять окон, ушей только четыре (внешние углы)
    expect(area(m, 1)).toBeCloseTo(126 * 126 - 9 * area(win, 1) + 4 * earInside, 1)
  })
  it('винты тоже получают уши и проходят насквозь', async () => {
    const m = await buildBaseplate({ ...defaultParams, fasteners: withModes('none', 'full') })
    expectValidSolid(m, { size: [84, 84, 8.65] })
    expect(m.genus()).toBeGreaterThanOrEqual(0)
  })
  it('толщина уха меняет объём', async () => {
    const mk = async (earWall: number) => (await buildBaseplate({ ...defaultParams, fasteners: withModes('full', 'none', { earWall }) })).volume()
    expect(await mk(2.5)).toBeGreaterThan(await mk(0.8))
  })
  it('верх ушей на уровне дна гнезда (4 мм), общая высота не меняется', async () => {
    const m = await buildBaseplate({ ...defaultParams, fasteners: withModes('full', 'full') })
    expect(m.boundingBox().max[2]).toBeCloseTo(4 + SOCKET_HEIGHT, 3)
  })
})

describe('checkFasteners: ухо не помещается', () => {
  const fp = footprintFromCells(2, 2, 42)
  it('значения по умолчанию без предупреждения', () => {
    expect(checkFasteners(withModes('full', 'full'), fp).map((x) => x.key)).not.toContain('fastener.earTooBig')
  })
  it('очень большой магнит выходит за окно ячейки', () => {
    const c = withModes('full', 'none', { magnetD: 11, magnetPreset: 'custom' })
    expect(checkFasteners(c, fp).some((x) => x.key === 'fastener.earTooBig' && x.kind === 'magnets')).toBe(true)
  })
  it('толстая стенка уха: уши соседних отверстий слипаются', () => {
    const c = withModes('none', 'full', { earWall: 12 })
    expect(checkFasteners(c, fp).some((x) => x.key === 'fastener.earTooBig' && x.kind === 'screws')).toBe(true)
  })
})
