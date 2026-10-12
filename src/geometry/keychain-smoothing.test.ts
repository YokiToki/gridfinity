import { describe, expect, it } from 'vitest'
import { buildGrid, buildKeychain, buildSilhouette, defaultKeychain, plateSpec, sizeMm, type KeychainParams } from './keychain'
import { maskBounds } from './raster/resample'
import type { GrayImage } from './raster/threshold'
import { expectValidSolid } from './testing'

/** Эллипс тёмным на белом. */
function ellipse(W: number, H: number, rx: number, ry: number): GrayImage {
  const gray = new Uint8Array(W * H).fill(255)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (x + 0.5 - W / 2) / rx, dy = (y + 0.5 - H / 2) / ry; if (dx * dx + dy * dy <= 1) gray[y * W + x] = 0 }
  return { width: W, height: H, gray, alpha: null }
}
/** Горизонтальный градиент с «зерном фотографии» ±amp (детерминированный генератор). */
function noisy(W: number, H: number, amp: number): GrayImage {
  let s = 12345
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
  const gray = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) gray[y * W + x] = Math.max(0, Math.min(255, Math.round((x / (W - 1)) * 200 + 28 + (rnd() * 2 - 1) * amp)))
  return { width: W, height: H, gray, alpha: null }
}

const sil = { ...defaultKeychain.silhouette, close: 0, speck: 0, grow: 0 }
const P = (over: Partial<KeychainParams> = {}): KeychainParams => ({
  ...defaultKeychain, imageId: 'img', silhouette: sil, base: { ...defaultKeychain.base, thickness: 2 }, quality: { cell: 0.5, maxTriangles: 400_000 }, ...over,
})
const reg = (img: GrayImage) => new Map([['img', img]])
function gridFor(img: GrayImage, p: KeychainParams) {
  const s = buildSilhouette(img, p.silhouette)
  const b = maskBounds(s.mask, img.width, img.height)!
  const { w: wMm, h: hMm } = sizeMm(p.size, b[2] - b[0] + 1, b[3] - b[1] + 1)
  const plate = plateSpec(p.base, wMm, hMm).spec
  return buildGrid({ img, mask: s.mask, bounds: b, wMm, hMm, cell: p.quality.cell, p, plate, plateInGrid: false })
}
/** Среднее квадрата второй разности по строкам внутри силуэта: мера «зернистости». */
function roughness(g: ReturnType<typeof gridFor>) {
  let sum = 0, n = 0
  for (let j = 0; j < g.ny; j++) for (let i = 1; i < g.nx - 1; i++) {
    const a = j * g.nx + i
    if (!(g.solid[a - 1] && g.solid[a] && g.solid[a + 1])) continue
    const d2 = g.top[a - 1] - 2 * g.top[a] + g.top[a + 1]
    sum += d2 * d2; n++
  }
  return sum / n
}

describe('сглаживание источника (яркость)', () => {
  const img = noisy(240, 80, 40)
  const full = { ...sil, threshold: 255 as const } // весь прямоугольник — силуэт
  const p = (source: Partial<KeychainParams['source']> = {}, relief: Partial<KeychainParams['relief']> = {}) =>
    P({ silhouette: full, size: { ...defaultKeychain.size, longest: 120 }, source: { kind: 'brightness', contrast: 1, gamma: 1, invert: false, ...source }, relief: { ...defaultKeychain.relief, edgeWidth: 3, ...relief } })

  it('зерно уходит: зернистость поверхности падает в разы, чем больше радиус, тем глаже', () => {
    const r0 = roughness(gridFor(img, p())), r04 = roughness(gridFor(img, p({ smooth: 0.4 }))), r1 = roughness(gridFor(img, p({ smooth: 1 })))
    expect(r04).toBeLessThan(r0 * 0.5)
    expect(r1).toBeLessThan(r04)
  })
  it('силуэт не меняется от сглаживания', () => {
    const a = gridFor(img, p()), b = gridFor(img, p({ smooth: 1, despeckle: true }))
    expect(Array.from(b.silBlocks)).toEqual(Array.from(a.silBlocks))
    expect(Array.from(b.solid)).toEqual(Array.from(a.solid))
  })
  it('0 и «нет поля» дают тот же результат, что до появления сглаживания', () => {
    const a = gridFor(img, p()), b = gridFor(img, p({ smooth: 0, despeckle: false }))
    expect(Array.from(b.top)).toEqual(Array.from(a.top))
  })
  it('медиана убирает одиночные пятна', () => {
    const spiky = noisy(240, 80, 0)
    for (let k = 0; k < 40; k++) spiky.gray[(10 + ((k * 7) % 60)) * 240 + 20 + ((k * 13) % 200)] = 255
    const a = roughness(gridFor(spiky, p())), b = roughness(gridFor(spiky, p({ despeckle: true })))
    expect(b).toBeLessThan(a * 0.5)
  })
  it('кромка остаётся не ниже пола, потолок скоса действует после сглаживания', () => {
    const g = gridFor(img, p({ smooth: 1.5 }))
    let min = Infinity
    for (let k = 0; k < g.top.length; k++) if (g.solid[k]) min = Math.min(min, g.top[k])
    expect(min).toBeGreaterThanOrEqual(2 + 0.06 - 1e-6)
  })
  it('сборка со сглаживанием — валидное тело того же габарита', async () => {
    const r = await buildKeychain(p({ smooth: 0.6, despeckle: true }), reg(img))
    expectValidSolid(r.solid!)
    expect(r.solid!.boundingBox().max[0] - r.solid!.boundingBox().min[0]).toBeCloseTo(120, 1)
  })
})

describe('сглаживание поверхности', () => {
  const img = ellipse(300, 200, 130, 80)
  const terrace = (smooth: number, over: Partial<KeychainParams> = {}) => P({
    size: { ...defaultKeychain.size, longest: 90 }, relief: { ...defaultKeychain.relief, profile: 'terrace', steps: 3, hmax: 2, edgeWidth: 8, smooth }, quality: { cell: 0.25, maxTriangles: 400_000 }, ...over,
  })
  /** Наибольший скачок высоты между соседними узлами силуэта по строке. */
  const maxStep = (g: ReturnType<typeof gridFor>) => {
    let m = 0
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx - 1; i++) { const a = j * g.nx + i; if (g.solid[a] && g.solid[a + 1]) m = Math.max(m, Math.abs(g.top[a + 1] - g.top[a])) }
    return m
  }

  it('ступени террас становятся пологими склонами шириной около радиуса', () => {
    const rough = maxStep(gridFor(img, terrace(0)))
    const soft = maxStep(gridFor(img, terrace(0.5)))
    expect(rough).toBeGreaterThan(0.6) // ступень 2/3 мм за один узел
    expect(soft).toBeLessThan(rough * 0.5)
    // склон ~радиуса: шаг между узлами при σ = 0.5 мм (2 ячейки) не больше высоты ступени / 2
    expect(maxStep(gridFor(img, terrace(1)))).toBeLessThan(soft)
  })
  it('ноль и «нет поля» идентичны прежнему результату', () => {
    const base = terrace(0)
    const noField = { ...base, relief: (({ smooth: _s, ...rest }) => rest)(base.relief) as KeychainParams['relief'] }
    expect(Array.from(gridFor(img, noField).top)).toEqual(Array.from(gridFor(img, base).top))
  })
  it('пол и подложка: рельеф не ниже base + heightFloor, снаружи силуэта пусто', () => {
    const g = gridFor(img, terrace(3))
    const sb = new Set<number>()
    for (let k = 0; k < g.top.length; k++) { if (g.solid[k]) { sb.add(k); expect(g.top[k]).toBeGreaterThanOrEqual(2 + 0.06 - 1e-6) } else expect(g.top[k]).toBe(0) }
    expect(sb.size).toBeGreaterThan(1000)
  })
  it('нет утечки через границу: край не поднимается за счёт соседей снаружи', () => {
    const rough = gridFor(img, terrace(0)), soft = gridFor(img, terrace(2))
    // у самой кромки (первый слой узлов) высота не выше, чем плато/ступени; значения снаружи нули и не подмешиваются
    for (let k = 0; k < soft.top.length; k++) if (soft.solid[k]) expect(soft.top[k]).toBeLessThanOrEqual(2 + 2 + 1e-6)
    expect(Array.from(soft.solid)).toEqual(Array.from(rough.solid))
  })
  it('узор остаётся чётким: набор прорезанных узлов тот же, что без сглаживания', () => {
    const pat = { ...defaultKeychain.pattern, kind: 'lines' as const, pitch: 3, width: 1, depth: 0.2, angle: 0, scope: 'relief' as const }
    const cutSet = (smooth: number) => {
      const a = gridFor(img, terrace(smooth)), b = gridFor(img, terrace(smooth, { pattern: pat }))
      const s = new Set<number>()
      for (let k = 0; k < a.top.length; k++) if (a.solid[k] && Math.abs(a.top[k] - b.top[k]) > 1e-6) s.add(k)
      return s
    }
    const crisp = cutSet(0), smooth = cutSet(0.8)
    expect(crisp.size).toBeGreaterThan(100)
    // сглаженная поверхность режется теми же узлами: пересечение почти полное (отличия лишь там, где срез упёрся в пол)
    const common = [...crisp].filter((k) => smooth.has(k)).length
    expect(common / crisp.size).toBeGreaterThan(0.98)
    expect(smooth.size / crisp.size).toBeLessThan(1.02)
  })
  it('сборка со сглаживанием — валидное тело, объём меняется мало, габарит прежний', async () => {
    const a = await buildKeychain(terrace(0), reg(img)), b = await buildKeychain(terrace(0.8), reg(img))
    expectValidSolid(b.solid!)
    const ba = a.solid!.boundingBox(), bb = b.solid!.boundingBox()
    expect(bb.max[0] - bb.min[0]).toBeCloseTo(ba.max[0] - ba.min[0], 6)
    expect(bb.max[2]).toBeLessThanOrEqual(ba.max[2] + 1e-6) // сглаживание не поднимает выше плато
    expect(Math.abs(b.solid!.volume() - a.solid!.volume()) / a.solid!.volume()).toBeLessThan(0.05)
  })
  it('толщина подложки не меняется: срез под рельефом совпадает', async () => {
    const a = await buildKeychain(terrace(0), reg(img)), b = await buildKeychain(terrace(2), reg(img))
    const area = (m: { slice(z: number): { area(): number } }) => m.slice(1.0).area()
    expect(area(b.solid as never)).toBeCloseTo(area(a.solid as never), 3)
  })
})
