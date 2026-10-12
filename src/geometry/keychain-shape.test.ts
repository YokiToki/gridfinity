import { describe, expect, it } from 'vitest'
import { buildKeychain, buildKeychainSheet, defaultMount, defaultSplit, validateKeychain, type KeychainParams } from './keychain'
import { defaultShape, type ShapeParams } from './shapes'
import { defaultShapeState, shapeParams } from '../features/keychain/shapeState'
import { expectValidSolid } from './testing'
import { generate } from './model'

const empty = new Map()
const P = (shape: Partial<ShapeParams> = {}, over: Partial<KeychainParams> = {}): KeychainParams => {
  const p = shapeParams({ ...defaultShapeState, shape: { ...defaultShape, ...shape }, quality: { cell: 0.5, maxTriangles: 400_000 } })
  return { ...p, ...over }
}
const solid = async (p: KeychainParams) => {
  const r = await buildKeychain(p, empty)
  if (!r.solid) throw new Error(r.info.error)
  return r
}
const box = (m: { boundingBox(): { min: number[]; max: number[] } }) => { const b = m.boundingBox(); return { w: b.max[0] - b.min[0], h: b.max[1] - b.min[1], zmin: b.min[2], zmax: b.max[2] } }

describe('фигура: габариты и валидность', () => {
  it('прямоугольник 54 × 30 со скруглением 4: габарит в пределах 0.05 мм', async () => {
    const { solid: m, info } = await solid(P({ kind: 'rect', width: 54, height: 30, radius: 4 }))
    const b = box(m!)
    expect(b.w).toBeCloseTo(54, 1)
    expect(Math.abs(b.w - 54)).toBeLessThan(0.05)
    expect(Math.abs(b.h - 30)).toBeLessThan(0.05)
    expect(b.zmin).toBeCloseTo(0, 6)
    expectValidSolid(m!)
    expect(info.size).toEqual([54, 30])
    expect(info.preview).not.toBeNull()
    expect(info.error).toBeUndefined()
  })
  it('острый прямоугольник: габарит ровно 54 × 30', async () => {
    const b = box((await solid(P({ kind: 'rect', width: 54, height: 30, radius: 0 }))).solid!)
    expect(Math.abs(b.w - 54)).toBeLessThan(0.05)
    expect(Math.abs(b.h - 30)).toBeLessThan(0.05)
  })
  it('круг 40 мм: габарит 40 × 40', async () => {
    const { solid: m } = await solid(P({ kind: 'circle', width: 40 }))
    const b = box(m!)
    expect(Math.abs(b.w - 40)).toBeLessThan(0.05)
    expect(Math.abs(b.h - 40)).toBeLessThan(0.05)
    expectValidSolid(m!)
  })
  it.each(['ellipse', 'capsule'] as const)('%s 60 × 25: валидное тело нужного габарита', async (kind) => {
    const { solid: m } = await solid(P({ kind, width: 60, height: 25 }))
    const b = box(m!)
    expect(Math.abs(b.w - 60)).toBeLessThan(0.05)
    expect(Math.abs(b.h - 25)).toBeLessThan(0.05)
    expectValidSolid(m!)
  })
  it('шестиугольник шириной 30: ширина между вершинами 30, высота 30·cos30°', async () => {
    const { solid: m } = await solid(P({ kind: 'polygon', sides: 6, width: 30, radius: 0 }))
    const b = box(m!)
    expect(Math.abs(b.w - 30)).toBeLessThan(0.05)
    expect(Math.abs(b.h - 30 * Math.cos(Math.PI / 6))).toBeLessThan(0.05)
    expectValidSolid(m!)
  })
  it('рельеф стоит на подложке: высота = подложка + плато', async () => {
    const p = P({ kind: 'rect', width: 40, height: 20, radius: 0 })
    const b = box((await solid(p)).solid!)
    expect(b.zmax).toBeCloseTo(p.base.thickness + p.relief.hmax, 2)
  })
})

describe('фигура: независимость от изображения', () => {
  it('реестр изображений пуст, настройки силуэта ни на что не влияют', async () => {
    const a = (await solid(P())).solid!.volume()
    const b = (await solid(P({}, { silhouette: { ...P().silhouette, threshold: 10, close: 9, speck: 999, grow: -5, fillHoles: false } }))).solid!.volume()
    expect(b).toBeCloseTo(a, 6)
  })
  it('источник «яркость» игнорируется (у фигуры нет яркости)', async () => {
    const a = (await solid(P())).solid!.volume()
    const b = (await solid(P({}, { source: { ...P().source, kind: 'brightness' } }))).solid!.volume()
    expect(b).toBeCloseTo(a, 6)
  })
  it('generate(keychain) для фигуры возвращает часть и сведения', async () => {
    const { imageRegistry } = await import('./model')
    imageRegistry.clear()
    const r = await generate('keychain', P())
    expect(r.parts).toHaveLength(1)
    expect(r.keychain?.size).toEqual([54, 30])
  })
})

describe('фигура: проверка параметров', () => {
  it('допустимые и недопустимые размеры', () => {
    expect(validateKeychain(P()).ok).toBe(true)
    expect(validateKeychain(P({ width: 0 })).errors.map((e) => e.field)).toContain('shape.width')
    expect(validateKeychain(P({ kind: 'ellipse', height: -1 })).errors.map((e) => e.field)).toContain('shape.height')
    expect(validateKeychain(P({ radius: -1 })).errors.map((e) => e.field)).toContain('shape.radius')
    expect(validateKeychain(P({ kind: 'polygon', sides: 2 })).errors.map((e) => e.field)).toContain('shape.sides')
    expect(validateKeychain(P({ kind: 'polygon', sides: 13 })).errors.map((e) => e.field)).toContain('shape.sides')
    expect(validateKeychain(P({ kind: 'polygon', sides: 4.5 })).ok).toBe(false)
  })
  it('высота у круга и многоугольника не проверяется, размер изображения тоже', () => {
    expect(validateKeychain(P({ kind: 'circle', height: 0 })).ok).toBe(true)
    expect(validateKeychain(P({ kind: 'polygon', height: 0 })).ok).toBe(true)
    const p = P()
    expect(validateKeychain({ ...p, size: { ...p.size, longest: 0, width: 0, height: 0 } }).ok).toBe(true)
  })
  it('бортик проверяется только когда включён', () => {
    expect(validateKeychain(P({ rim: { enabled: false, width: 0, height: -1 } })).ok).toBe(true)
    expect(validateKeychain(P({ rim: { enabled: true, width: 0, height: 1 } })).errors.map((e) => e.field)).toContain('shape.rim.width')
    expect(validateKeychain(P({ rim: { enabled: true, width: 1, height: -1 } })).errors.map((e) => e.field)).toContain('shape.rim.height')
  })
})

describe('фигура: крепление и две половины', () => {
  it('сквозное отверстие на фигуре: объём уменьшается, положение известно', async () => {
    const plain = (await solid(P())).solid!.volume()
    const r = await solid(P({}, { mount: { ...defaultMount, style: 'hole', x: 0.1, y: 0.5 } }))
    expect(r.solid!.volume()).toBeLessThan(plain)
    expect(r.info.mountInfo?.mount).not.toBeNull()
    expectValidSolid(r.solid!)
  })
  it('ушко: добавляет материал и остаётся валидным телом', async () => {
    const plain = (await solid(P())).solid!.volume()
    const r = await solid(P({}, { mount: { ...defaultMount, style: 'eyelet', x: 0.5, y: 1.05 } }))
    expect(r.solid!.volume()).toBeGreaterThan(plain)
    expectValidSolid(r.solid!)
  })
  it('две половины со штифтами: лист из половин и штифтов', async () => {
    const p = P({}, { split: { ...defaultSplit, enabled: true, pins: 2 } })
    const { parts, info } = await buildKeychainSheet(p, empty)
    expect(parts.length).toBeGreaterThanOrEqual(3) // верх, низ и свободные штифты
    expect(info.mountInfo?.sheet).toBeDefined()
    expect(info.mountInfo?.pins).toHaveLength(2)
    for (const q of parts) expectValidSolid(q.solid)
    parts.forEach((q) => q.solid.delete())
  })
  it('канал в режиме половин на фигуре', async () => {
    const p = P({}, { mount: { ...defaultMount, style: 'channel', x: 0.5, y: 0.8, exitX: 0.5, exitY: 1.05 }, split: { ...defaultSplit, enabled: true, pins: 2 } })
    const { parts, info } = await buildKeychainSheet(p, empty)
    expect(parts.length).toBeGreaterThanOrEqual(2)
    expect(info.mountInfo?.mount).not.toBeNull()
    parts.forEach((q) => q.solid.delete())
  })
})

describe('бортик (2.3)', () => {
  const tag = (rim: Partial<ShapeParams['rim']> = {}, over: Partial<KeychainParams> = {}) =>
    P({ kind: 'rect', width: 40, height: 20, radius: 0, rim: { enabled: true, width: 1.2, height: 0.8, ...rim } }, { quality: { cell: 0.1, maxTriangles: 800_000 }, ...over })
  const sliceArea = (m: { slice(z: number): { area(): number; delete(): void } }, z: number) => { const cs = m.slice(z); const a = cs.area(); cs.delete(); return a }

  it('кайма: на высоте посередине бортика остаётся кольцо шириной ~1.2 мм по всему краю', async () => {
    const p = tag()
    const m = (await solid(p)).solid!
    const top = p.base.thickness + p.relief.hmax
    expect(box(m).zmax).toBeCloseTo(top + 0.8, 2)
    const ring = sliceArea(m as never, top + 0.4)
    const expected = 2 * (40 + 20) * 1.2 - 4 * 1.2 * 1.2
    expect(Math.abs(ring - expected) / expected).toBeLessThan(0.1)
    // внутри бортика — обычный уровень рельефа, площадь на уровне плато равна всей фигуре
    expect(sliceArea(m as never, top - 0.1)).toBeCloseTo(40 * 20, -1)
  })
  it('бортик выключен: тело совпадает с телом без бортика; нулевая высота — тоже', async () => {
    const off = (await solid(tag({ enabled: false }))).solid!.volume()
    const none = (await solid(P({ kind: 'rect', width: 40, height: 20, radius: 0 }, { quality: { cell: 0.1, maxTriangles: 800_000 } }))).solid!.volume()
    expect(off).toBeCloseTo(none, 6)
    expect((await solid(tag({ height: 0 }))).solid!.volume()).toBeCloseTo(none, 6)
    expect((await solid(tag())).solid!.volume()).toBeGreaterThan(none)
  })
  it('бортик выше — объём больше, ширина шире — объём больше', async () => {
    const v = async (rim: Partial<ShapeParams['rim']>) => (await solid(tag(rim))).solid!.volume()
    const base = await v({})
    expect(await v({ height: 1.2 })).toBeGreaterThan(base)
    expect(await v({ width: 2 })).toBeGreaterThan(base)
  })
  it('узор на всём рельефе режет бортик, но не опускается ниже пола; тело валидно', async () => {
    const p = tag({}, { pattern: { kind: 'lines', pitch: 1.5, width: 0.5, depth: 5, angle: 0, offset: 0, staggered: true, scope: 'relief' } })
    const m = (await solid(p)).solid!
    expectValidSolid(m)
    const plain = (await solid(tag())).solid!.volume()
    expect(m.volume()).toBeLessThan(plain) // узор действительно режет
    const plateOnly = 40 * 20 * (p.base.thickness + p.relief.heightFloor)
    expect(m.volume()).toBeGreaterThan(plateOnly * 0.999) // ниже пола не режет
  })
  it('гравировка + бортик: валидное тело, кромка выше плиты', async () => {
    const p = tag({}, { relief: { ...P().relief, profile: 'engraved', hmax: 1 } })
    const m = (await solid(p)).solid!
    expectValidSolid(m)
    expect(box(m).zmax).toBeCloseTo(p.base.thickness + 0.8, 1)
  })
  it('бортик на круге и многоугольнике работает по контуру', async () => {
    const c = P({ kind: 'circle', width: 30, rim: { enabled: true, width: 1, height: 0.6 } })
    const m = (await solid(c)).solid!
    const top = c.base.thickness + c.relief.hmax
    const ring = sliceArea(m as never, top + 0.3)
    const R = 15
    expect(Math.abs(ring - Math.PI * (R * R - (R - 1) ** 2)) / (Math.PI * (R * R - (R - 1) ** 2))).toBeLessThan(0.2)
  })
})

describe('гладкие радиусы (контур не зависит от шага сетки)', () => {
  type Sliceable = { slice(z: number): { toPolygons(): number[][][]; delete(): void } }
  const outline = (m: Sliceable, z: number) => { const cs = m.slice(z); const pts = cs.toPolygons().flat(); cs.delete(); return pts }
  const rrSdf = (x: number, y: number, w: number, h: number, r: number) => {
    const qx = Math.abs(x) - (w / 2 - r), qy = Math.abs(y) - (h / 2 - r)
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  }
  // грубая сетка 0.5 мм: раньше радиус 4 мм превращался в ступеньки по 0.5 мм
  const coarse = { quality: { cell: 0.5, maxTriangles: 400_000 } }

  it.each([['подложка', 0.8], ['рельеф', 2.1]])('скруглённый прямоугольник 54 × 30, радиус 4: %s лежит на дуге с точностью 0.02 мм', async (_n, z) => {
    const m = (await solid(P({ kind: 'rect', width: 54, height: 30, radius: 4 }, coarse))).solid!
    const pts = outline(m as never, z)
    expect(pts.length).toBeGreaterThan(100) // дуги разбиты на много сегментов, а не на ступеньки сетки
    for (const [x, y] of pts) expect(Math.abs(rrSdf(x, y, 54, 30, 4))).toBeLessThan(0.02)
  })
  it('круг 40 мм: все точки контура на окружности радиуса 20', async () => {
    const m = (await solid(P({ kind: 'circle', width: 40 }, coarse))).solid!
    for (const z of [0.8, 2.1]) for (const [x, y] of outline(m as never, z)) expect(Math.abs(Math.hypot(x, y) - 20)).toBeLessThan(0.02)
  })
  it('большое скругление и острые углы: острый угол остаётся острым', async () => {
    const m = (await solid(P({ kind: 'rect', width: 40, height: 20, radius: 0 }, coarse))).solid!
    const pts = outline(m as never, 2.1)
    expect(Math.max(...pts.map((q) => Math.abs(q[0])))).toBeCloseTo(20, 2)
    expect(pts.some(([x, y]) => Math.abs(Math.abs(x) - 20) < 1e-6 && Math.abs(Math.abs(y) - 10) < 1e-6)).toBe(true) // вершина (20, 10) на месте
  })
  it('многоугольник со скруглением 3 мм: вершины на расстоянии от ядра, равном радиусу', async () => {
    const R = 15, r = 3, rho = R - r
    const m = (await solid(P({ kind: 'polygon', sides: 6, width: 2 * R, radius: r }, coarse))).solid!
    const core = Array.from({ length: 6 }, (_, k) => [rho * Math.cos((Math.PI / 3) * k), rho * Math.sin((Math.PI / 3) * k)])
    const dist = (x: number, y: number) => Math.min(...core.map((c, k) => {
      const d = core[(k + 1) % 6], ex = d[0] - c[0], ey = d[1] - c[1]
      const t = Math.max(0, Math.min(1, ((x - c[0]) * ex + (y - c[1]) * ey) / (ex * ex + ey * ey)))
      return Math.hypot(x - c[0] - t * ex, y - c[1] - t * ey)
    }))
    for (const [x, y] of outline(m as never, 0.8)) expect(Math.abs(dist(x, y) - r)).toBeLessThan(0.02)
  })
  it('габарит не раздувается запасом растра: ровно 54 × 30', async () => {
    const b = box((await solid(P({ kind: 'rect', width: 54, height: 30, radius: 4 }, coarse))).solid!)
    expect(Math.abs(b.w - 54)).toBeLessThan(0.005)
    expect(Math.abs(b.h - 30)).toBeLessThan(0.005)
  })
  it('бортик: и наружный, и внутренний край — точные дуги (внутренний радиус 4 − 1.2 = 2.8 мм)', async () => {
    const p = P({ kind: 'rect', width: 54, height: 30, radius: 4, rim: { enabled: true, width: 1.2, height: 0.8 } }, coarse)
    const m = (await solid(p)).solid!
    const pts = outline(m as never, p.base.thickness + p.relief.hmax + 0.4)
    expect(pts.length).toBeGreaterThan(200)
    for (const [x, y] of pts) {
      const d = rrSdf(x, y, 54, 30, 4)
      expect(Math.min(Math.abs(d), Math.abs(d + 1.2))).toBeLessThan(0.02) // на наружной кромке или ровно на 1.2 мм внутрь
    }
    // внутренний край действительно есть: часть точек лежит на глубине 1.2 мм
    expect(pts.filter(([x, y]) => Math.abs(rrSdf(x, y, 54, 30, 4) + 1.2) < 0.02).length).toBeGreaterThan(50)
  })
})
