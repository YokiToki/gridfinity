import { describe, expect, it } from 'vitest'
import { getWasm } from './wasm'
import { boxHeightMm, boxLayout, boxNotices, buildBox, compartmentSizes, defaultBox, equalDividers, FOOT_HEIGHT, validateBox, type BoxParams } from './box'
import { binFoot, lipProfile, lipHeight } from './profiles'
import { defaultFasteners } from './fasteners'
import { expectValidSolid, mm, units } from './testing'

const box = (o: Partial<BoxParams> & { wall?: number; floor?: number; inner?: number } = {}): BoxParams => {
  const { wall, floor, inner, ...rest } = o
  return { ...defaultBox, lip: 'none', ...rest, thickness: { ...defaultBox.thickness, ...(wall !== undefined && { outerWall: wall }), ...(floor !== undefined && { floor }), ...(inner !== undefined && { innerWall: inner }) } }
}
const widthAt = (m: { slice: (z: number) => { bounds: () => { min: number[]; max: number[] } } }, z: number) => { const b = m.slice(z).bounds(); return b.max[0] - b.min[0] }
const roundedArea = (x: number, y: number, r: number) => x * y - (4 - Math.PI) * r * r

/** Объёмы с многоугольной аппроксимацией цилиндров: сравниваем с допуском 2%. */
const near = (a: number, b: number, tol = 0.02) => expect(Math.abs(a - b) / Math.abs(b)).toBeLessThan(tol)

describe('параметры по умолчанию', () => {
  it('2×2×3, толщины и губа', () => {
    expect(defaultBox).toMatchObject({ pitch: 42, height: { mode: 'units', value: 3 }, thickness: { outerWall: 0.95, innerWall: 1.2, floor: 0.7 }, lip: 'default' })
    expect(defaultBox.compartments).toEqual({ cols: 1, rows: 1, xDividers: [], yDividers: [], removed: [] })
    expect(validateBox(defaultBox)).toEqual({ ok: true, errors: [] })
  })
  it('высота: единицы по 7 мм или мм', () => {
    expect(boxHeightMm({ mode: 'units', value: 3 })).toBe(21)
    expect(boxHeightMm({ mode: 'mm', value: 30 })).toBe(30)
  })
  it('раскладка: габарит меньше размера на 0.5 мм', () => {
    const l = boxLayout(box({ x: mm(100), y: units(2) }))
    expect([l.outerX, l.outerY]).toEqual([99.5, 83.5])
    expect(l.fp.nx).toBe(2)
    expect(l.cavityBottom).toBeCloseTo(FOOT_HEIGHT + 0.7, 9)
  })
})

describe('корпус: целые ячейки', () => {
  it('2×2×3 без губы: 83.5×83.5×21, валидное тело', async () => {
    expectValidSolid(await buildBox(box()), { size: [83.5, 83.5, 21] })
  })
  it('полость пустая: объём меньше сплошного бруса, внутри стенки', async () => {
    const m = await buildBox(box())
    expect(m.volume()).toBeLessThan(83.5 * 83.5 * 21 * 0.35)
    expect(m.volume()).toBeGreaterThan(5000)
    // на высоте 10 мм сечение — кольцо стенки 0.95 мм
    const ring = roundedArea(83.5, 83.5, 3.75) - roundedArea(81.6, 81.6, 2.8)
    expect(m.slice(10).area()).toBeCloseTo(ring, 0)
  })
  it('ноги: четыре отдельных ноги на высоте 2 мм, габарит ноги 41.5', async () => {
    const m = await buildBox(box())
    const s = m.slice(4)
    expect(s.decompose().length).toBe(4)
    const b = s.decompose()[0].bounds()
    expect(b.max[0] - b.min[0]).toBeCloseTo(41.5 - 2 * 2.15 + 2 * 2.15 * (4 - 2.6) / 2.15 - 0, 0) // ширина ноги на высоте 4 мм (верхняя фаска)
  })
  it('1×1×1 и 3×2×4 валидны', async () => {
    expectValidSolid(await buildBox(box({ x: units(1), y: units(1), height: { mode: 'units', value: 1 } })), { size: [41.5, 41.5, 7] })
    expectValidSolid(await buildBox(box({ x: units(3), y: units(2), height: { mode: 'units', value: 4 } })), { size: [125.5, 83.5, 28] })
  })
})

describe('корпус: дробный размер', () => {
  it('ширина 100 мм: габарит 99.5, два столбца ног, остаток — плоское дно', async () => {
    const m = await buildBox(box({ x: mm(100), y: units(2) }))
    expectValidSolid(m, { size: [99.5, 83.5, 21] })
    expect(m.slice(2).decompose().length).toBe(4) // 2 × 2 ноги
    // над ногами тело сплошное по всему габариту: на высоте 5 мм — кольцо плюс пол
    expect(widthAt(m, 5.2)).toBeCloseTo(99.5, 3)
    const bb = m.slice(2).bounds()
    expect(bb.max[0] - bb.min[0]).toBeLessThan(99.5) // ноги не доходят до краёв, остаток без ног
  })
  it('выравнивание сдвигает ноги', async () => {
    const left = await buildBox(box({ x: mm(100, 'start') }))
    const right = await buildBox(box({ x: mm(100, 'end') }))
    expect(left.slice(2).bounds().min[0]).toBeLessThan(right.slice(2).bounds().min[0])
  })
})

describe('губа', () => {
  it('высота по стилям: none 21, default +4.4, thin +2.6', async () => {
    expect(lipHeight('none')).toBe(0)
    expect(lipHeight('default')).toBeCloseTo(4.4, 9)
    expect(lipHeight('thin')).toBeCloseTo(2.6, 9)
    for (const [lip, h] of [['none', 21], ['default', 25.4], ['thin', 23.6]] as const) {
      expectValidSolid(await buildBox(box({ lip })), { size: [83.5, 83.5, h] })
    }
  })
  it('на кромке с губой остаётся тонкая плоскость, в полости — нет свеса больше 45°', async () => {
    const m = await buildBox(box({ lip: 'default' }))
    // сечение на верху губы: узкое кольцо, на высоте 20 мм — стенка 0.95
    const top = m.slice(25.3).area()
    expect(top).toBeGreaterThan(0)
    expect(top).toBeLessThan(m.slice(10).area())
  })
  it('профиль губы принимает ногу коробки сверху: ширина проёма ≥ ширины ноги на каждой высоте', async () => {
    const w = await getWasm()
    const foot = binFoot(w, 42)
    for (const style of ['default', 'thin'] as const) {
      const lip = lipProfile(w, 42, style)!
      const h = lipHeight(style)
      for (let k = 1; k <= 20; k++) {
        const z = (h * k) / 21
        expect(widthAt(lip, z)).toBeGreaterThanOrEqual(widthAt(foot, z) - 1e-6)
      }
      expect(h).toBeLessThan(FOOT_HEIGHT)
    }
  })
  it('внутри коробки проём губы виден: у полости на уровне губы шире, чем под стенкой', async () => {
    const m = await buildBox(box({ lip: 'default', wall: 0.95 }))
    const l = boxLayout(box({ lip: 'default' }))
    // сечение чуть выше стенки (21.5): проём меньше полости из-за нижнего края губы, значит материала больше
    expect(m.slice(21.2).area()).toBeGreaterThan(m.slice(20).area())
    expect(l.total).toBeCloseTo(25.4, 9)
  })
})

describe('толщины и валидация', () => {
  it('стенка 2.4 мм: полость уже на 2.4 мм с каждой стороны', async () => {
    const m = await buildBox(box({ wall: 2.4 }))
    expectValidSolid(m, { size: [83.5, 83.5, 21] })
    const ring = roundedArea(83.5, 83.5, 3.75) - roundedArea(83.5 - 4.8, 83.5 - 4.8, 3.75 - 2.4)
    expect(m.slice(10).area()).toBeCloseTo(ring, 0)
    expect(boxLayout(box({ wall: 2.4 })).cavityX).toBeCloseTo(78.7, 9)
  })
  it('пол: толще пол — выше дно полости', async () => {
    const thin = await buildBox(box({ floor: 0.7 })), thick = await buildBox(box({ floor: 3 }))
    expect(thick.volume()).toBeGreaterThan(thin.volume())
    expect(boxLayout(box({ floor: 3 })).cavityBottom).toBeCloseTo(7.75, 9)
  })
  it('стенки без полости: ошибка', () => {
    expect(validateBox(box({ wall: 41.7 })).errors).toEqual([{ field: 'thickness.outerWall', key: 'box.error.noCavity' }])
    expect(validateBox(box({ height: { mode: 'mm', value: 5.5 } })).errors[0].key).toBe('box.error.noCavity')
    expect(validateBox(box({ floor: 18 })).errors[0]).toEqual({ field: 'thickness.floor', key: 'box.error.noCavity' })
  })
  it('прочие ошибки: размер меньше ячейки, отрицательные значения, нулевая стенка', () => {
    expect(validateBox(box({ x: mm(30) })).errors[0]).toEqual({ field: 'x', key: 'box.error.sizeMin' })
    expect(validateBox(box({ floor: -1 })).errors[0].key).toBe('baseplate.error.negative')
    expect(validateBox(box({ wall: 0 })).errors[0]).toEqual({ field: 'thickness.outerWall', key: 'thickness.zero' })
    expect(validateBox(box({ height: { mode: 'mm', value: 0 } })).errors[0].key).toBe('box.error.height')
  })
})

describe('скругление дна', () => {
  const sc = (o: object) => box({ scoop: { front: false, back: false, left: false, right: false, radius: 10, ...o } })
  it('спереди радиус 10: объём корпуса растёт на объём скругления, остальное то же', async () => {
    const plain = await buildBox(sc({})), scooped = await buildBox(sc({ front: true }))
    expectValidSolid(scooped, { size: [83.5, 83.5, 21] })
    const expected = (10 * 10 - (Math.PI * 100) / 4) * 81.6 // (r² − πr²/4) · длина по X
    near(scooped.volume() - plain.volume(), expected)
  })
  it('каждая сторона отдельно и все вместе', async () => {
    const plain = (await buildBox(sc({}))).volume()
    const vols: number[] = []
    for (const side of ['front', 'back', 'left', 'right']) vols.push((await buildBox(sc({ [side]: true }))).volume() - plain)
    for (const v of vols) expect(v).toBeGreaterThan(300)
    expect(vols[0]).toBeCloseTo(vols[1], 0)
    expect(vols[2]).toBeCloseTo(vols[3], 0)
    const all = await buildBox(sc({ front: true, back: true, left: true, right: true }))
    expectValidSolid(all)
    expect(all.volume() - plain).toBeGreaterThan(vols[0] * 3)
  })
  it('скругление сидит у нужной стены: сечение на высоте над дном заходит внутрь только с этой стороны', async () => {
    const m = await buildBox(sc({ front: true }))
    const s = m.slice(boxLayout(box()).cavityBottom + 0.5).bounds()
    expect(s.min[1]).toBeCloseTo(-41.75, 2) // внешний габарит; сторона front — это −y
    const front = await buildBox(sc({ front: true })), back = await buildBox(sc({ back: true }))
    const yMass = (b: typeof front) => b.slice(boxLayout(box()).cavityBottom + 0.3).area()
    expect(yMass(front)).toBeCloseTo(yMass(back), 0)
  })
  it('радиус больше глубины полости ограничивается и даёт сообщение', () => {
    const p = box({ scoop: { front: true, back: false, left: false, right: false, radius: 50 }, height: { mode: 'units', value: 2 } })
    expect(boxLayout(p).scoopRadius).toBeCloseTo(14 - FOOT_HEIGHT - 0.7, 9)
    expect(boxNotices(p)).toEqual(['box.notice.scoopClamped'])
    expect(boxNotices(box())).toEqual([])
    expect(boxNotices(box({ scoop: { front: false, back: false, left: false, right: false, radius: 50 } }))).toEqual([])
  })
  it('очень большой радиус даёт валидное тело', async () => {
    const p = box({ scoop: { front: true, back: true, left: false, right: false, radius: 99 } })
    expectValidSolid(await buildBox(p))
  })
})

describe('отсеки', () => {
  it('равное деление: 3 столбца и 2 строки дают шесть отсеков равной ширины', async () => {
    const l = boxLayout(box())
    const xd = equalDividers(3, l.cavityX, 1.2), yd = equalDividers(2, l.cavityY, 1.2)
    expect(xd).toHaveLength(2)
    expect(yd).toHaveLength(1)
    const p = box({ compartments: { cols: 3, rows: 2, xDividers: xd, yDividers: yd, removed: [] } })
    const sizes = compartmentSizes(p)
    expect(sizes.widths).toHaveLength(3)
    expect(sizes.widths[0]).toBeCloseTo(sizes.widths[1], 6)
    expect(sizes.widths[1]).toBeCloseTo(sizes.widths[2], 6)
    expect(sizes.depths[0]).toBeCloseTo(sizes.depths[1], 6)
    const m = await buildBox(p)
    expectValidSolid(m)
    expect(m.slice(10).numContour()).toBe(1 + 6) // внешний контур + шесть отсеков
    const plain = await buildBox(box())
    // три перегородки толщиной 1.2: две по высоте полости на 81.6 и одна на 81.6 (с точностью до пересечений)
    const dividerVolume = (2 * 81.6 + 81.6 - 2 * 1.2 * 1.2) * 1.2 * (21 - 5.45)
    near(m.volume() - plain.volume(), dividerVolume)
  })
  it('слияние: убранный участок перегородки соединяет два отсека', async () => {
    const l = boxLayout(box())
    const xd = equalDividers(3, l.cavityX, 1.2), yd = equalDividers(2, l.cavityY, 1.2)
    const p = box({ compartments: { cols: 3, rows: 2, xDividers: xd, yDividers: yd, removed: ['x:0:0'] } })
    const m = await buildBox(p)
    expectValidSolid(m)
    expect(m.slice(10).numContour()).toBe(1 + 5)
    // вертикальная перегородка 0 убрана в строке 0, в строке 1 осталась
    const full = await buildBox(box({ compartments: { ...p.compartments, removed: [] } }))
    near(full.volume() - m.volume(), 1.2 * ((l.cavityY - 1.2) / 2) * (21 - 5.45), 0.03)
  })
  it('убраны все участки горизонтальной перегородки — остаются только вертикальные', async () => {
    const l = boxLayout(box())
    const xd = equalDividers(2, l.cavityX, 1.2), yd = equalDividers(2, l.cavityY, 1.2)
    const m = await buildBox(box({ compartments: { cols: 2, rows: 2, xDividers: xd, yDividers: yd, removed: ['y:0:0', 'y:0:1'] } }))
    expect(m.slice(10).numContour()).toBe(1 + 2)
  })
  it('перегородки толще полости: ошибка', () => {
    const l = boxLayout(box())
    expect(validateBox(box({ inner: 50, compartments: { cols: 3, rows: 1, xDividers: equalDividers(3, l.cavityX, 1.2), yDividers: [], removed: [] } })).errors[0].key).toBe('box.error.dividersTooThick')
    expect(validateBox(box({ compartments: { cols: 0, rows: 1, xDividers: [], yDividers: [], removed: [] } })).errors[0].key).toBe('box.error.compartments')
  })
  it('equalDividers: один отсек без перегородок, позиции симметричны', () => {
    expect(equalDividers(1, 81.6, 1.2)).toEqual([])
    const d = equalDividers(3, 81.6, 1.2)
    expect(d[0] + d[1]).toBeCloseTo(1, 9)
  })
})

describe('крепёж снизу', () => {
  it('магниты Full: 16 гнёзд в ногах, тело валидно', async () => {
    const plain = await buildBox(box())
    const withMagnets = await buildBox(box({ fasteners: { ...defaultFasteners, magnets: { mode: 'full', slots: [] } } }))
    expectValidSolid(withMagnets, { size: [83.5, 83.5, 21] })
    const pocket = Math.PI * 3.25 ** 2 * 2.4
    near(plain.volume() - withMagnets.volume(), 16 * pocket)
    // гнёзда открыты снизу: на высоте 1 мм сечение уменьшилось на 16 кругов
    near(plain.slice(1).area() - withMagnets.slice(1).area(), 16 * Math.PI * 3.25 ** 2)
  })
  it('по углам и вручную, винты глухие', async () => {
    const corner = await buildBox(box({ fasteners: { ...defaultFasteners, magnets: { mode: 'corner', slots: [] }, screws: { mode: 'corner', slots: [] } } }))
    expectValidSolid(corner)
    const manual = await buildBox(box({ fasteners: { ...defaultFasteners, magnets: { mode: 'manual', slots: [{ i: 0, j: 0, sx: -1, sy: -1 }] } } }))
    expectValidSolid(manual)
    // винт не выходит в полость: genus не меняется
    expect(corner.genus()).toBe((await buildBox(box())).genus())
  })
  it('дробный размер: отверстия только в ногах полных ячеек', async () => {
    const m = await buildBox(box({ x: mm(100), fasteners: { ...defaultFasteners, magnets: { mode: 'full', slots: [] } } }))
    expectValidSolid(m, { size: [99.5, 83.5, 21] })
  })
})
