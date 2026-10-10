import { describe, expect, it } from 'vitest'
import { getWasm } from './wasm'
import { buildBaseplate } from './baseplate'
import { footprintFromCells, footprintFromSize } from './footprint'
import {
  allPositions, allSlots, checkFasteners, cornerPositions, defaultFasteners, fastenerCuts, magnetSize, MAGNET_PRESETS, resolvePositions,
  slotPosition, slotsFromPoints, standardPositions, switchMode, toggleSlot, validSlots, withMagnetPreset, type FastenerConfig, type FastenerMode, type Slot,
} from './fasteners'
import { expectValidSolid, mm, sharpParams as defaultParams, units } from './testing'

const kind = (mode: FastenerMode) => ({ mode, slots: [] })
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
  it('none даёт пустой список', () => {
    expect(resolvePositions(kind('none'), footprintFromCells(2, 2, 42))).toEqual([])
  })
})

describe('Manual: выбор стандартных позиций', () => {
  const fp = footprintFromCells(2, 2, 42)
  const slot = (i: number, j: number, sx: 1 | -1, sy: 1 | -1): Slot => ({ i, j, sx, sy })

  it('слот → позиция: центр ячейки плюс угол на 13 мм', () => {
    expect(slotPosition(fp, slot(0, 0, -1, -1))).toEqual({ x: -34, y: -34 })
    expect(slotPosition(fp, slot(1, 0, 1, 1))).toEqual({ x: 34, y: -8 })
  })
  it('все слоты 2×2 совпадают со стандартными позициями', () => {
    const slots = allSlots(fp)
    expect(slots).toHaveLength(16)
    const pts = slots.map((s) => slotPosition(fp, s))
    expect(pts.every((p) => has(standardPositions(fp), p.x, p.y))).toBe(true)
  })
  it('manual использует только выбранные слоты', () => {
    const k = { mode: 'manual' as const, slots: [slot(0, 0, -1, -1), slot(1, 1, 1, 1)] }
    expect(resolvePositions(k, fp)).toEqual([{ x: -34, y: -34 }, { x: 34, y: 34 }])
  })
  it('сетка 3×2: слоты на последней ячейке', () => {
    const fp32 = footprintFromCells(3, 2, 42)
    expect(slotPosition(fp32, slot(2, 1, 1, 1))).toEqual({ x: 55, y: 34 })
    expect(allSlots(fp32)).toHaveLength(24)
  })
  it('сетка уменьшилась: слоты несуществующих ячеек игнорируются, остальные сохраняются', () => {
    const k = { mode: 'manual' as const, slots: [slot(0, 0, -1, -1), slot(2, 1, 1, 1)] }
    expect(validSlots(k.slots, fp)).toEqual([slot(0, 0, -1, -1)])
    expect(resolvePositions(k, fp)).toHaveLength(1)
    expect(resolvePositions(k, footprintFromCells(3, 2, 42))).toHaveLength(2)
  })
  it('toggleSlot включает и выключает', () => {
    const a = toggleSlot([], slot(0, 0, 1, 1))
    expect(a).toHaveLength(1)
    expect(toggleSlot(a, slot(0, 0, 1, 1))).toEqual([])
  })
  it('переход в Manual из любого режима даёт пустой выбор', () => {
    for (const mode of ['none', 'corner', 'full'] as const) {
      const m = switchMode({ mode, slots: [slot(0, 0, 1, 1)] }, 'manual')
      expect(m).toEqual({ mode: 'manual', slots: [] })
    }
  })
  it('выход из Manual выбор не трогает; тот же режим возвращает тот же объект', () => {
    const k = { mode: 'manual' as const, slots: [slot(0, 0, 1, 1)] }
    expect(switchMode(k, 'corner').slots).toEqual(k.slots)
    expect(switchMode(k, 'manual')).toBe(k)
  })
  it('старые точки привязываются к ближайшей позиции в радиусе 3 мм', () => {
    const out = slotsFromPoints([{ x: -33, y: -35 }, { x: -34.5, y: -33.5 }, { x: 0, y: 0 }, { x: 34, y: 34 }], fp)
    expect(out).toEqual([slot(0, 0, -1, -1), slot(1, 1, 1, 1)]) // дубль слит, далёкая точка отброшена
  })
  it('точка ровно на границе радиуса привязки принимается, чуть дальше — нет', () => {
    expect(slotsFromPoints([{ x: -34 + 3, y: -34 }], fp)).toHaveLength(1)
    expect(slotsFromPoints([{ x: -34 + 3.01, y: -34 }], fp)).toHaveLength(0)
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
      const slots: Slot[] = mode === 'manual' ? [{ i: 0, j: 0, sx: -1, sy: -1 }, { i: 1, j: 1, sx: 1, sy: 1 }] : []
      const p = { ...defaultParams, fasteners: { ...defaultFasteners, magnets: { mode, slots } } }
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
  it('в режиме Full материала больше, чем в Corner: больше ушей', async () => {
    const mk = async (mode: FastenerMode) => (await buildBaseplate({ ...defaultParams, x: units(3), y: units(3), fasteners: { ...defaultFasteners, magnets: { mode, slots: [] }, screws: { mode, slots: [] } } })).volume()
    const [corner, full] = [await mk('corner'), await mk('full')]
    expect(full).toBeGreaterThan(corner)
  })
  it('Manual: без выбранных позиций пола и ушей нет, с одной позицией они появляются', async () => {
    const mk = (slots: Slot[]) => buildBaseplate({ ...defaultParams, fasteners: { ...defaultFasteners, screws: { mode: 'manual', slots } } })
    const none = await mk([])
    expectValidSolid(none, { size: [84, 84, 4.65] })
    const one = await mk([{ i: 0, j: 0, sx: -1, sy: -1 }])
    expectValidSolid(one, { size: [84, 84, 8.65] })
    expect(one.volume()).not.toBeCloseTo(none.volume(), 0)
  })
  it('потай и цековка дают валидное тело', async () => {
    for (const screwHead of ['countersink', 'counterbore'] as const) {
      expectValidSolid(await buildBaseplate({ ...defaultParams, fasteners: { ...defaultFasteners, screws: { mode: 'corner', slots: [] }, screwHead } }))
    }
  })
})

describe('checkFasteners', () => {
  it('стандартные позиции без предупреждений', () => {
    expect(checkFasteners(cfg('full', 'full'), footprintFromCells(2, 2, 42))).toEqual([])
  })
  it('огромный магнит: у края габарита и пересечение отверстий', () => {
    const keys = checkFasteners(cfg('full', 'none', { magnetD: 27 }), footprintFromCells(1, 1, 42)).map((w) => w.key)
    expect(keys).toContain('fastener.nearEdge')
    expect(keys).toContain('fastener.overlap')
  })
})
