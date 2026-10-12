import { describe, expect, it } from 'vitest'
import { defaultShape, effectiveRadius, polygonVertices, shapeBounds, shapeMask, type ShapeParams } from './shapes'

const shape = (o: Partial<ShapeParams>): ShapeParams => ({ ...defaultShape, ...o })
const areaOf = (s: ShapeParams, px = 1024) => {
  const m = shapeMask(s, px)
  let n = 0
  for (const v of m.mask) n += v
  return (n * m.wMm * m.hMm) / (m.width * m.height)
}
const near = (a: number, b: number, tol = 0.004) => expect(Math.abs(a - b) / b).toBeLessThan(tol)

describe('площади фигур совпадают с аналитическими', () => {
  it('прямоугольник со скруглением', () => {
    near(areaOf(shape({ kind: 'rect', width: 54, height: 30, radius: 4 })), 54 * 30 - (4 - Math.PI) * 16)
    near(areaOf(shape({ kind: 'rect', width: 54, height: 30, radius: 0 })), 54 * 30)
  })
  it('круг, эллипс', () => {
    near(areaOf(shape({ kind: 'circle', width: 40 })), Math.PI * 400)
    near(areaOf(shape({ kind: 'ellipse', width: 60, height: 30 })), Math.PI * 30 * 15)
  })
  it('капсула: горизонтальная и вертикальная', () => {
    near(areaOf(shape({ kind: 'capsule', width: 60, height: 20 })), 40 * 20 + Math.PI * 100)
    near(areaOf(shape({ kind: 'capsule', width: 20, height: 60 })), 40 * 20 + Math.PI * 100)
  })
  it('правильный многоугольник без скругления и со скруглением', () => {
    for (const n of [3, 5, 6, 12]) {
      const R = 15
      near(areaOf(shape({ kind: 'polygon', sides: n, width: 2 * R, radius: 0 })), 0.5 * n * R * R * Math.sin((2 * Math.PI) / n))
    }
    // скруглённый = ядро (R − r) + кайма r: S = S_ядра + P_ядра · r + π r²
    const R = 15, r = 3, n = 6, rho = R - r
    const core = 0.5 * n * rho * rho * Math.sin((2 * Math.PI) / n), per = n * 2 * rho * Math.sin(Math.PI / n)
    near(areaOf(shape({ kind: 'polygon', sides: n, width: 2 * R, radius: r })), core + per * r + Math.PI * r * r)
  })
})

describe('габарит и вершины', () => {
  it('габарит маски — ровно размер фигуры, маска касается всех четырёх краёв', () => {
    for (const s of [shape({}), shape({ kind: 'capsule', width: 70, height: 25 }), shape({ kind: 'polygon', sides: 5, width: 30, rotation: 17, radius: 2 })]) {
      const b = shapeBounds(s), m = shapeMask(s, 512)
      expect(m.wMm).toBeCloseTo(b.w, 9)
      expect(m.hMm).toBeCloseTo(b.h, 9)
      const row = (j: number) => m.mask.slice(j * m.width, (j + 1) * m.width).some((v) => v)
      const col = (i: number) => Array.from({ length: m.height }, (_, j) => m.mask[j * m.width + i]).some((v) => v)
      expect([row(0), row(m.height - 1), col(0), col(m.width - 1)]).toEqual([true, true, true, true])
    }
  })
  it('прямоугольник 54 × 30 и круг 40 мм', () => {
    expect(shapeBounds(shape({ width: 54, height: 30 }))).toMatchObject({ w: 54, h: 30 })
    expect(shapeBounds(shape({ kind: 'circle', width: 40, height: 7 }))).toMatchObject({ w: 40, h: 40 })
  })
  it('шестиугольник шириной 30: ширина между крайними вершинами, высота 30·cos30°', () => {
    const s = shape({ kind: 'polygon', sides: 6, width: 30, radius: 0 })
    const b = shapeBounds(s)
    expect(b.w).toBeCloseTo(30, 9)
    expect(b.h).toBeCloseTo(30 * Math.cos(Math.PI / 6), 9)
    expect(polygonVertices(s)).toHaveLength(6)
  })
  it('число вершин следует числу сторон и зажимается в 3…12', () => {
    expect(polygonVertices(shape({ kind: 'polygon', sides: 3 }))).toHaveLength(3)
    expect(polygonVertices(shape({ kind: 'polygon', sides: 12 }))).toHaveLength(12)
    expect(polygonVertices(shape({ kind: 'polygon', sides: 1 }))).toHaveLength(3)
    expect(polygonVertices(shape({ kind: 'polygon', sides: 99 }))).toHaveLength(12)
  })
  it('скругление многоугольника не меняет ширину между крайними вершинами', () => {
    const w = (radius: number) => shapeBounds(shape({ kind: 'polygon', sides: 6, width: 30, radius })).w
    expect(w(4)).toBeCloseTo(30, 9)
    expect(w(0)).toBeCloseTo(30, 9)
  })
  it('поворот многоугольника сдвигает вершины; поворот на период стороны даёт тот же габарит', () => {
    const b0 = shapeBounds(shape({ kind: 'polygon', sides: 6, width: 30, rotation: 0, radius: 0 }))
    const b60 = shapeBounds(shape({ kind: 'polygon', sides: 6, width: 30, rotation: 60, radius: 0 }))
    expect(b60.w).toBeCloseTo(b0.w, 9)
    const b30 = shapeBounds(shape({ kind: 'polygon', sides: 6, width: 30, rotation: 30, radius: 0 }))
    expect(b30.w).toBeCloseTo(30 * Math.cos(Math.PI / 6), 9)
  })
})

describe('симметрия', () => {
  const flip = (m: ReturnType<typeof shapeMask>, axis: 'x' | 'y') => {
    let diff = 0
    for (let j = 0; j < m.height; j++) for (let i = 0; i < m.width; i++) {
      const o = axis === 'x' ? m.mask[j * m.width + (m.width - 1 - i)] : m.mask[(m.height - 1 - j) * m.width + i]
      if (o !== m.mask[j * m.width + i]) diff++
    }
    return diff
  }
  it('прямоугольник, эллипс и капсула симметричны по обеим осям', () => {
    for (const s of [shape({}), shape({ kind: 'ellipse', width: 50, height: 20 }), shape({ kind: 'capsule', width: 60, height: 20 })]) {
      const m = shapeMask(s, 256)
      expect(flip(m, 'x')).toBe(0)
      expect(flip(m, 'y')).toBe(0)
    }
  })
  it('шестиугольник симметричен относительно обеих осей', () => {
    const m = shapeMask(shape({ kind: 'polygon', sides: 6, width: 30 }), 256)
    expect(flip(m, 'x')).toBeLessThan(m.width * 0.02)
    expect(flip(m, 'y')).toBeLessThan(m.height * 0.02)
  })
})

describe('эффективный радиус', () => {
  it('прямоугольник: не больше половины меньшей стороны', () => {
    expect(effectiveRadius(shape({ width: 54, height: 30, radius: 4 }))).toBe(4)
    expect(effectiveRadius(shape({ width: 54, height: 30, radius: 99 }))).toBe(15)
    expect(effectiveRadius(shape({ width: 54, height: 30, radius: -3 }))).toBe(0)
  })
  it('предельный радиус даёт полностью скруглённый прямоугольник (капсулу)', () => {
    near(areaOf(shape({ width: 60, height: 20, radius: 99 })), 40 * 20 + Math.PI * 100)
  })
  it('многоугольник: не больше радиуса описанной окружности; у круга и эллипса скругления нет', () => {
    expect(effectiveRadius(shape({ kind: 'polygon', width: 30, radius: 99 }))).toBe(15)
    expect(effectiveRadius(shape({ kind: 'circle', radius: 5 }))).toBe(0)
  })
})
