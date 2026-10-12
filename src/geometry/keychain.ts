import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d'
import { getWasm } from './wasm'
import { roundedRectCS } from './bin'
import { dropCollinear, maskLoops, type Pt } from './art/trace'
import { fillHoles, findHoles, removeSpecks, type Hole } from './raster/components'
import { edt } from './raster/edt'
import { close, dilate, erode } from './raster/morphology'
import { maskBounds, resampleGray, resampleMask } from './raster/resample'
import { midtoneShare, otsu, toMask, type GrayImage } from './raster/threshold'
import { profileValue, type ProfileParams } from './patterns/profile'
import { coverage, type PatternParams } from './patterns/fields'
import { skeleton } from './raster/thin'

// ---------- параметры ----------

export interface SilhouetteParams {
  /** Порог яркости 0…255 или 'auto' (Оцу). */
  threshold: number | 'auto'
  invert: boolean
  /** Радиус смыкания щелей, пиксели картинки. */
  close: number
  /** Заливать дырки (кроме перечисленных в keepOpen). */
  fillHoles: boolean
  /** id дырок, которые остаются открытыми. */
  keepOpen: number[]
  /** Пятна материала меньше этого числа пикселей удаляются. */
  speck: number
  /** Расширение (>0) или сужение (<0) силуэта, пиксели картинки. */
  grow: number
}

export type SizeMode = 'longest' | 'width' | 'height' | 'box'
export interface SizeParams { mode: SizeMode; longest: number; width: number; height: number }

/** Что задаёт высоту рельефа: расстояние от кромки силуэта или яркость изображения внутри него. */
export type HeightSource = 'distance' | 'brightness'
export interface SourceParams {
  kind: HeightSource
  /** Контраст яркости (1 — без изменений). */
  contrast: number
  /** Гамма яркости (1 — без изменений). */
  gamma: number
  /** Светлое ниже, тёмное выше. */
  invert: boolean
}

export interface ReliefParams extends ProfileParams {
  /** Высота плато рельефа над подложкой, мм. */
  hmax: number
  /** Ширина скоса от кромки до плато, мм. */
  edgeWidth: number
  /** Минимальная высота рельефа у кромки, мм. */
  heightFloor: number
}

/** Хребет вдоль срединной оси и канавка у кромки (порт spine/groove из 02_heightfield.py, в миллиметрах). */
export interface DetailParams {
  /** Высота хребта над плато, мм (0 — выключен). */
  spineAmp: number
  /** Ширина хребта (σ гауссианы), мм. */
  spineWidth: number
  /** Глубина канавки, мм (0 — выключена). */
  grooveDepth: number
  /** Ширина канавки, мм. */
  grooveWidth: number
  /** Расстояние оси канавки от кромки, мм. */
  grooveOffset: number
}

export type PlateShape = 'silhouette' | 'rect' | 'rounded' | 'circle'
export interface BaseParams {
  /** Толщина подложки, мм; 0 — только рельеф. */
  thickness: number
  shape: PlateShape
  /** Для «по силуэту»: на сколько подложка шире силуэта, мм. */
  offset: number
  /** Поле вокруг силуэта для прямоугольника и круга при автоматическом размере, мм. */
  margin: number
  /** Радиус скругления для «скруглённого прямоугольника», мм. */
  radius: number
  /** true — размер подложки по габариту силуэта плюс поле; false — задан width × height (у круга width — диаметр). */
  auto: boolean
  width: number
  height: number
}

export interface QualityParams {
  /** Желаемый шаг сетки рельефа, мм. */
  cell: number
  /** Бюджет треугольников: при превышении шаг увеличивается. */
  maxTriangles: number
}

export interface KeychainParams {
  /** Изображение лежит вне параметров (в IndexedDB и в воркере), параметры ссылаются на него по id. */
  imageId: string
  silhouette: SilhouetteParams
  size: SizeParams
  source: SourceParams
  relief: ReliefParams
  detail: DetailParams
  pattern: PatternParams
  base: BaseParams
  quality: QualityParams
}

export const defaultSource: SourceParams = { kind: 'distance', contrast: 1, gamma: 1, invert: false }
export const defaultDetail: DetailParams = { spineAmp: 0, spineWidth: 0.55, grooveDepth: 0, grooveWidth: 0.6, grooveOffset: 1.5 }
export const defaultPattern: PatternParams = { kind: 'none', pitch: 1.5, width: 0.5, depth: 0.3, angle: 45, offset: 0, staggered: true, scope: 'relief' }

export const defaultKeychain: KeychainParams = {
  imageId: '',
  silhouette: { threshold: 'auto', invert: false, close: 3, fillHoles: true, keepOpen: [], speck: 200, grow: 2 },
  size: { mode: 'longest', longest: 70, width: 70, height: 70 },
  source: defaultSource,
  relief: { hmax: 2, edgeWidth: 6, pow: 0.65, heightFloor: 0.06, profile: 'bevel', steps: 3 },
  detail: defaultDetail,
  pattern: defaultPattern,
  base: { thickness: 2, shape: 'silhouette', offset: 0, margin: 3, radius: 4, auto: true, width: 80, height: 60 },
  quality: { cell: 0.25, maxTriangles: 400_000 },
}

// ---------- проверка параметров ----------

export interface KeychainError { field: string; key: string }

/** Проверка параметров, не зависящая от картинки (размер подложки относительно силуэта проверяется при построении). */
export function validateKeychain(p: KeychainParams): { ok: boolean; errors: KeychainError[] } {
  const errors: KeychainError[] = []
  const bad = (field: string, key: string) => errors.push({ field, key })
  const pos = (v: number) => Number.isFinite(v) && v > 0
  const nonneg = (v: number) => Number.isFinite(v) && v >= 0
  const sz = p.size
  if (sz.mode === 'longest' && !pos(sz.longest)) bad('size.longest', 'keychain.error.size')
  if ((sz.mode === 'width' || sz.mode === 'box') && !pos(sz.width)) bad('size.width', 'keychain.error.size')
  if ((sz.mode === 'height' || sz.mode === 'box') && !pos(sz.height)) bad('size.height', 'keychain.error.size')
  const r = p.relief
  if (!pos(r.hmax)) bad('relief.hmax', 'keychain.error.hmax')
  if (!pos(r.edgeWidth)) bad('relief.edgeWidth', 'keychain.error.edgeWidth')
  if (!pos(r.pow)) bad('relief.pow', 'keychain.error.pow')
  if (!Number.isFinite(r.heightFloor) || r.heightFloor < 0) bad('relief.heightFloor', 'keychain.error.negative')
  else if (r.heightFloor >= r.hmax) bad('relief.heightFloor', 'keychain.error.heightFloor')
  if (r.profile === 'terrace' && !(Number.isInteger(r.steps) && r.steps >= 2)) bad('relief.steps', 'keychain.error.steps')
  const so = p.source
  if (so.kind === 'brightness') {
    if (!pos(so.contrast)) bad('source.contrast', 'keychain.error.contrast')
    if (!pos(so.gamma)) bad('source.gamma', 'keychain.error.gamma')
  }
  const d = p.detail
  if (!nonneg(d.spineAmp)) bad('detail.spineAmp', 'keychain.error.negative')
  else if (d.spineAmp > 0 && !pos(d.spineWidth)) bad('detail.spineWidth', 'keychain.error.size')
  if (!nonneg(d.grooveDepth)) bad('detail.grooveDepth', 'keychain.error.negative')
  else if (d.grooveDepth > 0 && !(pos(d.grooveWidth) && nonneg(d.grooveOffset))) bad('detail.grooveWidth', 'keychain.error.size')
  const t = p.pattern
  if (t.kind !== 'none') {
    if (!nonneg(t.depth)) bad('pattern.depth', 'keychain.error.negative')
    if (!pos(t.pitch)) bad('pattern.pitch', 'keychain.error.size')
    else if (!pos(t.width) || t.width >= t.pitch) bad('pattern.width', 'keychain.error.patternPitch')
    if (!Number.isFinite(t.angle) || !Number.isFinite(t.offset)) bad('pattern.angle', 'keychain.error.size')
  }
  const b = p.base
  if (!Number.isFinite(b.thickness) || b.thickness < 0) bad('base.thickness', 'keychain.error.negative')
  if (!Number.isFinite(b.offset) || b.offset < 0) bad('base.offset', 'keychain.error.negative')
  if (!Number.isFinite(b.margin) || b.margin < 0) bad('base.margin', 'keychain.error.negative')
  if (!Number.isFinite(b.radius) || b.radius < 0) bad('base.radius', 'keychain.error.negative')
  if (!b.auto && (b.shape === 'rect' || b.shape === 'rounded') && !(pos(b.width) && pos(b.height))) bad('base.width', 'keychain.error.size')
  if (!b.auto && b.shape === 'circle' && !pos(b.width)) bad('base.width', 'keychain.error.size')
  if (b.thickness <= 0 && r.profile === 'engraved') bad('base.thickness', 'keychain.error.engraveNoPlate')
  if (b.thickness <= 0 && t.kind !== 'none' && t.scope === 'base') bad('pattern.scope', 'keychain.error.scopeNoPlate')
  const q = p.quality
  if (!(Number.isFinite(q.cell) && q.cell >= 0.02 && q.cell <= 5)) bad('quality.cell', 'keychain.error.cell')
  if (!(Number.isFinite(q.maxTriangles) && q.maxTriangles >= 10_000)) bad('quality.maxTriangles', 'keychain.error.budget')
  return { ok: errors.length === 0, errors }
}

// ---------- силуэт ----------

export interface SilhouetteResult {
  /** Итоговая маска материала в разрешении картинки. */
  mask: Uint8Array
  threshold: number
  /** Дырки смыкнутой маски (до заливки): id стабильны, пока набор дырок тот же. */
  holes: (Hole & { open: boolean })[]
  /** Метка дырки каждого пикселя смыкнутой маски (0 — не дырка). */
  holeLabels: Int32Array
  /** Доля полутонов: у фотографий велика. */
  photoLike: boolean
}

const PHOTO_SHARE = 0.4

/** Картинка → чистый силуэт: порог → смыкание → заливка дырок → удаление пятен → расширение (как 01_silhouette.py). */
export function buildSilhouette(img: GrayImage, s: SilhouetteParams): SilhouetteResult {
  const { width: w, height: h } = img
  const threshold = s.threshold === 'auto' ? otsu(img.gray) : s.threshold
  const ink = toMask(img, threshold, s.invert)
  const closed = close(ink, w, h, s.close)
  const { holes, labels } = findHoles(closed, w, h)
  const filled = s.fillHoles ? fillHoles(closed, w, h, s.keepOpen).mask : closed
  const clean = removeSpecks(filled, w, h, s.speck)
  const mask = s.grow > 0 ? dilate(clean, w, h, s.grow) : s.grow < 0 ? erode(clean, w, h, -s.grow) : clean
  const holeSet = new Set(holes.map((x) => x.label))
  const holeLabels = new Int32Array(labels.length)
  for (let i = 0; i < labels.length; i++) if (labels[i] && holeSet.has(labels[i])) holeLabels[i] = labels[i]
  return {
    mask, threshold,
    holes: holes.map((x) => ({ ...x, open: s.fillHoles ? s.keepOpen.includes(x.id) : true })),
    holeLabels,
    photoLike: midtoneShare(img.gray) > PHOTO_SHARE,
  }
}

// ---------- предпросмотр маски ----------

/** Значения предпросмотра: 0 фон, 1 материал, 2 открытая дырка, 3 залитая дырка. */
export interface MaskPreview {
  width: number
  height: number
  data: Uint8Array
  /** Дырки с центрами в пикселях предпросмотра. */
  holes: { id: number; size: number; cx: number; cy: number; open: boolean }[]
}

export const PREVIEW_MAX = 256

export function maskPreview(img: GrayImage, sil: SilhouetteResult): MaskPreview | null {
  const b = maskBounds(sil.mask, img.width, img.height)
  if (!b) return null
  const pad = 4
  const x0 = Math.max(0, b[0] - pad), y0 = Math.max(0, b[1] - pad), x1 = Math.min(img.width - 1, b[2] + pad), y1 = Math.min(img.height - 1, b[3] + pad)
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1
  const k = Math.min(1, PREVIEW_MAX / Math.max(cw, ch))
  const pw = Math.max(1, Math.round(cw * k)), ph = Math.max(1, Math.round(ch * k))
  const data = new Uint8Array(pw * ph)
  const openIds = new Set(sil.holes.filter((x) => x.open).map((x) => x.label))
  const holeLabels = new Set(sil.holes.map((x) => x.label))
  for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
    const sx = x0 + Math.min(cw - 1, Math.floor((i + 0.5) / k)), sy = y0 + Math.min(ch - 1, Math.floor((j + 0.5) / k))
    const p = sy * img.width + sx
    const hole = sil.holeLabels[p]
    const inHole = hole !== 0 && holeLabels.has(hole)
    data[j * pw + i] = sil.mask[p] ? (inHole ? 3 : 1) : inHole && openIds.has(hole) ? 2 : 0
  }
  return { width: pw, height: ph, data, holes: sil.holes.map((x) => ({ id: x.id, size: x.size, cx: (x.cx - x0) * k, cy: (x.cy - y0) * k, open: x.open })) }
}

// ---------- рельеф ----------

const smoothstep = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }

/** Высота рельефа над подложкой по расстоянию до кромки, мм: профиль (по умолчанию плато + скос), не ниже heightFloor (как 02_heightfield.py). */
export function reliefHeight(distMm: number, r: ReliefParams): number {
  return Math.max(r.hmax * profileValue(distMm / r.edgeWidth, r), r.heightFloor)
}

/** Яркость пикселя 0…1 → доля высоты 0…1: контраст вокруг середины, гамма, инверсия. */
export function brightnessValue(g: number, s: SourceParams): number {
  const c = Math.min(1, Math.max(0, (g - 0.5) * s.contrast + 0.5)) ** s.gamma
  return s.invert ? 1 - c : c
}

/** Размер силуэта в мм по режиму размера и габариту в пикселях. */
export function sizeMm(s: SizeParams, wPx: number, hPx: number): { w: number; h: number } {
  switch (s.mode) {
    case 'width': { const k = s.width / wPx; return { w: s.width, h: hPx * k } }
    case 'height': { const k = s.height / hPx; return { w: wPx * k, h: s.height } }
    case 'box': return { w: s.width, h: s.height }
    default: { const k = s.longest / Math.max(wPx, hPx); return { w: wPx * k, h: hPx * k } }
  }
}

/** Шаг сетки: желаемый, но не мельче, чем позволяет бюджет треугольников (≈ 4 на ячейку материала); min — предел по бюджету. */
export function effectiveCell(wMm: number, hMm: number, fill: number, q: QualityParams): { cell: number; reduced: boolean; min: number } {
  const need = Math.sqrt((4.4 * wMm * hMm * Math.max(0.05, fill)) / q.maxTriangles)
  return need > q.cell ? { cell: need, reduced: true, min: need } : { cell: q.cell, reduced: false, min: need }
}

/** Разрешение и узор: мелкие детали у шага сетки получаются ступенчатыми. */
export interface PatternResolution { tooFine: boolean; minPitch: number; /** Можно ли уменьшить шаг сетки в пределах бюджета. */ canRaise: boolean; raiseTo: number }
export function patternResolution(p: PatternParams, cell: number, minCell: number): PatternResolution {
  const minPitch = 4 * cell
  const raiseTo = Math.ceil(Math.max(minCell, 0.02) * 100) / 100
  return { tooFine: p.kind !== 'none' && p.pitch < minPitch - 1e-9, minPitch, canRaise: raiseTo < cell - 1e-9, raiseTo }
}

// ---------- подложка: форма ----------

export interface PlateSpec {
  shape: PlateShape
  offset: number
  /** Размер прямоугольной подложки, мм. */
  pw: number
  ph: number
  radius: number
  /** Диаметр круглой подложки, мм. */
  diameter: number
  /** На сколько подложка выступает за габарит силуэта по осям, мм. */
  overX: number
  overY: number
  /** Площадь подложки, мм² (грубо: для оценки бюджета). */
  area: number
}

/** Описание подложки или null (толщина 0); error — ключ ошибки, если фигура меньше силуэта. */
export function plateSpec(b: BaseParams, wMm: number, hMm: number): { spec: PlateSpec | null; error?: string } {
  if (b.thickness <= 0) return { spec: null }
  const diag = Math.hypot(wMm, hMm)
  const base = { shape: b.shape, offset: b.offset, radius: b.radius, pw: wMm, ph: hMm, diameter: diag }
  if (b.shape === 'silhouette') return { spec: { ...base, overX: b.offset, overY: b.offset, area: wMm * hMm * 0.8 + b.offset * 2 * (wMm + hMm) } }
  if (b.shape === 'circle') {
    const d = b.auto ? diag + 2 * b.margin : b.width
    if (d < diag - 1e-6) return { spec: null, error: 'keychain.error.plateTooSmall' }
    return { spec: { ...base, diameter: d, overX: (d - wMm) / 2, overY: (d - hMm) / 2, area: (Math.PI * d * d) / 4 } }
  }
  const pw = b.auto ? wMm + 2 * b.margin : b.width, ph = b.auto ? hMm + 2 * b.margin : b.height
  if (pw < wMm - 1e-6 || ph < hMm - 1e-6) return { spec: null, error: 'keychain.error.plateTooSmall' }
  return { spec: { ...base, pw, ph, overX: (pw - wMm) / 2, overY: (ph - hMm) / 2, area: pw * ph } }
}

/** Лежит ли точка (x, y) подложки; distOut — расстояние от точки до силуэта, мм (только для «по силуэту»). */
function plateInside(s: PlateSpec, x: number, y: number, distOut: number): boolean {
  switch (s.shape) {
    case 'silhouette': return distOut <= s.offset
    case 'circle': return Math.hypot(x, y) <= s.diameter / 2
    case 'rect': return Math.abs(x) <= s.pw / 2 && Math.abs(y) <= s.ph / 2
    default: {
      const r = Math.min(s.radius, Math.min(s.pw, s.ph) / 2)
      const qx = Math.abs(x) - (s.pw / 2 - r), qy = Math.abs(y) - (s.ph / 2 - r)
      return Math.abs(x) <= s.pw / 2 && Math.abs(y) <= s.ph / 2 && Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) <= r
    }
  }
}

// ---------- сетка рельефа ----------

export interface Grid {
  nx: number
  ny: number
  /** Шаг по осям, мм (по X и Y отличаются на доли процента, чтобы габарит был ровно заданным). */
  dx: number
  dy: number
  /** Первый узел твёрдых блоков силуэта по осям: от него отсчитываются координаты (тонкие кончики у края габарита выпадают из сетки, габарит считается по настоящим блокам). */
  i0: number
  j0: number
  /** Блоки, из которых строится сетка (между четырьмя узлами материала): 1 — твёрдый. */
  blocks: Uint8Array
  /** Высота верха в узле, мм от плоскости стола (подложка уже включена). */
  top: Float32Array
  /** Блоки только силуэта (для контура подложки по силуэту). */
  silBlocks: Uint8Array
}

export interface GridInput {
  img: GrayImage
  mask: Uint8Array
  bounds: [number, number, number, number]
  wMm: number
  hMm: number
  cell: number
  p: KeychainParams
  plate: PlateSpec | null
  /** Подложка строится в той же сетке (нужно для узора на подложке). */
  plateInGrid: boolean
}

const blocksOf = (m: Uint8Array, nx: number, ny: number) => {
  const b = new Uint8Array((nx - 1) * (ny - 1))
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) b[j * (nx - 1) + i] = m[j * nx + i] && m[j * nx + i + 1] && m[(j + 1) * nx + i] && m[(j + 1) * nx + i + 1] ? 1 : 0
  return b
}

/**
 * Сетка рельефа: маска фигуры → узлы, расстояния до кромки, источник высоты (расстояние или яркость), профиль, хребет и
 * канавка, узор. Габарит блоков силуэта ровно wMm × hMm. Порядок как в design: источник → профиль → детали → узор → нижняя граница.
 */
export function buildGrid(inp: GridInput): Grid {
  const { img, mask, bounds, wMm, hMm, cell, p, plate, plateInGrid } = inp
  const r = p.relief, base = p.base.thickness, floor = r.heightFloor, engraved = r.profile === 'engraved'
  const pad = 2
  const ox = plateInGrid && plate ? Math.ceil(plate.overX / cell) + 1 : 0, oy = plateInGrid && plate ? Math.ceil(plate.overY / cell) + 1 : 0
  const sx = Math.max(3, Math.round(wMm / cell) + 1), sy = Math.max(3, Math.round(hMm / cell) + 1) // узлов по осям у фигуры
  const small = resampleMask(mask, img.width, bounds[0], bounds[1], bounds[2] + 1, bounds[3] + 1, sx, sy)
  const ax = pad + ox, ay = pad + oy
  const nx = sx + 2 * ax, ny = sy + 2 * ay
  const m = new Uint8Array(nx * ny)
  for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) m[(j + ay) * nx + i + ax] = small[j * sx + i]
  const silBlocks = blocksOf(m, nx, ny)

  // габарит по настоящим блокам: шаг подгоняется, чтобы сетка занимала ровно заданный размер
  const bw = nx - 1
  let bi0 = nx, bi1 = -1, bj0 = ny, bj1 = -1
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < bw; i++) if (silBlocks[j * bw + i]) { if (i < bi0) bi0 = i; if (i > bi1) bi1 = i; if (j < bj0) bj0 = j; if (j > bj1) bj1 = j }
  if (bi1 < 0) { bi0 = ax; bi1 = nx - ax - 2; bj0 = ay; bj1 = ny - ay - 2 }
  const dx = wMm / (bi1 + 1 - bi0), dy = hMm / (bj1 + 1 - bj0)
  const X = (i: number) => (i - bi0) * dx - wMm / 2
  const Y = (j: number) => hMm / 2 - (j - bj0) * dy

  const d = edt(m, nx, ny)
  const inv = (a: Uint8Array) => { const o = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] ? 0 : 1; return o }
  const spine = p.detail.spineAmp > 0 ? edt(inv(skeleton(m, nx, ny)), nx, ny) : null
  const gray = p.source.kind === 'brightness' ? new Float32Array(nx * ny) : null
  if (gray) {
    const g = resampleGray(img.gray, img.width, bounds[0], bounds[1], bounds[2] + 1, bounds[3] + 1, sx, sy)
    for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) gray[(j + ay) * nx + i + ax] = g[j * sx + i]
  }
  const dOut = plateInGrid && plate?.shape === 'silhouette' ? edt(inv(m), nx, ny) : null
  const bevel: ReliefParams = { ...r, profile: 'bevel' }
  const pat = p.pattern, patOn = pat.kind !== 'none' && pat.depth > 0
  const top = new Float32Array(nx * ny)
  const meshMask = plateInGrid ? new Uint8Array(m) : m

  for (let k = 0; k < top.length; k++) {
    const i = k % nx, j = (k - i) / nx
    if (m[k]) {
      const dmm = d[k] * cell
      const pv = profileValue(dmm / r.edgeWidth, r)
      // источник высоты: расстояние до кромки или яркость (с защитой кромки профилем скоса)
      let h = gray ? Math.min(floor + brightnessValue(gray[k], p.source) * (r.hmax - floor), reliefHeight(dmm, bevel)) : reliefHeight(dmm, r)
      if (spine) h += p.detail.spineAmp * pv * Math.exp(-((spine[k] * cell) ** 2) / (2 * p.detail.spineWidth ** 2))
      if (p.detail.grooveDepth > 0 && Math.abs(dmm - p.detail.grooveOffset) <= p.detail.grooveWidth / 2) h = Math.max(h - p.detail.grooveDepth, floor)
      let t = engraved ? Math.max(base - (h - floor), floor) : base + h
      if (patOn && (pat.scope === 'relief' || (pat.scope === 'plateau' && dmm >= r.edgeWidth)) && coverage(pat, X(i), Y(j))) {
        const lo = engraved ? floor : base + floor
        t = Math.max(t - pat.depth, Math.min(t, lo))
      }
      top[k] = t
    } else if (plateInGrid && plate && plateInside(plate, X(i), Y(j), dOut ? dOut[k] * cell : 0)) {
      meshMask[k] = 1
      let t = base
      if (patOn && pat.scope === 'base' && coverage(pat, X(i), Y(j))) t = Math.max(base - pat.depth, Math.min(base, floor))
      top[k] = t
    }
  }
  return { nx, ny, dx, dy, i0: bi0, j0: bj0, blocks: plateInGrid ? blocksOf(meshMask, nx, ny) : silBlocks, top, silBlocks }
}

/** Узел (i, j) в мм: центр габарита фигуры в нуле, +Y вверх. */
const nodeXY = (g: Grid, i: number, j: number, wMm: number, hMm: number): [number, number] => [(i - g.i0) * g.dx - wMm / 2, hMm / 2 - (j - g.j0) * g.dy]

export interface ReliefMesh { vertProperties: Float32Array; triVerts: Uint32Array; triangles: number }

/**
 * Замкнутая сетка рельефа с плоской спинкой на z = 0 (топология блоков, как в 02_heightfield.py: стены строятся на тех же
 * вершинах, что верх и низ, поэтому сетка всегда замкнута). Верх узла берётся из g.top (подложка уже в нём).
 */
export function reliefMesh(g: Grid, wMm: number, hMm: number): ReliefMesh {
  const bw = g.nx - 1
  const vidx = new Int32Array(g.nx * g.ny).fill(-1)
  const pos: number[] = []
  const topV = (i: number, j: number) => {
    const k = j * g.nx + i
    if (vidx[k] < 0) {
      vidx[k] = pos.length / 3 / 2
      const [x, y] = nodeXY(g, i, j, wMm, hMm)
      pos.push(x, y, g.top[k], x, y, 0) // пара вершин узла: верх и низ
    }
    return vidx[k] * 2
  }
  const tri: number[] = []
  const solid = (i: number, j: number) => i >= 0 && j >= 0 && i < bw && j < g.ny - 1 && g.blocks[j * bw + i] === 1
  const quad = (a: number, b: number, c: number, d: number) => { tri.push(a, b, c, a, c, d) }
  for (let j = 0; j < g.ny - 1; j++) for (let i = 0; i < bw; i++) {
    if (!g.blocks[j * bw + i]) continue
    const A = topV(i, j), B = topV(i + 1, j), C = topV(i + 1, j + 1), D = topV(i, j + 1)
    // вершина верха — чётный индекс, низа — следующий
    quad(A, D, C, B)                         // верх (смотрит вверх)
    quad(A + 1, B + 1, C + 1, D + 1)         // спинка (смотрит вниз)
    if (!solid(i - 1, j)) quad(A, A + 1, D + 1, D)     // левая стена, наружу −X
    if (!solid(i + 1, j)) quad(B, C, C + 1, B + 1)     // правая стена, наружу +X
    if (!solid(i, j - 1)) quad(A, B, B + 1, A + 1)     // стена сверху по картинке, наружу +Y
    if (!solid(i, j + 1)) quad(D, D + 1, C + 1, C)     // стена снизу по картинке, наружу −Y
  }
  return { vertProperties: Float32Array.from(pos), triVerts: Uint32Array.from(tri), triangles: tri.length / 3 }
}

/** Контур твёрдых блоков силуэта в мм (петли по границе), в тех же координатах, что вершины рельефа. */
function silhouetteOutline(g: Grid, wMm: number, hMm: number): Pt[][] {
  return maskLoops(g.silBlocks, g.nx - 1, g.ny - 1).map((l) => dropCollinear(l)).map((l) => l.map(([i, j]) => nodeXY(g, i, j, wMm, hMm)))
}

/** Контур подложки как CrossSection (подложка отдельным телом): по силуэту со смещением, прямоугольник, скруглённый, круг. */
function plateCrossSection(w: ManifoldToplevel, s: PlateSpec, g: Grid, wMm: number, hMm: number, engraved: boolean): CrossSection {
  const { CrossSection } = w
  let cs: CrossSection
  if (s.shape === 'silhouette') { const sil = CrossSection.ofPolygons(silhouetteOutline(g, wMm, hMm), 'EvenOdd'); cs = s.offset > 0 ? sil.offset(s.offset, 'Round', 2, 32) : sil }
  else if (s.shape === 'circle') cs = CrossSection.circle(s.diameter / 2, 128)
  else if (s.shape === 'rect') cs = CrossSection.square([s.pw, s.ph], true)
  else cs = roundedRectCS(w, s.pw, s.ph, Math.min(s.radius, Math.min(s.pw, s.ph) / 2))
  // выгравированный рельеф лежит внутри подложки: сама подложка — кольцо вокруг силуэта
  return engraved ? cs.subtract(CrossSection.ofPolygons(silhouetteOutline(g, wMm, hMm), 'EvenOdd')) : cs
}

// ---------- сборка ----------

export interface KeychainInfo {
  /** Ключ i18n ошибки (пустая маска, подложка меньше силуэта); при ошибке геометрия не строится. */
  error?: string
  threshold: number
  photoLike: boolean
  preview: MaskPreview | null
  /** Размер силуэта, мм. */
  size?: [number, number]
  /** Шаг сетки рельефа, мм, признак, что он увеличен из-за бюджета, и самый мелкий шаг в пределах бюджета. */
  cell?: number
  reduced?: boolean
  minCell?: number
  triangles?: number
}

/** Изображения, доступные воркеру по id. */
export type ImageRegistry = Map<string, GrayImage>

export function buildKeychainSolid(w: ManifoldToplevel, p: KeychainParams, registry: ImageRegistry): { solid: Manifold | null; info: KeychainInfo } {
  const img = registry.get(p.imageId)
  if (!img) return { solid: null, info: { error: 'keychain.error.noImage', threshold: 0, photoLike: false, preview: null } }
  const sil = buildSilhouette(img, p.silhouette)
  const preview = maskPreview(img, sil)
  const base = { threshold: sil.threshold, photoLike: sil.photoLike, preview }
  const b = maskBounds(sil.mask, img.width, img.height)
  if (!b) return { solid: null, info: { ...base, error: 'keychain.error.emptyMask' } }
  const { w: wMm, h: hMm } = sizeMm(p.size, b[2] - b[0] + 1, b[3] - b[1] + 1)
  const plate = plateSpec(p.base, wMm, hMm)
  if (plate.error) return { solid: null, info: { ...base, error: plate.error, size: [wMm, hMm] } }
  const plateInGrid = !!plate.spec && p.pattern.kind !== 'none' && p.pattern.scope === 'base'
  let count = 0
  for (let i = 0; i < sil.mask.length; i++) count += sil.mask[i]
  const fillSil = count / ((b[2] - b[0] + 1) * (b[3] - b[1] + 1))
  const fill = plateInGrid ? plate.spec!.area / (wMm * hMm) : fillSil
  const { cell, reduced, min } = effectiveCell(wMm, hMm, fill, p.quality)
  const grid = buildGrid({ img, mask: sil.mask, bounds: b, wMm, hMm, cell, p, plate: plate.spec, plateInGrid })
  const mesh = reliefMesh(grid, wMm, hMm)
  const raw = new w.Mesh({ numProp: 3, vertProperties: mesh.vertProperties, triVerts: mesh.triVerts })
  raw.merge()
  let relief = new w.Manifold(raw)
  const info = { ...base, size: [wMm, hMm] as [number, number], cell, reduced, minCell: min, triangles: mesh.triangles }
  if (relief.status() !== 'NoError' || relief.isEmpty()) return { solid: null, info: { ...info, error: 'keychain.error.mesh' } }
  if (plate.spec && !plateInGrid) {
    const cs = plateCrossSection(w, plate.spec, grid, wMm, hMm, p.relief.profile === 'engraved')
    if (!cs.isEmpty()) {
      const slab = w.Manifold.extrude(cs, p.base.thickness)
      const merged = relief.add(slab)
      slab.delete(); relief.delete()
      relief = merged
    }
  }
  return { solid: relief, info }
}

export async function buildKeychain(p: KeychainParams, registry: ImageRegistry, wasmUrl?: string) {
  return buildKeychainSolid(await getWasm(wasmUrl), p, registry)
}
