import { close, dilate, erode } from '../raster/morphology'
import { fillHoles, labelComponents, removeSpecks } from '../raster/components'
import { otsu } from '../raster/threshold'
import { colourMask } from './colour'
import type { Rectified } from './homography'

/** Настройки выделения силуэтов. Длины в мм. */
export interface SegmentParams {
  /** Чувствительность 0…1: чем выше, тем более бледные предметы находятся. Не задана — берётся автоматическая (`defaultSensitivity`). */
  sensitivity?: number
  /** Поле по краю листа, где предметы не ищутся (стол, край бумаги). */
  margin: number
  /** Склейка щелей в предмете (блики), радиус, мм. */
  close: number
  /** Пятна меньше этой площади игнорируются, мм². */
  minSpeck: number
  /** Силуэты меньше этого размера по любой стороне отбрасываются, мм. */
  minSize: number
  /** Силуэты площадью меньше этой отбрасываются (остатки теней и блики), мм². */
  minArea: number
  /** Учитывать цвет и отличать мягкие тени от предметов (нужен цветной растр, иначе только яркость). */
  shadows: boolean
  /** Наибольшая крутизна перехода (1/мм), которую ещё считают мягкой тенью: выше — край предмета. */
  shadowEdge: number
  /** Радиус размыкания маски при учёте теней, мм: убирает тонкие полоски тени вдоль контура (уже 2·радиус). */
  open: number
}

export const defaultSegmentParams: SegmentParams = { margin: 3, close: 0.8, minSpeck: 2, minSize: 3, minArea: 60, shadows: true, shadowEdge: 0.3, open: 0 }
/** Автоматическая чувствительность при цветной сегментации: тень отсекается отдельно (shadowEdge), гистограмма яркости не нужна. */
export const COLOUR_DEFAULT_SENSITIVITY = 0.4

/** Падение яркости относительно листа, нужное для «предмет»: от 50 % (чувствительность 0) до 8 % (чувствительность 1). */
const DROP_MAX = 0.5, DROP_MIN = 0.08
export const dropFor = (sensitivity: number) => DROP_MAX - (DROP_MAX - DROP_MIN) * Math.min(1, Math.max(0, sensitivity))
const sensitivityFor = (drop: number) => Math.min(1, Math.max(0, (DROP_MAX - drop) / (DROP_MAX - DROP_MIN)))

export interface Silhouette {
  /** Номер (1…n) в порядке обхода листа сверху вниз; метка в `labels`. */
  id: number
  areaMm2: number
  widthMm: number
  heightMm: number
  /** Габарит в пикселях выпрямленного растра, включительно: [x0, y0, x1, y1]. */
  bbox: [number, number, number, number]
}

export interface Segmentation {
  width: number
  height: number
  scale: number
  /** Номер силуэта в каждом пикселе, 0 — фон. */
  labels: Int32Array
  silhouettes: Silhouette[]
  /** Использованная чувствительность и автоматическая (по гистограмме листа). */
  sensitivity: number
  defaultSensitivity: number
}

/** Решение системы n × n методом Гаусса с выбором главного элемента; null — вырождена. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r
    if (Math.abs(a[p][c]) < 1e-12) return null
    ;[a[c], a[p]] = [a[p], a[c]]; [b[c], b[p]] = [b[p], b[c]]
    for (let r = c + 1; r < n; r++) {
      const f = a[r][c] / a[c][c]
      for (let k = c; k < n; k++) a[r][k] -= f * a[c][k]
      b[r] -= f * b[c]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= a[r][k] * x[k]; x[r] = s / a[r][r] }
  return x
}

const basis = (x: number, y: number) => [1, x, y, x * x, x * y, y * y]

/**
 * Яркость чистого листа в каждой точке: квадратичная поверхность a + bx + cy + dx² + exy + fy², подогнанная по пикселям листа
 * (не предметы и не поле). Поверхность справляется с градиентом света и с предметами любого размера, где локальное размытие
 * принимало бы большой тёмный предмет за фон. Предметы исключаются итерациями: сначала всё заметно темнее листа, затем по
 * результату подгонки.
 */
export function paperSurface(gray: Uint8Array, w: number, h: number, ignore: Uint8Array): Float32Array {
  // яркость листа на глаз: 70-й процентиль по пикселям вне поля
  const hist = new Float64Array(256)
  let total = 0
  for (let i = 0; i < gray.length; i++) if (!ignore[i]) { hist[gray[i]]++; total++ }
  let acc = 0, p70 = 255
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.7) { p70 = v; break } }
  const nx = (i: number) => (i / (w - 1)) * 2 - 1, ny = (j: number) => (j / (h - 1)) * 2 - 1
  const excluded = new Uint8Array(gray.length)
  for (let i = 0; i < gray.length; i++) excluded[i] = ignore[i] || gray[i] < 0.75 * p70 ? 1 : 0
  const surface = new Float32Array(gray.length)
  const step = Math.max(1, Math.round(Math.sqrt((w * h) / 60000))) // около 60 000 опорных пикселей
  let coef: number[] = [p70, 0, 0, 0, 0, 0]
  for (let pass = 0; pass < 3; pass++) {
    const ata = Array.from({ length: 6 }, () => new Array<number>(6).fill(0)), atb = new Array<number>(6).fill(0)
    let n = 0
    for (let j = 0; j < h; j += step) for (let i = 0; i < w; i += step) {
      const k = j * w + i
      if (excluded[k]) continue
      const f = basis(nx(i), ny(j)), g = gray[k]
      for (let r = 0; r < 6; r++) { atb[r] += f[r] * g; for (let c = r; c < 6; c++) ata[r][c] += f[r] * f[c] }
      n++
    }
    for (let r = 0; r < 6; r++) for (let c = 0; c < r; c++) ata[r][c] = ata[c][r]
    const sol = n >= 12 ? solve(ata, atb) : null
    if (sol) coef = sol
    const [c0, c1, c2, c3, c4, c5] = coef
    for (let j = 0; j < h; j++) {
      const y = ny(j)
      const rowConst = c0 + c2 * y + c5 * y * y
      for (let i = 0; i < w; i++) {
        const x = nx(i)
        surface[j * w + i] = Math.max(1, rowConst + x * (c1 + c4 * y) + c3 * x * x)
      }
    }
    // следующий проход: исключаем то, что заметно темнее подогнанного листа
    for (let k = 0; k < gray.length; k++) excluded[k] = ignore[k] || gray[k] < 0.88 * surface[k] ? 1 : 0
  }
  return surface
}

/**
 * Силуэты предметов на выпрямленном листе: контраст относительно подогнанной яркости листа, чувствительность (автоматическая по
 * гистограмме или заданная), склейка щелей, удаление пятен, заливка внутренних щелей, поле по краю листа, связные области.
 */
export function segment(r: Rectified, params: Partial<SegmentParams> = {}): Segmentation {
  const p = { ...defaultSegmentParams, ...params }
  const { width: w, height: h, gray } = r.image, s = r.scale
  const marginPx = Math.max(0, Math.round(p.margin * s))
  const edge = new Uint8Array(w * h)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (i < marginPx || j < marginPx || i >= w - marginPx || j >= h - marginPx) edge[j * w + i] = 1

  const surface = paperSurface(gray, w, h, edge)
  const colour = !!r.rgb && p.shadows
  let defaultSensitivity = COLOUR_DEFAULT_SENSITIVITY
  let ratio: Uint8Array<ArrayBuffer> | null = null // яркость относительно листа, 0…255 (255 = как у листа или ярче)
  if (!colour) {
    ratio = new Uint8Array(w * h)
    const inner: number[] = []
    for (let k = 0; k < ratio.length; k++) {
      ratio[k] = Math.max(0, Math.min(255, Math.round((gray[k] / surface[k]) * 255)))
      if (!edge[k]) inner.push(ratio[k])
    }
    const t = inner.length ? otsu(Uint8Array.from(inner)) : 128
    defaultSensitivity = sensitivityFor(1 - t / 255)
  }
  const sensitivity = params.sensitivity !== undefined && Number.isFinite(params.sensitivity) ? Math.min(1, Math.max(0, params.sensitivity)) : defaultSensitivity
  const cut = Math.round((1 - dropFor(sensitivity)) * 255)

  let mask: Uint8Array<ArrayBuffer> = new Uint8Array(w * h)
  if (colour && r.rgb) mask = colourMask(r.rgb, gray, w, h, edge, { sensitivity, drop: dropFor(sensitivity), softEdge: p.shadowEdge, scale: s }, surface)
  else for (let k = 0; k < mask.length; k++) mask[k] = !edge[k] && ratio![k] < cut ? 1 : 0
  // при учёте теней остатки полутени вдоль контура — тонкие полоски: размыкание их убирает, а острия инструментов (шире 2 мм) остаются
  const openR = colour && p.shadowEdge > 0 ? Math.round(p.open * s) : 0
  if (openR > 0) mask = new Uint8Array(dilate(erode(mask, w, h, openR), w, h, openR))
  const cleaned = fillHoles(removeSpecks(close(mask, w, h, Math.round(p.close * s)), w, h, Math.max(1, Math.round(p.minSpeck * s * s))), w, h).mask
  mask = new Uint8Array(cleaned)
  for (let k = 0; k < mask.length; k++) if (edge[k]) mask[k] = 0 // заливка и склейка не должны залезть в поле

  const comps = labelComponents(mask, w, h, 1)
  const x0 = new Int32Array(comps.count + 1).fill(w), y0 = new Int32Array(comps.count + 1).fill(h), x1 = new Int32Array(comps.count + 1).fill(-1), y1 = new Int32Array(comps.count + 1).fill(-1)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const l = comps.labels[j * w + i]
    if (!l) continue
    if (i < x0[l]) x0[l] = i; if (i > x1[l]) x1[l] = i; if (j < y0[l]) y0[l] = j; if (j > y1[l]) y1[l] = j
  }
  const labels = new Int32Array(w * h)
  const silhouettes: Silhouette[] = []
  const map = new Int32Array(comps.count + 1)
  for (let l = 1; l <= comps.count; l++) {
    const wm = (x1[l] - x0[l] + 1) / s, hm = (y1[l] - y0[l] + 1) / s
    if (wm < p.minSize || hm < p.minSize || comps.sizes[l] / (s * s) < p.minArea) continue
    const id = silhouettes.length + 1
    map[l] = id
    silhouettes.push({ id, areaMm2: comps.sizes[l] / (s * s), widthMm: wm, heightMm: hm, bbox: [x0[l], y0[l], x1[l], y1[l]] })
  }
  for (let k = 0; k < labels.length; k++) labels[k] = map[comps.labels[k]] ?? 0
  return { width: w, height: h, scale: s, labels, silhouettes, sensitivity, defaultSensitivity }
}
