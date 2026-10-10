import { describe, expect, it } from 'vitest'
import { autoCuts, columnLetter, resolveCuts, splitParts, defaultSplit } from './split'
import { baseplateLayout, buildBaseplate, buildBaseplateParts, validateBaseplate, type BaseplateGeometry } from './baseplate'
import { defaultFasteners } from './fasteners'
import { expectValidSolid, mm, sharpParams, units } from './testing'

const base = (o: Partial<BaseplateGeometry> = {}): BaseplateGeometry => ({ ...sharpParams, ...o })
const split = (maxX: number, maxY = maxX, extra: Partial<BaseplateGeometry['split']> = {}) => ({ ...defaultSplit, enabled: true, maxX, maxY, ...extra })

describe('autoCuts', () => {
  it('помещается: один разрез не нужен', () => {
    expect(autoCuts(2, 42, 256)).toEqual({ cuts: [], parts: 1 })
    expect(autoCuts(6, 42, 256)).toEqual({ cuts: [], parts: 1 }) // 252 ≤ 256
  })
  it('7 ячеек (294 мм) на столе 256: две части 4 + 3', () => {
    expect(autoCuts(7, 42, 256)).toEqual({ cuts: [4], parts: 2 })
  })
  it('поровну, остаток — первым частям: 10 ячеек на столе в 3 ячейки = 3 + 3 + 2 + 2', () => {
    expect(autoCuts(10, 42, 130)).toEqual({ cuts: [3, 6, 8], parts: 4 })
    expect(autoCuts(10, 42, 190)).toEqual({ cuts: [4, 7], parts: 3 }) // 4 + 3 + 3
  })
  it('одна ячейка больше объёма: ошибка', () => {
    expect(autoCuts(3, 42, 40).error).toBe('cellTooBig')
  })
  it('припуск бортика и отступа учитывается в крайних частях', () => {
    // 6 ячеек = 252 мм, но по 4 мм припуска с каждой стороны — 260 > 256: нужны две части
    expect(autoCuts(6, 42, 256, 4, 4)).toEqual({ cuts: [3], parts: 2 })
  })
  it('припуск делает даже одну ячейку слишком большой', () => {
    expect(autoCuts(1, 42, 50, 6, 6).error).toBe('cellTooBig')
  })
  it('граница включена: ровно по объёму', () => {
    expect(autoCuts(4, 42, 168)).toEqual({ cuts: [], parts: 1 })
    expect(autoCuts(4, 42, 167).parts).toBe(2)
  })
})

describe('части: дескрипторы', () => {
  it('подписи: буква — столбец, число — строка', () => {
    expect(columnLetter(0)).toBe('A')
    expect(columnLetter(25)).toBe('Z')
    expect(columnLetter(26)).toBe('AA')
    const fp = baseplateLayout(base({ x: units(4), y: units(4) })).fp
    expect(splitParts(fp, [2], [2]).map((p) => p.label)).toEqual(['A1', 'A2', 'B1', 'B2'])
  })
  it('метки стабильны: изменение разрезов в другом столбце не меняет метку', () => {
    const fp = baseplateLayout(base({ x: units(6), y: units(2) })).fp
    const a = splitParts(fp, [2, 4], []).map((p) => p.label)
    const b = splitParts(fp, [3], []).map((p) => p.label)
    expect(a).toEqual(['A1', 'B1', 'C1'])
    expect(b).toEqual(['A1', 'B1'])
  })
  it('собранный контур равен плите без разделения: прямоугольники покрывают плиту без щелей и наложений', () => {
    const l = baseplateLayout(base({ x: mm(300), y: mm(200), thickness: { ...sharpParams.thickness, rim: 3 } }))
    const parts = splitParts(l.fp, [3, 5], [2])
    expect(parts).toHaveLength(6)
    expect(parts.reduce((s, p) => s + p.sizeX * p.sizeY, 0)).toBeCloseTo(300 * 200, 6)
    expect(Math.min(...parts.map((p) => p.x0))).toBeCloseTo(-150, 9)
    expect(Math.max(...parts.map((p) => p.x1))).toBeCloseTo(150, 9)
    expect(Math.min(...parts.map((p) => p.y0))).toBeCloseTo(-100, 9)
    expect(Math.max(...parts.map((p) => p.y1))).toBeCloseTo(100, 9)
  })
  it('отступ остаётся в крайних частях: 300 мм = 3 + 4×42 + ... ', () => {
    const l = baseplateLayout(base({ x: mm(300), y: units(1) }))
    const [a, b] = splitParts(l.fp, [4], [])
    expect(a.sizeX).toBeCloseTo(3 + 4 * 42, 6)
    expect(b.sizeX).toBeCloseTo(3 * 42 + 3, 6)
    expect(a.x1).toBeCloseTo(b.x0, 9)
  })
  it('oversize: часть больше объёма помечается, поворот допускается', () => {
    const fp = baseplateLayout(base({ x: units(7), y: units(1) })).fp
    expect(splitParts(fp, [], [], 256, 256)[0].oversize).toBe(true)
    expect(splitParts(fp, [], [], 300, 50)[0].oversize).toBe(false)
    expect(splitParts(fp, [], [], 50, 300)[0].oversize).toBe(false) // повернув на 90°
  })
  it('resolveCuts: автоматические и ручные, лишнее отбрасывается', () => {
    const fp = baseplateLayout(base({ x: units(7), y: units(4) })).fp
    expect(resolveCuts(fp, split(256))).toEqual({ xCuts: [4], yCuts: [] })
    expect(resolveCuts(fp, split(256, 256, { auto: false, xCuts: [5, 2, 2, 0, 7, 99], yCuts: [2] }))).toEqual({ xCuts: [2, 5], yCuts: [2] })
    expect(resolveCuts(fp, { ...split(256), enabled: false })).toEqual({ xCuts: [], yCuts: [] })
    expect(resolveCuts(fp, split(30)).error).toBe('cellTooBig')
  })
})

describe('части: геометрия', () => {
  it('без разделения одна часть A1 — вся плита', async () => {
    const built = await buildBaseplateParts(base())
    expect(built).toHaveLength(1)
    expect(built[0].part.label).toBe('A1')
    expectValidSolid(built[0].solid, { size: [84, 84, 4.65] })
  })
  it('сумма объёмов частей равна объёму плиты, габариты частей стыкуются', async () => {
    const g = base({ x: units(7), y: units(4), split: split(256) })
    const whole = await buildBaseplate(g)
    const built = await buildBaseplateParts(g)
    expect(built.map((b) => b.part.label)).toEqual(['A1', 'B1'])
    built.forEach((b) => expectValidSolid(b.solid))
    expect(built.reduce((s, b) => s + b.solid.volume(), 0)).toBeCloseTo(whole.volume(), 1)
    const [a, b] = built.map((x) => x.solid.boundingBox())
    expect(a.max[0]).toBeCloseTo(b.min[0], 6)
    expect(a.min[0]).toBeCloseTo(-147, 6)
    expect(b.max[0]).toBeCloseTo(147, 6)
    expect(a.max[0] - a.min[0]).toBeLessThanOrEqual(256)
  })
  it('сумма объёмов с бортиком, отступом, скруглением, полом и уходящим крепежом', async () => {
    const g = base({
      x: mm(300), y: mm(200), pitch: 42,
      thickness: { baseHeight: 4.65, floor: 1.2, rim: 3, paddingDrop: 1, cornerRadius: 4 },
      fasteners: { ...defaultFasteners, magnets: { mode: 'full', slots: [] }, screws: { mode: 'corner', slots: [] } },
      split: split(160, 120),
    })
    const whole = await buildBaseplate(g)
    const built = await buildBaseplateParts(g)
    expect(built.length).toBeGreaterThan(2)
    built.forEach((b) => expectValidSolid(b.solid))
    expect(built.reduce((s, b) => s + b.solid.volume(), 0)).toBeCloseTo(whole.volume(), 0)
    // все части одной высоты
    expect(new Set(built.map((b) => b.solid.boundingBox().max[2].toFixed(3))).size).toBe(1)
  })
  it('вклад крепежа: ручные отверстия попадают только в свою часть', async () => {
    const g = base({
      x: units(4), y: units(1),
      fasteners: { ...defaultFasteners, magnets: { mode: 'manual', slots: [{ i: 0, j: 0, sx: -1, sy: -1 }] } },
      split: split(100),
    })
    const built = await buildBaseplateParts(g)
    expect(built).toHaveLength(2)
    const noHole = await buildBaseplate({ ...g, fasteners: defaultFasteners, split: { ...g.split, enabled: false } })
    expect(noHole.volume()).toBeGreaterThan(0)
    // правая часть не содержит ушей: объём у неё меньше, чем у левой с отверстием и ухом, по сравнению с зеркальной
    expect(built[0].solid.volume()).not.toBeCloseTo(built[1].solid.volume(), 0)
  })
  it('validateBaseplate: ячейка не помещается и слишком много частей', () => {
    expect(validateBaseplate(base({ split: split(30) })).errors).toEqual([{ field: 'split', key: 'baseplate.error.splitCellTooBig' }])
    expect(validateBaseplate(base({ x: units(23), y: units(23), split: split(42) })).errors).toEqual([{ field: 'split', key: 'baseplate.error.splitTooManyParts' }])
    expect(validateBaseplate(base({ x: units(7), y: units(4), split: split(256) })).ok).toBe(true)
  })
})
