import { describe, expect, it } from 'vitest'
import type { Rectified } from './homography'
import { paperSize } from './paper'
import { COLOUR_DEFAULT_SENSITIVITY, defaultSegmentParams, segment } from './segment'

const A4 = paperSize('a4', 'landscape')
type Rgb = [number, number, number]
type Painter = (x: number, y: number) => Rgb | null

interface Scene { objects?: Painter[]; paper?: Rgb; light?: (x: number, y: number) => number; shadow?: (x: number, y: number) => number; noise?: number }

/** Цветной выпрямленный лист напрямую (4 px/мм): предметы, свет, мягкая тень (множитель, чуть слабее на синем канале), шум. */
function sheet(sc: Scene): Rectified {
  const scale = 4, w = Math.round(A4.width * scale), h = Math.round(A4.height * scale)
  const rgb = new Uint8Array(w * h * 3), gray = new Uint8Array(w * h)
  const paper = sc.paper ?? [235, 235, 230]
  let seed = 7
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5 }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = (i + 0.5) / scale, y = (j + 0.5) / scale
    let c: Rgb | null = null
    for (const o of sc.objects ?? []) { c = o(x, y); if (c) break }
    if (!c) {
      const l = sc.light ? sc.light(x, y) : 1, s = sc.shadow ? sc.shadow(x, y) : 1
      const sb = 1 - (1 - s) * 0.75 // синий ослабляется слабее: тень на листе чуть голубая
      c = [paper[0] * l * s, paper[1] * l * s, paper[2] * l * sb]
    }
    const k = j * w + i
    for (let ch = 0; ch < 3; ch++) rgb[k * 3 + ch] = Math.max(0, Math.min(255, Math.round(c[ch] + (sc.noise ? rnd() * 2 * sc.noise : 0))))
    gray[k] = Math.round(0.299 * rgb[k * 3] + 0.587 * rgb[k * 3 + 1] + 0.114 * rgb[k * 3 + 2])
  }
  return { image: { width: w, height: h, gray, alpha: null }, rgb, scale, paper: A4 }
}
const grayOnly = (r: Rectified): Rectified => ({ image: r.image, scale: r.scale, paper: r.paper })
const rect = (x: number, y: number, w: number, h: number, c: Rgb): Painter => (px, py) => (px >= x && px <= x + w && py >= y && py <= y + h ? c : null)
/** Мягкая тень от прямоугольника, смещённого на (dx, dy): 1 − depth·exp(−расстояние²/(2σ²)). */
const shadowOf = (x: number, y: number, w: number, h: number, dx: number, dy: number, depth: number, sigma: number) => (px: number, py: number) => {
  const cx = Math.max(x + dx - px, 0, px - (x + dx + w)), cy = Math.max(y + dy - py, 0, py - (y + dy + h))
  const d = Math.hypot(cx, cy)
  return 1 - depth * Math.exp(-(d * d) / (2 * sigma * sigma))
}
const BLACK: Rgb = [25, 25, 28], YELLOW: Rgb = [250, 240, 120], GREY: Rgb = [100, 100, 100], BLUE: Rgb = [30, 90, 200]

describe('цвет и тени в сегментации (25a 1.2)', () => {
  it('мягкая тень не входит в силуэт: размер чёрного предмета с тенью равен размеру без тени (±1 мм), а без учёта цвета разрастается', () => {
    const tool = rect(80, 60, 60, 25, BLACK)
    const plain = segment(sheet({ objects: [tool] }))
    const shadowed = sheet({ objects: [tool], shadow: shadowOf(80, 60, 60, 25, -5, 5, 0.45, 3) })
    const withShadow = segment(shadowed)
    expect(withShadow.silhouettes).toHaveLength(1)
    expect(Math.abs(withShadow.silhouettes[0].widthMm - plain.silhouettes[0].widthMm)).toBeLessThanOrEqual(1)
    expect(Math.abs(withShadow.silhouettes[0].heightMm - plain.silhouettes[0].heightMm)).toBeLessThanOrEqual(1)
    const legacy = segment(shadowed, { shadows: false })
    expect(legacy.silhouettes[0].widthMm).toBeGreaterThan(plain.silhouettes[0].widthMm + 2)
  })

  it('глубокая тень у самого предмета (60 % у контакта) прилипает к нему не более чем на 3 мм', () => {
    const tool = rect(80, 60, 60, 25, BLACK)
    const r = segment(sheet({ objects: [tool], shadow: shadowOf(80, 60, 60, 25, -1.5, 1.5, 0.6, 2) }))
    expect(r.silhouettes).toHaveLength(1)
    expect(r.silhouettes[0].widthMm).toBeLessThanOrEqual(63)
    expect(r.silhouettes[0].heightMm).toBeLessThanOrEqual(28)
  })

  it('одна тень без предмета не даёт силуэта', () => {
    const r = segment(sheet({ shadow: (x, y) => 1 - 0.4 * Math.exp(-(((x - 150) / 30) ** 2 + ((y - 100) / 15) ** 2)) }))
    expect(r.silhouettes).toEqual([])
  })

  it('жёлтая часть почти такой же яркости, как лист, находится целиком; по одной яркости она теряется', () => {
    const scene = sheet({ objects: [rect(60, 50, 50, 30, YELLOW)] })
    const col = segment(scene)
    expect(col.silhouettes).toHaveLength(1)
    expect(Math.abs(col.silhouettes[0].widthMm - 50)).toBeLessThanOrEqual(0.6)
    expect(Math.abs(col.silhouettes[0].heightMm - 30)).toBeLessThanOrEqual(0.6)
    const lum = segment(grayOnly(scene))
    expect(lum.silhouettes.length === 0 || lum.silhouettes[0].areaMm2 < 0.5 * col.silhouettes[0].areaMm2).toBe(true)
  })

  it('предмет из чёрной и жёлтой частей — один силуэт, не распадается', () => {
    const r = segment(sheet({ objects: [rect(60, 50, 50, 30, YELLOW), rect(110, 50, 40, 30, BLACK)] }))
    expect(r.silhouettes).toHaveLength(1)
    expect(Math.abs(r.silhouettes[0].widthMm - 90)).toBeLessThanOrEqual(0.8)
  })

  it('нейтральная серая деталь темнее 40 % яркости листа находится', () => {
    const r = segment(sheet({ objects: [rect(60, 50, 40, 30, GREY)] }))
    expect(r.silhouettes).toHaveLength(1)
    expect(Math.abs(r.silhouettes[0].widthMm - 40)).toBeLessThanOrEqual(0.6)
  })

  it('цветной предмет при градиенте света найден целиком, лист — нет', () => {
    const r = segment(sheet({ objects: [rect(200, 60, 30, 40, BLUE)], light: (x) => 1 - 0.35 * (x / A4.width) }))
    expect(r.silhouettes).toHaveLength(1)
    expect(Math.abs(r.silhouettes[0].widthMm - 30)).toBeLessThanOrEqual(0.6)
  })

  it('шум на каждом канале не создаёт предметов', () => {
    expect(segment(sheet({ noise: 5 })).silhouettes).toEqual([])
  })

  it('shadows: false — прежний результат по яркости (как без цвета)', () => {
    const scene = sheet({ objects: [rect(60, 50, 40, 30, BLACK)], shadow: shadowOf(60, 50, 40, 30, -4, 4, 0.4, 3) })
    const a = segment(scene, { shadows: false }), b = segment(grayOnly(scene))
    expect(a.silhouettes.map((s) => [s.widthMm, s.heightMm, s.areaMm2])).toEqual(b.silhouettes.map((s) => [s.widthMm, s.heightMm, s.areaMm2]))
    expect(a.sensitivity).toBe(b.sensitivity)
  })

  it('чувствительность работает и для цвета: число силуэтов не убывает с её ростом', () => {
    const scene = sheet({ objects: [rect(60, 50, 40, 30, [235, 205, 160]), rect(160, 50, 40, 30, BLUE)] })
    const counts = [0, 0.25, 0.5, 0.75, 1].map((s) => segment(scene, { sensitivity: s }).silhouettes.length)
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
    expect(counts[4]).toBe(2)
  })

  it('автоматическая чувствительность при цвете — константа, параметры по умолчанию дополнены', () => {
    expect(segment(sheet({ objects: [rect(60, 50, 40, 30, BLUE)] })).defaultSensitivity).toBe(COLOUR_DEFAULT_SENSITIVITY)
    expect(defaultSegmentParams).toEqual({ margin: 3, close: 0.8, minSpeck: 2, minSize: 3, minArea: 60, shadows: true, shadowEdge: 0.3, open: 0 })
  })

  it('shadowEdge = 0 отключает снятие теней: полутень остаётся в силуэте, как у чёрного предмета без цвета', () => {
    const scene = sheet({ objects: [rect(80, 60, 60, 25, BLACK)], shadow: shadowOf(80, 60, 60, 25, -5, 5, 0.45, 3) })
    const on = segment(scene), off = segment(scene, { shadowEdge: 0 })
    expect(off.silhouettes[0].widthMm).toBeGreaterThan(on.silhouettes[0].widthMm + 2)
  })

  it('тёмно-серая деталь внутри тени не пропадает: резкий край у предмета, мягкий у тени', () => {
    // серая деталь (35 % яркости листа) прямо на листе и мягкая тень рядом: деталь найдена, тень снята
    const scene = sheet({ objects: [rect(80, 60, 50, 30, [90, 90, 90])], shadow: shadowOf(80, 60, 50, 30, -6, 6, 0.4, 4) })
    const r = segment(scene)
    expect(r.silhouettes).toHaveLength(1)
    expect(Math.abs(r.silhouettes[0].widthMm - 50)).toBeLessThanOrEqual(1)
    expect(Math.abs(r.silhouettes[0].heightMm - 30)).toBeLessThanOrEqual(1)
  })
})
