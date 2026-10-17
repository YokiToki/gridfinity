import { gaussianBlur } from '../raster/blur'
import { dilate } from '../raster/morphology'

/** Квадратичная поверхность a + bx + cy + dx² + exy + fy² по пикселям с excluded = 0 (метод наименьших квадратов). */
export function fitSurface(get: (k: number) => number, w: number, h: number, excluded: Uint8Array, fallback: number): Float32Array {
  const nx = (i: number) => (i / (w - 1)) * 2 - 1, ny = (j: number) => (j / (h - 1)) * 2 - 1
  const step = Math.max(1, Math.round(Math.sqrt((w * h) / 60000)))
  const ata = Array.from({ length: 6 }, () => new Array<number>(6).fill(0)), atb = new Array<number>(6).fill(0)
  let n = 0
  for (let j = 0; j < h; j += step) for (let i = 0; i < w; i += step) {
    const k = j * w + i
    if (excluded[k]) continue
    const x = nx(i), y = ny(j), f = [1, x, y, x * x, x * y, y * y], v = get(k)
    for (let r = 0; r < 6; r++) { atb[r] += f[r] * v; for (let c = r; c < 6; c++) ata[r][c] += f[r] * f[c] }
    n++
  }
  for (let r = 0; r < 6; r++) for (let c = 0; c < r; c++) ata[r][c] = ata[c][r]
  let coef = [fallback, 0, 0, 0, 0, 0]
  if (n >= 12) {
    // метод Гаусса с выбором главного элемента
    const a = ata.map((row) => row.slice()), b = atb.slice()
    let ok = true
    for (let c = 0; c < 6 && ok; c++) {
      let p = c
      for (let r = c + 1; r < 6; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r
      if (Math.abs(a[p][c]) < 1e-12) { ok = false; break }
      ;[a[c], a[p]] = [a[p], a[c]]; [b[c], b[p]] = [b[p], b[c]]
      for (let r = c + 1; r < 6; r++) { const q = a[r][c] / a[c][c]; for (let k = c; k < 6; k++) a[r][k] -= q * a[c][k]; b[r] -= q * b[c] }
    }
    if (ok) {
      const x = new Array<number>(6).fill(0)
      for (let r = 5; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < 6; k++) s -= a[r][k] * x[k]; x[r] = s / a[r][r] }
      coef = x
    }
  }
  const out = new Float32Array(w * h)
  const [c0, c1, c2, c3, c4, c5] = coef
  for (let j = 0; j < h; j++) {
    const y = ny(j), rowConst = c0 + c2 * y + c5 * y * y
    for (let i = 0; i < w; i++) { const x = nx(i); out[j * w + i] = Math.max(1, rowConst + x * (c1 + c4 * y) + c3 * x * x) }
  }
  return out
}

/** Медиана выборки (копия сортируется); пусто — запасное значение. */
const median = (a: number[], fallback: number) => { if (!a.length) return fallback; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }

/**
 * Цвет чистого листа в каждой точке: по поверхности на канал (sg — поверхность яркости листа, `paperSurface`). Предметы исключаются из подгонки по яркости (как у серого листа),
 * по цветности (цветной предмет заметно отличается долями R, G, B от листа) и затем по результату подгонки.
 */
export function paperSurfaceRGB(rgb: Uint8Array, gray: Uint8Array, w: number, h: number, edge: Uint8Array, sg: Float32Array): [Float32Array, Float32Array, Float32Array] {
  const n = w * h
  // цветность листа: доли каналов по светлым пикселям вне поля
  const step = Math.max(1, Math.round(Math.sqrt(n / 40000)))
  const cr: number[] = [], cg: number[] = []
  for (let j = 0; j < h; j += step) for (let i = 0; i < w; i += step) {
    const k = j * w + i
    if (edge[k] || gray[k] < 0.9 * sg[k]) continue
    const s = rgb[k * 3] + rgb[k * 3 + 1] + rgb[k * 3 + 2] + 1
    cr.push(rgb[k * 3] / s); cg.push(rgb[k * 3 + 1] / s)
  }
  const mcr = median(cr, 1 / 3), mcg = median(cg, 1 / 3)
  const excluded = new Uint8Array(n)
  for (let k = 0; k < n; k++) {
    if (edge[k] || gray[k] < 0.88 * sg[k]) { excluded[k] = 1; continue }
    const s = rgb[k * 3] + rgb[k * 3 + 1] + rgb[k * 3 + 2] + 1
    excluded[k] = Math.abs(rgb[k * 3] / s - mcr) > 0.04 || Math.abs(rgb[k * 3 + 1] / s - mcg) > 0.04 ? 1 : 0
  }
  const fit = (ex: Uint8Array) => [0, 1, 2].map((c) => fitSurface((k) => rgb[k * 3 + c], w, h, ex, 200)) as [Float32Array, Float32Array, Float32Array]
  let surf = fit(excluded)
  // второй проход: по результату подгонки (тёмное или цветное относительно листа)
  for (let k = 0; k < n; k++) {
    if (edge[k]) { excluded[k] = 1; continue }
    const a = rgb[k * 3] / surf[0][k], b = rgb[k * 3 + 1] / surf[1][k], c = rgb[k * 3 + 2] / surf[2][k], m = (a + b + c) / 3
    excluded[k] = 1 - m > 0.1 || Math.max(Math.abs(a - m), Math.abs(b - m), Math.abs(c - m)) > 0.07 ? 1 : 0
  }
  surf = fit(excluded)
  return surf
}

export interface ColourParams {
  /** Чувствительность 0…1 (как у серой): чем выше, тем меньше цветовое и яркостное отличие считается предметом. */
  sensitivity: number
  /** Порог падения яркости чувствительности (dropFor). */
  drop: number
  /** Наибольшая крутизна «плавного» перехода, 1/мм: тень переходит в бумагу плавнее, край предмета резче. 0 — тени не отсекаются. */
  softEdge: number
  /** Пикселей на мм растра листа. */
  scale: number
}

/** Порог отклонения цвета от «цвета листа, умноженного на число»: от 0.18 (чувствительность 0) до 0.06 (1). */
export const colourDeviation = (sensitivity: number) => 0.18 - 0.12 * Math.min(1, Math.max(0, sensitivity))
/** Наименьшее падение яркости у цветного пикселя: меньше — шум листа. */
const MIN_DROP = 0.03
/** Лист для затравки области тени: почти как чистый лист. */
const PAPER_DROP = 0.1, PAPER_KAPPA = 0.08
/** Сглаживание перед вычислением крутизны, мм (шум JPEG и зернистость бумаги не должны казаться краем). */
const SMOOTH_MM = 0.75
/** Мелкий масштаб для «стен»: тонкие тёмные линии и резкие края предмета (у тени такой крутизны нет), мм. */
const FINE_MM = 0.3
/** Тень не бывает темнее: чёрные и тёмные части предмета (падение яркости выше) в область тени не входят. */
export const SHADOW_MAX_DROP = 0.8
/** Тень почти бесцветна: отклонение цвета от «листа, умноженного на число» выше — это цветная часть предмета. */
const SHADOW_MAX_KAPPA = 0.12
/** Рост от листа идёт только в сторону потемнения: поднятие яркости на шаге больше этого — граница предмета, а не тень. */
const SHADOW_RISE = 0.015

/**
 * Область тени: пиксели, достижимые от чистого листа по плавным участкам (крутизна не выше softEdge). Мягкая тень — продолжение
 * листа без резкого края, а у предмета на границе резкий скачок яркости или цвета (крутизну считаем по всем каналам относительно листа),
 * поэтому рост от листа останавливается у предмета. Возвращает маску области и (для отладки) крутизну.
 */
/** Сглаженные каналы листа и крутизна (норма градиента по трём каналам, 1/мм). */
export function smoothAndSteep(nr: Float32Array, ng: Float32Array, nb: Float32Array, w: number, h: number, scale: number, sigmaMm = SMOOTH_MM) {
  const n = w * h
  const sigma = Math.max(0.5, sigmaMm * scale)
  const all = new Uint8Array(n).fill(1)
  const sr = gaussianBlur(nr, w, h, sigma, all), sg = gaussianBlur(ng, w, h, sigma, all), sb = gaussianBlur(nb, w, h, sigma, all)
  const steep = new Float32Array(n)
  const k = scale / 2
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const c = j * w + i
    let s = 0
    for (const a of [sr, sg, sb]) { const gx = (a[c + 1] - a[c - 1]) * k, gy = (a[c + w] - a[c - w]) * k; s += gx * gx + gy * gy }
    steep[c] = Math.sqrt(s)
  }
  return { sr, sg, sb, steep }
}

export function shadowRegion(nr: Float32Array, ng: Float32Array, nb: Float32Array, w: number, h: number, edge: Uint8Array, p: { softEdge: number; scale: number }): Uint8Array<ArrayBuffer> {
  const n = w * h
  const { sr, sg, sb } = smoothAndSteep(nr, ng, nb, w, h, p.scale)
  // стены: резкие края и тонкие линии предмета на мелком масштабе; растут на пиксель, чтобы диагональные линии не пропускали рост
  const fine = smoothAndSteep(nr, ng, nb, w, h, p.scale, FINE_MM).steep
  const wall = new Uint8Array(n)
  for (let c = 0; c < n; c++) if (fine[c] > p.softEdge) wall[c] = 1
  const walls = dilate(wall, w, h, 1)
  const region = new Uint8Array(n)
  const queue = new Int32Array(n)
  let head = 0, tail = 0
  for (let c = 0; c < n; c++) {
    const m = (sr[c] + sg[c] + sb[c]) / 3
    if (edge[c] || 1 - m > PAPER_DROP || Math.max(Math.abs(sr[c] - m), Math.abs(sg[c] - m), Math.abs(sb[c] - m)) > PAPER_KAPPA) continue
    region[c] = 1; queue[tail++] = c
  }
  while (head < tail) {
    const c = queue[head++], x = c % w
    for (const d of [-1, 1, -w, w]) {
      if ((d === -1 && x === 0) || (d === 1 && x === w - 1)) continue
      const q = c + d
      if (q < 0 || q >= n || region[q] || walls[q]) continue
      const mq = (sr[q] + sg[q] + sb[q]) / 3, mc = (sr[c] + sg[c] + sb[c]) / 3
      if (1 - mq > SHADOW_MAX_DROP || mq > mc + SHADOW_RISE) continue // темнее тени допустимого или светлее соседа в сторону от листа
      if (Math.max(Math.abs(sr[q] - mq), Math.abs(sg[q] - mq), Math.abs(sb[q] - mq)) > SHADOW_MAX_KAPPA) continue // цветной
      region[q] = 1; queue[tail++] = q
    }
  }
  return region
}

/**
 * Маска предметов по цвету: пиксель — кандидат, если его цвет заметно отличается от цвета листа (тень на листе его не меняет: она
 * умножает все каналы почти на одно число) или он темнее порога чувствительности; из кандидатов убирается область тени (мягкое
 * продолжение листа). Поле по краю листа исключено.
 */
export function colourMask(rgb: Uint8Array, gray: Uint8Array, w: number, h: number, edge: Uint8Array, p: ColourParams, grayPaper: Float32Array): Uint8Array<ArrayBuffer> {
  const [sr, sg, sb] = paperSurfaceRGB(rgb, gray, w, h, edge, grayPaper)
  const n = w * h
  const nr = new Float32Array(n), ng = new Float32Array(n), nb = new Float32Array(n)
  const kappa0 = colourDeviation(p.sensitivity)
  const mask = new Uint8Array(n)
  for (let k = 0; k < n; k++) {
    nr[k] = rgb[k * 3] / sr[k]; ng[k] = rgb[k * 3 + 1] / sg[k]; nb[k] = rgb[k * 3 + 2] / sb[k]
    if (edge[k]) continue
    const m = (nr[k] + ng[k] + nb[k]) / 3, d = 1 - m
    if (d > p.drop || (d > MIN_DROP && Math.max(Math.abs(nr[k] - m), Math.abs(ng[k] - m), Math.abs(nb[k] - m)) > kappa0)) mask[k] = 1
  }
  if (p.softEdge > 0) {
    const shadow = shadowRegion(nr, ng, nb, w, h, edge, p)
    for (let k = 0; k < n; k++) if (shadow[k]) mask[k] = 0
  }
  return mask
}
