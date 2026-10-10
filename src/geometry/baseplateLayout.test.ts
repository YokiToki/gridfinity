import { describe, expect, it } from 'vitest'
import { axisMm, baseplateHeights, baseplateLayout, buildBaseplate, defaultThickness, validateBaseplate, type BaseplateGeometry } from './baseplate'
import { defaultFasteners } from './fasteners'
import { expectValidSolid, mm, sharpParams, units } from './testing'
import { getWasm } from './wasm'

const base = (o: Partial<BaseplateGeometry> & { rim?: number; floor?: number; baseHeight?: number; paddingDrop?: number; cornerRadius?: number } = {}): BaseplateGeometry => {
  const { rim, floor, baseHeight, paddingDrop, cornerRadius, ...rest } = o
  return {
    ...sharpParams, ...rest,
    thickness: { ...sharpParams.thickness, ...(rim !== undefined && { rim }), ...(floor !== undefined && { floor }), ...(baseHeight !== undefined && { baseHeight }), ...(paddingDrop !== undefined && { paddingDrop }), ...(cornerRadius !== undefined && { cornerRadius }) },
  }
}
const withFasteners = (mode: 'full' | 'corner' | 'none') => ({ ...defaultFasteners, magnets: { mode, slots: [] } })

describe('раскладка плиты', () => {
  it('2×2 ячейки: 84×84, без остатка', () => {
    const l = baseplateLayout(base())
    expect([l.sizeX, l.sizeY, l.fp.nx, l.fp.ny, l.padX, l.padY]).toEqual([84, 84, 2, 2, 0, 0])
  })
  it('300×200 мм: 7×4 ячейки, остаток 6 и 32 мм', () => {
    const l = baseplateLayout(base({ x: mm(300), y: mm(200) }))
    expect([l.fp.nx, l.fp.ny]).toEqual([7, 4])
    expect(l.padX).toBeCloseTo(6, 9)
    expect(l.padY).toBeCloseTo(32, 9)
    expect(l.sizeX).toBe(300)
  })
  it('режим units пересчитывается при смене шага, mm — нет', () => {
    expect(axisMm(units(2.5), 42)).toBe(105)
    expect(axisMm(units(2.5), 40)).toBe(100)
    expect(axisMm(mm(100), 40)).toBe(100)
  })
  it('выравнивание: блок ячеек по центру, к началу и к концу', () => {
    const x = (align: 'start' | 'center' | 'end') => baseplateLayout(base({ x: mm(100, align) })).fp.offsetX
    expect(x('center')).toBeCloseTo(8, 9)
    expect(x('start')).toBeCloseTo(0, 9)
    expect(x('end')).toBeCloseTo(16, 9)
  })
  it('бортик сдвигает блок ячеек и уменьшает место под ячейки', () => {
    const l = baseplateLayout(base({ x: mm(90, 'start'), y: mm(90, 'start'), rim: 3 }))
    expect(l.fp.offsetX).toBeCloseTo(3, 9)
    expect(l.fp.nx).toBe(2) // (90 − 6) / 42
    expect(l.padX).toBeCloseTo(0, 9)
  })
  it('габарит меньше ячейки: одна усечённая ячейка по центру', () => {
    const l = baseplateLayout(base({ x: mm(30), y: mm(84) }))
    expect(l.truncX).toBe(true)
    expect(l.fp.nx).toBe(1)
    expect(l.fp.offsetX).toBeCloseTo((30 - 42) / 2, 9)
  })
})

describe('buildBaseplate: размеры', () => {
  it('84×84: точный габарит и 4 ячейки', async () => {
    const m = await buildBaseplate(base())
    expectValidSolid(m, { size: [84, 84, 4.65] })
  })
  it('300×200 мм: габарит ровно 300×200, остаток — плоская вставка', async () => {
    const g = base({ x: mm(300), y: mm(200) })
    const m = await buildBaseplate(g)
    expectValidSolid(m, { size: [300, 200, 4.65] })
    // сечение на середине высоты: плита минус 28 окон гнёзд (7×4) — остаток сплошной
    const w = await getWasm()
    const one = await buildBaseplate(base({ x: units(1), y: units(1) }))
    const emptyArea = 42 * 42 - one.slice(2).area()
    expect(m.slice(2).area()).toBeCloseTo(300 * 200 - 28 * emptyArea, 0)
    expect(w).toBeTruthy()
  })
  it('дробные 2.5×1.5 ячейки: 105×63', async () => {
    expectValidSolid(await buildBaseplate(base({ x: units(2.5), y: units(1.5) })), { size: [105, 63, 4.65] })
  })
  it('выравнивание сдвигает гнёзда: центр массы смещается к краю', async () => {
    const cx = async (align: 'start' | 'end') => {
      const m = await buildBaseplate(base({ x: mm(100, align), y: units(1) }))
      const bb = m.boundingBox()
      return { bb, volume: m.volume(), pocketsSide: align }
    }
    const [s, e] = [await cx('start'), await cx('end')]
    expect(s.bb.max[0] - s.bb.min[0]).toBeCloseTo(100, 6)
    expect(s.volume).toBeCloseTo(e.volume, 3) // зеркальные раскладки одного объёма
  })
})

describe('толщины', () => {
  it('открытая рама: высота 4.65', async () => {
    expectValidSolid(await buildBaseplate(base({ floor: 0 })), { size: [84, 84, 4.65] })
  })
  it('сплошной пол 1.2 мм прибавляет 1.2 к высоте и закрывает гнёзда', async () => {
    const m = await buildBaseplate(base({ floor: 1.2 }))
    expectValidSolid(m, { size: [84, 84, 5.85] })
    const open = await buildBaseplate(base({ floor: 0 }))
    expect(m.volume()).toBeGreaterThan(open.volume() + 4 * 1300 * 1.2 * 0.9) // четыре окна заполнены на 1.2 мм
    expect(m.slice(0.6).area()).toBeCloseTo(84 * 84, 1) // на высоте 0.6 мм пол сплошной
  })
  it('baseHeight больше стандартного поднимает кромку и углубляет стенки окна', async () => {
    const m = await buildBaseplate(base({ baseHeight: 6 }))
    expectValidSolid(m, { size: [84, 84, 6] })
    const std = await buildBaseplate(base())
    expect(m.volume()).toBeGreaterThan(std.volume())
  })
  it('бортик: внешний бортик остаётся сплошным', async () => {
    const m = await buildBaseplate(base({ x: mm(90), y: mm(90), rim: 3 }))
    expectValidSolid(m, { size: [90, 90, 4.65] })
    expect(m.volume()).toBeGreaterThan((await buildBaseplate(base())).volume() * 0.99)
  })
  it('скругление внешних углов: объём меньше, габариты те же', async () => {
    const round = await buildBaseplate(base({ cornerRadius: 4 }))
    const sharp = await buildBaseplate(base({ cornerRadius: 0 }))
    expectValidSolid(round, { size: [84, 84, 4.65] })
    expect(round.volume()).toBeLessThan(sharp.volume())
  })
  it('занижение отступа: вставка ниже кромки, блок ячеек не затронут', async () => {
    const g = base({ x: mm(100, 'start'), y: units(1), paddingDrop: 2 })
    const m = await buildBaseplate(g)
    expectValidSolid(m, { size: [100, 42, 4.65] })
    // сечение по высоте кромки (4.5) ниже края отступа
    const flush = await buildBaseplate(base({ x: mm(100, 'start'), y: units(1) }))
    expect(m.volume()).toBeLessThan(flush.volume())
    expect(flush.volume() - m.volume()).toBeCloseTo(16 * 42 * 2, 0) // вставка 16×42 срезана на 2 мм
  })
  it('занижение без остатка ничего не меняет', async () => {
    const a = await buildBaseplate(base({ paddingDrop: 2 }))
    const b = await buildBaseplate(base())
    expect(a.volume()).toBeCloseTo(b.volume(), 6)
  })
})

describe('крепёж: пол и уши', () => {
  it('открытая рама + магниты: пол остаётся 0, высота 8.65', async () => {
    const g = base({ fasteners: withFasteners('full') })
    const h = baseplateHeights(g)
    expect(h.total).toBeCloseTo(8.65, 9)
    expect(h.pocketBottom).toBeCloseTo(4, 9)
    const m = await buildBaseplate(g)
    expectValidSolid(m, { size: [84, 84, 8.65] })
    expect(g.thickness.floor).toBe(0)
    expect(m.slice(0.5).area()).toBeLessThan(84 * 84 * 0.6) // сплошного пола нет
  })
  it('сплошной пол 1.2 + магниты: пол 1.2 мм под окнами, уши поднимаются от него', async () => {
    const g = base({ floor: 1.2, fasteners: withFasteners('full') })
    const m = await buildBaseplate(g)
    expectValidSolid(m, { size: [84, 84, 8.65] })
    expect(m.slice(0.6).area()).toBeCloseTo(84 * 84, 1) // пол сплошной
    expect(m.slice(2).area()).toBeLessThan(84 * 84 * 0.6) // выше пола — окна с ушами
  })
  it('пол не меньше высоты ушей поглощает уши', async () => {
    const g = base({ floor: 4, fasteners: withFasteners('full') })
    const h = baseplateHeights(g)
    expect(h.pocketBottom).toBeCloseTo(4, 9)
    const m = await buildBaseplate(g)
    expectValidSolid(m, { size: [84, 84, 8.65] })
    expect(m.slice(1).area()).toBeCloseTo(84 * 84, 1) // сплошной пол 4 мм без окон (магнитные гнёзда начинаются выше, с 1.6 мм)
  })
  it('baseHeight + магниты: низ гнезда поднят вместе с кромкой', () => {
    expect(baseplateHeights(base({ baseHeight: 6, fasteners: withFasteners('full') })).pocketBottom).toBeCloseTo(5.35, 9)
  })
  it('дробный размер с магнитами: отверстия только на целых ячейках', async () => {
    const m = await buildBaseplate(base({ x: mm(100), y: units(1), fasteners: withFasteners('full') }))
    expectValidSolid(m, { size: [100, 42, 8.65] })
  })
})

describe('validateBaseplate', () => {
  it('значения по умолчанию валидны', () => {
    expect(validateBaseplate(base())).toEqual({ ok: true, errors: [] })
  })
  it('отрицательные и нечисловые значения', () => {
    expect(validateBaseplate(base({ floor: -1 })).errors).toEqual([{ field: 'thickness.floor', key: 'baseplate.error.negative' }])
    expect(validateBaseplate(base({ rim: NaN })).errors[0].key).toBe('baseplate.error.negative')
  })
  it('высота профиля меньше стандартной', () => {
    expect(validateBaseplate(base({ baseHeight: 4 })).errors).toEqual([{ field: 'thickness.baseHeight', key: 'baseplate.error.baseHeightMin' }])
  })
  it('бортик съедает плиту', () => {
    expect(validateBaseplate(base({ rim: 42 })).errors[0]).toEqual({ field: 'thickness.rim', key: 'baseplate.error.rimTooLarge' })
  })
  it('радиус больше половины габарита', () => {
    expect(validateBaseplate(base({ cornerRadius: 50 })).errors[0].key).toBe('baseplate.error.radiusTooLarge')
  })
  it('размер: ноль, слишком большой, слишком много ячеек', () => {
    expect(validateBaseplate(base({ x: mm(0) })).errors[0]).toEqual({ field: 'x', key: 'baseplate.error.size' })
    expect(validateBaseplate(base({ x: mm(1200) })).errors[0].key).toBe('baseplate.error.sizeTooLarge')
    expect(validateBaseplate(base({ pitch: 20, x: mm(900) })).errors[0]).toEqual({ field: 'x', key: 'baseplate.error.tooManyCells' })
  })
  it('занижение больше высоты плиты', () => {
    expect(validateBaseplate(base({ paddingDrop: 50 })).errors[0].key).toBe('baseplate.error.paddingDropTooLarge')
  })
  it('defaultThickness: стандартные значения', () => {
    expect(defaultThickness).toEqual({ baseHeight: 4.65, floor: 0, rim: 0, paddingDrop: 0, cornerRadius: 4 })
  })
})
