import { describe, expect, it } from 'vitest'
import { getWasm } from './wasm'
import { buildBaseplate, defaultParams } from './baseplate'
import { footprintFromCells, footprintFromSize } from './footprint'
import {
  allPositions, checkFasteners, cornerPositions, defaultFasteners, fastenerCuts, magnetSize, MAGNET_PRESETS, resolvePositions,
  standardPositions, switchMode, withMagnetPreset, type FastenerConfig, type FastenerMode,
} from './fasteners'
import { expectValidSolid } from './testing'

const kind = (mode: FastenerMode) => ({ mode, manual: [] })
const cfg = (m: FastenerMode, s: FastenerMode, extra: Partial<FastenerConfig> = {}): FastenerConfig => ({ ...defaultFasteners, magnets: kind(m), screws: kind(s), ...extra })
const has = (pts: { x: number; y: number }[], x: number, y: number) => pts.some((p) => Math.abs(p.x - x) < 1e-9 && Math.abs(p.y - y) < 1e-9)

describe('пресеты и допуск', () => {
  it('значения пресетов', () => {
    expect(MAGNET_PRESETS.map((p) => [p.id, p.d, p.depth])).toEqual([['m6x2', 6, 2], ['m6.5x2.4', 6.5, 2.4], ['m8x2', 8, 2]])
  })
  it('пресет 6×2: диаметр 6 + допуск, глубина 2 + допуск', () => {
    const c = { ...withMagnetPreset(defaultFasteners, 'm6x2'), tolerance: 0.15 }
    expect(c.magnetD).toBe(6)
    expect(c.magnetDepth).toBe(2)
    expect(magnetSize(c)).toEqual({ d: 6.15, depth: 2.15 })
  })
  it('custom сохраняет текущие размеры', () => {
    const c = withMagnetPreset({ ...defaultFasteners, magnetD: 7.1 }, 'custom')
    expect(c.magnetPreset).toBe('custom')
    expect(c.magnetD).toBe(7.1)
  })
})

describe('позиции', () => {
  it('Full 1×1: четыре точки на 13 мм от центра', () => {
    const pts = standardPositions(footprintFromCells(1, 1, 42))
    expect(pts).toHaveLength(4)
    for (const [x, y] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) expect(has(pts, x, y)).toBe(true)
  })
  it('Full 2×2: 16 точек, у каждой ячейки по четыре', () => {
    const pts = standardPositions(footprintFromCells(2, 2, 42))
    expect(pts).toHaveLength(16)
    expect(has(pts, -21 - 13, -21 - 13)).toBe(true)
    expect(has(pts, 21 + 13, 21 + 13)).toBe(true)
    expect(has(pts, -8, -8)).toBe(true) // 21 - 13
  })
  it('Corner 2×2: только внешние углы блока', () => {
    const pts = cornerPositions(footprintFromCells(2, 2, 42))
    expect(pts).toHaveLength(4)
    for (const [x, y] of [[-34, -34], [34, -34], [-34, 34], [34, 34]]) expect(has(pts, x, y)).toBe(true)
  })
  it('Corner 1×1 совпадает с Full', () => {
    const fp = footprintFromCells(1, 1, 42)
    expect(cornerPositions(fp)).toHaveLength(4)
    expect(cornerPositions(fp).every((p) => has(standardPositions(fp), p.x, p.y))).toBe(true)
  })
  it('Corner 3×2: углы по первой и последней ячейке', () => {
    const pts = cornerPositions(footprintFromCells(3, 2, 42))
    for (const [x, y] of [[-55, -34], [55, -34], [-55, 34], [55, 34]]) expect(has(pts, x, y)).toBe(true)
  })
  it('Full 3×2: 24 точки', () => {
    expect(standardPositions(footprintFromCells(3, 2, 42))).toHaveLength(24)
  })
  it('дробный габарит 100×100, центр: 2×2 ячейки, отверстий нет в остатке', () => {
    const fp = footprintFromSize(100, 100, 42, 'center', 'center')
    expect(fp.nx).toBe(2)
    const pts = standardPositions(fp)
    expect(pts).toHaveLength(16)
    // край блока ячеек лежит на 8 мм от габарита → все точки внутри блока
    expect(Math.max(...pts.map((p) => Math.abs(p.x)))).toBeCloseTo(34, 9)
  })
  it('дробный габарит с выравниванием start: блок ячеек сдвинут к началу', () => {
    const fp = footprintFromSize(100, 84, 42, 'start', 'center')
    expect(Math.min(...standardPositions(fp).map((p) => p.x))).toBeCloseTo(-42, 9) // первая ячейка центрирована на -29, крайнее отверстие на -42
  })
  it('none даёт пустой список, manual возвращает копию точек', () => {
    const fp = footprintFromCells(2, 2, 42)
    expect(resolvePositions(kind('none'), fp)).toEqual([])
    const manual = [{ x: 1, y: 2 }]
    const out = resolvePositions({ mode: 'manual', manual }, fp)
    expect(out).toEqual(manual)
    expect(out[0]).not.toBe(manual[0])
  })
  it('переход Full → Manual сохраняет точки; из none — пустой список', () => {
    const fp = footprintFromCells(2, 2, 42)
    const m = switchMode({ mode: 'full', manual: [] }, 'manual', fp)
    expect(m.mode).toBe('manual')
    expect(m.manual).toHaveLength(16)
    expect(switchMode(kind('none'), 'manual', fp).manual).toEqual([])
    expect(switchMode(m, 'corner', fp).manual).toHaveLength(16) // ручные точки не теряются при смене режима
  })
})

describe('fastenerCuts', () => {
  it('число объёмов: магниты + винты (+ головки)', async () => {
    const w = await getWasm()
    const fp = footprintFromCells(2, 2, 42)
    expect(fastenerCuts(w, cfg('none', 'none'), fp).cuts).toHaveLength(0)
    expect(fastenerCuts(w, cfg('full', 'none'), fp).cuts).toHaveLength(16)
    expect(fastenerCuts(w, cfg('corner', 'full'), fp).cuts).toHaveLength(4 + 16)
    expect(fastenerCuts(w, cfg('none', 'corner', { screwHead: 'countersink' }), fp).cuts).toHaveLength(12) // винт + конус + запас под конусом
    expect(fastenerCuts(w, cfg('none', 'corner', { screwHead: 'counterbore' }), fp).cuts).toHaveLength(8)
  })
  it('позиции совпадают с allPositions (редактор и геометрия читают один список)', async () => {
    const w = await getWasm()
    const fp = footprintFromCells(3, 2, 42)
    const c = cfg('corner', 'full')
    expect(fastenerCuts(w, c, fp).positions).toEqual(allPositions(c, fp))
  })
})

describe('baseplate с крепежом', () => {
  const modes: FastenerMode[] = ['none', 'corner', 'full', 'manual']
  for (const mode of modes) {
    it(`магниты ${mode}: валидное тело`, async () => {
      const manual = mode === 'manual' ? [{ x: -8, y: -8 }, { x: 8, y: 8 }] : []
      const p = { ...defaultParams, fasteners: { ...defaultFasteners, magnets: { mode, manual } } }
      const m = await buildBaseplate(p)
      const empty = await buildBaseplate(defaultParams)
      expectValidSolid(m)
      if (mode === 'none') expect(m.volume()).toBeCloseTo(empty.volume(), 6)
      else {
        // пол 4 мм добавлен, а отверстия вычтены: тело тяжелее пустой плиты, высота 8.65
        expect(m.boundingBox().max[2]).toBeCloseTo(8.65, 3)
        expect(m.volume()).toBeGreaterThan(empty.volume())
      }
    })
  }
  it('число отверстий определяет вычтенный объём магнитов', async () => {
    const mk = async (mode: FastenerMode) => (await buildBaseplate({ ...defaultParams, fasteners: { ...defaultFasteners, magnets: { mode, manual: [] }, screws: { mode: 'full', manual: [] } } })).volume()
    const [corner, full] = [await mk('corner'), await mk('full')]
    const hole = Math.PI * 3.25 ** 2 * 2.4
    // у полного режима на 12 магнитных гнёзд больше; часть объёма гнезда лежит выше пола, где материала нет
    expect(corner).toBeGreaterThan(full)
    expect(corner - full).toBeGreaterThan(8 * hole)
    expect(corner - full).toBeLessThan(12 * hole + 1)
  })
  it('ручное отверстие: пустой список = нет пола, одно отверстие = есть', async () => {
    const mk = (manual: { x: number; y: number }[]) => buildBaseplate({ ...defaultParams, fasteners: { ...defaultFasteners, screws: { mode: 'manual', manual } } })
    expect((await mk([])).boundingBox().max[2]).toBeCloseTo(4.65, 3)
    const one = await mk([{ x: -8, y: -8 }])
    expectValidSolid(one)
    expect(one.boundingBox().max[2]).toBeCloseTo(8.65, 3)
  })
  it('потай и цековка дают валидное тело', async () => {
    for (const screwHead of ['countersink', 'counterbore'] as const) {
      expectValidSolid(await buildBaseplate({ ...defaultParams, fasteners: { ...defaultFasteners, screws: { mode: 'corner', manual: [] }, screwHead } }))
    }
  })
})

describe('checkFasteners', () => {
  it('стандартные позиции без предупреждений', () => {
    expect(checkFasteners(cfg('full', 'full'), footprintFromCells(2, 2, 42))).toEqual([])
  })
  it('ручное отверстие у самого края и два пересекающихся', () => {
    const c = cfg('none', 'none', { magnets: { mode: 'manual', manual: [{ x: 40, y: 0 }, { x: 0, y: 0 }, { x: 3, y: 0 }] } })
    const keys = checkFasteners(c, footprintFromCells(2, 2, 42)).map((w) => w.key)
    expect(keys).toContain('fastener.nearEdge')
    expect(keys).toContain('fastener.overlap')
  })
})
