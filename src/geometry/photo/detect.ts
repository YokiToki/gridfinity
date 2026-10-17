import type { ColorImage } from '../../features/keychain/decodeImage'
import { close } from '../raster/morphology'
import { fillHoles, labelComponents } from '../raster/components'
import { otsu } from '../raster/threshold'
import { checkQuad, type Pt } from './homography'

export interface PaperDetection {
  /** Углы листа в пикселях снимка: левый верхний, правый верхний, правый нижний, левый нижний. */
  corners: Pt[]
  /** 0…1: насколько область листа заполняет найденный четырёхугольник (у ровного листа около 1). */
  confidence: number
}

/** Рабочий размер поиска: длинная сторона копии, пиксели. */
export const DETECT_SIDE = 480
/** Лист должен занимать не меньше этой доли кадра. */
export const MIN_SHEET_AREA = 0.15
/** Достоверность ниже этой — четырёхугольник не принимается. */
const MIN_CONFIDENCE = 0.8

/** Уменьшение усреднением блоков: яркость V, насыщенность S (HSV) каждого пикселя копии. */
function reduce(img: ColorImage, side: number) {
  const k = Math.min(1, side / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k))
  const v = new Uint8Array(w * h), sat = new Uint8Array(w * h)
  for (let j = 0; j < h; j++) {
    const y0 = Math.floor((j * img.height) / h), y1 = Math.max(y0 + 1, Math.floor(((j + 1) * img.height) / h))
    for (let i = 0; i < w; i++) {
      const x0 = Math.floor((i * img.width) / w), x1 = Math.max(x0 + 1, Math.floor(((i + 1) * img.width) / w))
      let r = 0, g = 0, b = 0, c = 0
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const o = (y * img.width + x) * 3; r += img.rgb[o]; g += img.rgb[o + 1]; b += img.rgb[o + 2]; c++ }
      r /= c; g /= c; b /= c
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
      v[j * w + i] = Math.round(mx)
      sat[j * w + i] = mx > 0 ? Math.round((255 * (mx - mn)) / mx) : 0
    }
  }
  return { w, h, v, sat, k }
}

const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

/** Выпуклая оболочка (цепочка Эндрю), против часовой стрелки в обычной системе, для проверки порядка важна лишь замкнутость. */
export function convexHull(pts: Pt[]): Pt[] {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return p
  const lower: Pt[] = [], upper: Pt[] = []
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q) }
  for (const q of p.slice().reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q) }
  lower.pop(); upper.pop()
  return lower.concat(upper)
}

const polyArea = (p: Pt[]) => Math.abs(p.reduce((a, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return a + (x * y2 - x2 * y) / 2 }, 0))

/** Упрощение выпуклой оболочки до небольшого числа вершин (Дуглас–Пекер по замкнутой петле), чтобы перебор четвёрок был дешёвым. */
function simplifyHull(h: Pt[], max = 14): Pt[] {
  if (h.length <= max) return h
  const diag = Math.hypot(Math.max(...h.map((p) => p[0])) - Math.min(...h.map((p) => p[0])), Math.max(...h.map((p) => p[1])) - Math.min(...h.map((p) => p[1])))
  let eps = diag * 0.002
  let cur = h
  while (cur.length > max) {
    const dist = (p: Pt, a: Pt, b: Pt) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return l === 0 ? Math.hypot(p[0] - a[0], p[1] - a[1]) : Math.abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / l }
    const rdp = (pts: Pt[]): Pt[] => {
      if (pts.length < 3) return pts
      let idx = 0, dm = 0
      for (let i = 1; i < pts.length - 1; i++) { const d = dist(pts[i], pts[0], pts[pts.length - 1]); if (d > dm) { dm = d; idx = i } }
      return dm <= eps ? [pts[0], pts[pts.length - 1]] : [...rdp(pts.slice(0, idx + 1)).slice(0, -1), ...rdp(pts.slice(idx))]
    }
    const half = Math.floor(h.length / 2)
    cur = [...rdp(h.slice(0, half + 1)).slice(0, -1), ...rdp([...h.slice(half), h[0]]).slice(0, -1)]
    eps *= 1.6
  }
  return cur
}

/** Четыре вершины выпуклой оболочки, образующие четырёхугольник наибольшей площади (в порядке обхода оболочки). */
export function bestQuad(hull: Pt[]): Pt[] {
  const h = simplifyHull(hull)
  if (h.length <= 4) return h
  let best: Pt[] = h.slice(0, 4), area = -1
  const n = h.length
  for (let a = 0; a < n - 3; a++) for (let b = a + 1; b < n - 2; b++) for (let c = b + 1; c < n - 1; c++) for (let d = c + 1; d < n; d++) {
    const q = [h[a], h[b], h[c], h[d]], ar = polyArea(q)
    if (ar > area) { area = ar; best = q }
  }
  return best
}

/** Прямая по точкам (метод наименьших квадратов через главную ось) с одним проходом отбраковки выбросов: точка и направление. */
function fitLine(pts: Pt[]): { p: Pt; d: Pt } | null {
  const run = (a: Pt[]) => {
    const n = a.length
    if (n < 2) return null
    const cx = a.reduce((s, q) => s + q[0], 0) / n, cy = a.reduce((s, q) => s + q[1], 0) / n
    let sxx = 0, sxy = 0, syy = 0
    for (const [x, y] of a) { const dx = x - cx, dy = y - cy; sxx += dx * dx; sxy += dx * dy; syy += dy * dy }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy)
    return { p: [cx, cy] as Pt, d: [Math.cos(ang), Math.sin(ang)] as Pt }
  }
  let l = run(pts)
  if (!l) return null
  const res = pts.map((q) => Math.abs((q[0] - l!.p[0]) * l!.d[1] - (q[1] - l!.p[1]) * l!.d[0]))
  const med = res.slice().sort((a, b) => a - b)[Math.floor(res.length / 2)]
  const keep = pts.filter((_, i) => res[i] <= Math.max(2 * med, 0.75))
  if (keep.length >= 2 && keep.length < pts.length) l = run(keep) ?? l
  return l
}

const intersect = (a: { p: Pt; d: Pt }, b: { p: Pt; d: Pt }): Pt | null => {
  const det = a.d[0] * b.d[1] - a.d[1] * b.d[0]
  if (Math.abs(det) < 1e-6) return null
  const t = ((b.p[0] - a.p[0]) * b.d[1] - (b.p[1] - a.p[1]) * b.d[0]) / det
  return [a.p[0] + t * a.d[0], a.p[1] + t * a.d[1]]
}

/** Углы по часовой стрелке (в системе с осью y вниз), начиная с левого верхнего (наименьшая сумма x + y). */
export function orderClockwise(q: Pt[]): Pt[] {
  const cx = q.reduce((s, p) => s + p[0], 0) / q.length, cy = q.reduce((s, p) => s + p[1], 0) / q.length
  const sorted = q.slice().sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx))
  let start = 0
  for (let i = 1; i < 4; i++) if (sorted[i][0] + sorted[i][1] < sorted[start][0] + sorted[start][1]) start = i
  return [0, 1, 2, 3].map((i) => sorted[(start + i) % 4])
}

/**
 * Автоматический поиск листа: светлая и почти бесцветная область (лист) на более тёмном или более цветном фоне (стол).
 * Маска «светлое и бесцветное» по порогам Оцу яркости и насыщенности → крупнейшая связная область с заливкой дырок (предметы
 * на листе) → выпуклая оболочка → лучшие четыре вершины → уточнение каждого угла пересечением прямых, проведённых по границе
 * области вдоль сторон. null — лист не найден (однотонный стол, слишком мало, не четырёхугольник).
 */
export function detectPaper(img: ColorImage): PaperDetection | null {
  const { w, h, v, sat, k } = reduce(img, DETECT_SIDE)
  if (w < 16 || h < 16) return null
  const tv = otsu(v), ts = otsu(sat)
  // нужна настоящая двухмодальность: разброс яркости и насыщенности должен быть заметным, иначе лист от фона не отделить
  const spread = (a: Uint8Array) => { let lo = 255, hi = 0; for (let i = 0; i < a.length; i += 7) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]) } return hi - lo }
  if (spread(v) < 40 && spread(sat) < 40) return null
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < mask.length; i++) mask[i] = v[i] > tv && sat[i] <= Math.max(ts, 30) ? 1 : 0
  const closed = close(mask, w, h, 2)
  const comps = labelComponents(closed, w, h, 1)
  if (comps.count === 0) return null
  let big = 1
  for (let l = 2; l <= comps.count; l++) if (comps.sizes[l] > comps.sizes[big]) big = l
  const only = new Uint8Array(w * h)
  for (let i = 0; i < only.length; i++) only[i] = comps.labels[i] === big ? 1 : 0
  const filled = fillHoles(only, w, h).mask
  let area = 0
  for (let i = 0; i < filled.length; i++) area += filled[i]
  if (area < MIN_SHEET_AREA * w * h) return null

  const boundary: Pt[] = []
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!filled[j * w + i]) continue
    if (i === 0 || j === 0 || i === w - 1 || j === h - 1 || !filled[j * w + i - 1] || !filled[j * w + i + 1] || !filled[(j - 1) * w + i] || !filled[(j + 1) * w + i]) boundary.push([i + 0.5, j + 0.5])
  }
  // лист, упирающийся в края кадра со всех сторон, — это не лист на столе, а однотонный светлый кадр (белый стол, засветка)
  const onBorder = boundary.filter(([x, y]) => x < 1 || y < 1 || x > w - 1 || y > h - 1).length
  if (onBorder > 0.35 * boundary.length) return null
  const quad0 = orderClockwise(bestQuad(convexHull(boundary)))
  if (quad0.length !== 4) return null

  // уточнение: прямая по граничным точкам вдоль каждой стороны (без 15 % у углов), соседние прямые пересекаются в угол
  const lines = [0, 1, 2, 3].map((s) => {
    const a = quad0[s], b = quad0[(s + 1) % 4]
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy)
    const pts = boundary.filter((q) => {
      const t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (len * len)
      const dist = Math.abs((q[0] - a[0]) * dy - (q[1] - a[1]) * dx) / len
      return t > 0.15 && t < 0.85 && dist < Math.max(4, 0.03 * Math.max(w, h))
    })
    return fitLine(pts)
  })
  const corners0 = [0, 1, 2, 3].map((i) => (lines[(i + 3) % 4] && lines[i] ? intersect(lines[(i + 3) % 4]!, lines[i]!) : null) ?? quad0[i])
  const corners = corners0.map((c) => [c[0] / k, c[1] / k] as Pt)
  const maxX = img.width, maxY = img.height
  const clamped = corners.map((c) => [Math.min(maxX, Math.max(0, c[0])), Math.min(maxY, Math.max(0, c[1]))] as Pt)
  if (checkQuad(clamped, 12) !== 'ok') return null
  const quadArea = polyArea(clamped.map((c) => [c[0] * k, c[1] * k] as Pt))
  if (quadArea < MIN_SHEET_AREA * w * h * 0.9) return null
  const confidence = Math.min(1, area / quadArea)
  return confidence >= MIN_CONFIDENCE ? { corners: clamped, confidence } : null
}
