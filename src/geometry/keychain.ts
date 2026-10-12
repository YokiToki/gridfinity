import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d'
import { getWasm } from './wasm'
import { roundedRectCS } from './bin'
import { dropCollinear, maskLoops, type Pt } from './art/trace'
import { fillHoles, findHoles, removeSpecks, type Hole } from './raster/components'
import { edt } from './raster/edt'
import { close, dilate, erode } from './raster/morphology'
import { maskBounds, resampleMask } from './raster/resample'
import { midtoneShare, otsu, toMask, type GrayImage } from './raster/threshold'

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

export interface ReliefParams {
  /** Высота плато рельефа над подложкой, мм. */
  hmax: number
  /** Ширина скоса от кромки до плато, мм. */
  edgeWidth: number
  /** Показатель профиля (< 1 утолщает тонкие кончики). */
  pow: number
  /** Минимальная высота рельефа у кромки, мм. */
  heightFloor: number
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
  relief: ReliefParams
  base: BaseParams
  quality: QualityParams
}

export const defaultKeychain: KeychainParams = {
  imageId: '',
  silhouette: { threshold: 'auto', invert: false, close: 3, fillHoles: true, keepOpen: [], speck: 200, grow: 2 },
  size: { mode: 'longest', longest: 70, width: 70, height: 70 },
  relief: { hmax: 2, edgeWidth: 6, pow: 0.65, heightFloor: 0.06 },
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
  const b = p.base
  if (!Number.isFinite(b.thickness) || b.thickness < 0) bad('base.thickness', 'keychain.error.negative')
  if (!Number.isFinite(b.offset) || b.offset < 0) bad('base.offset', 'keychain.error.negative')
  if (!Number.isFinite(b.margin) || b.margin < 0) bad('base.margin', 'keychain.error.negative')
  if (!Number.isFinite(b.radius) || b.radius < 0) bad('base.radius', 'keychain.error.negative')
  if (!b.auto && (b.shape === 'rect' || b.shape === 'rounded') && !(pos(b.width) && pos(b.height))) bad('base.width', 'keychain.error.size')
  if (!b.auto && b.shape === 'circle' && !pos(b.width)) bad('base.width', 'keychain.error.size')
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

/** Высота рельефа над подложкой по расстоянию до кромки, мм: плато + скос, не ниже heightFloor (как 02_heightfield.py). */
export function reliefHeight(distMm: number, r: ReliefParams): number {
  const t = Math.min(1, Math.max(0, distMm / r.edgeWidth)) ** r.pow
  return Math.max(r.hmax * smoothstep(t), r.heightFloor)
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

/** Шаг сетки: желаемый, но не мельче, чем позволяет бюджет треугольников (≈ 4 на ячейку материала). */
export function effectiveCell(wMm: number, hMm: number, fill: number, q: QualityParams): { cell: number; reduced: boolean } {
  const need = Math.sqrt((4.4 * wMm * hMm * Math.max(0.05, fill)) / q.maxTriangles)
  return need > q.cell ? { cell: need, reduced: true } : { cell: q.cell, reduced: false }
}

export interface Grid {
  nx: number
  ny: number
  /** Пустой край вокруг фигуры, ячейки. */
  pad: number
  /** Шаг по осям, мм (по X и Y отличаются на доли процента, чтобы габарит был ровно заданным). */
  dx: number
  dy: number
  /** Первый узел твёрдых блоков по осям: от него отсчитываются координаты (тонкие кончики у края габарита выпадают из сетки, габарит считается по настоящим блокам). */
  i0: number
  j0: number
  mask: Uint8Array
  /** Блоки (между четырьмя узлами материала): 1 — твёрдый. */
  blocks: Uint8Array
  top: Float32Array
}

/** Сетка рельефа: маска фигуры → узлы, расстояния до кромки, высоты (без подложки). Габарит блоков ровно wMm × hMm. */
export function buildGrid(mask: Uint8Array, w: number, bounds: [number, number, number, number], wMm: number, hMm: number, cell: number, r: ReliefParams): Grid {
  const pad = 2
  const sx = Math.max(3, Math.round(wMm / cell) + 1), sy = Math.max(3, Math.round(hMm / cell) + 1) // узлов по осям у фигуры
  const small = resampleMask(mask, w, bounds[0], bounds[1], bounds[2] + 1, bounds[3] + 1, sx, sy)
  const nx = sx + 2 * pad, ny = sy + 2 * pad
  const m = new Uint8Array(nx * ny)
  for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) m[(j + pad) * nx + i + pad] = small[j * sx + i]
  const d = edt(m, nx, ny)
  const top = new Float32Array(nx * ny)
  const pitch = cell
  for (let i = 0; i < top.length; i++) top[i] = m[i] ? reliefHeight(d[i] * pitch, r) : 0
  const blocks = new Uint8Array((nx - 1) * (ny - 1))
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    blocks[j * (nx - 1) + i] = m[j * nx + i] && m[j * nx + i + 1] && m[(j + 1) * nx + i] && m[(j + 1) * nx + i + 1] ? 1 : 0
  }
  // габарит по настоящим блокам: шаг подгоняется, чтобы сетка занимала ровно заданный размер
  let bi0 = nx, bi1 = -1, bj0 = ny, bj1 = -1
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) if (blocks[j * (nx - 1) + i]) { if (i < bi0) bi0 = i; if (i > bi1) bi1 = i; if (j < bj0) bj0 = j; if (j > bj1) bj1 = j }
  if (bi1 < 0) { bi0 = pad; bi1 = nx - pad - 2; bj0 = pad; bj1 = ny - pad - 2 }
  const dx = wMm / (bi1 + 1 - bi0), dy = hMm / (bj1 + 1 - bj0)
  return { nx, ny, pad, dx, dy, i0: bi0, j0: bj0, mask: m, blocks, top }
}

/** Узел (i, j) в мм: центр габарита фигуры в нуле, +Y вверх. */
const nodeXY = (g: Grid, i: number, j: number, wMm: number, hMm: number): [number, number] => [(i - g.i0) * g.dx - wMm / 2, hMm / 2 - (j - g.j0) * g.dy]

export interface ReliefMesh { vertProperties: Float32Array; triVerts: Uint32Array; triangles: number }

/**
 * Замкнутая сетка рельефа с плоской спинкой на z = 0 (топология блоков, как в 02_heightfield.py: стены строятся на тех же
 * вершинах, что верх и низ, поэтому сетка всегда замкнута). Верх узла = base + высота рельефа.
 */
export function reliefMesh(g: Grid, wMm: number, hMm: number, base: number): ReliefMesh {
  const bw = g.nx - 1
  const vidx = new Int32Array(g.nx * g.ny).fill(-1)
  const pos: number[] = []
  const topV = (i: number, j: number) => {
    const k = j * g.nx + i
    if (vidx[k] < 0) {
      vidx[k] = pos.length / 3 / 2
      const [x, y] = nodeXY(g, i, j, wMm, hMm)
      pos.push(x, y, base + g.top[k], x, y, 0) // пара вершин узла: верх и низ
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

// ---------- подложка ----------

/** Контур блоков в мм (петли по границе твёрдых блоков), в тех же координатах, что вершины рельефа. */
function blockOutline(g: Grid, wMm: number, hMm: number): Pt[][] {
  const bw = g.nx - 1, bh = g.ny - 1
  return maskLoops(g.blocks, bw, bh).map((l) => dropCollinear(l)).map((l) => l.map(([i, j]) => nodeXY(g, i, j, wMm, hMm)))
}

/** Контур подложки или null (подложки нет); error — ключ ошибки, если фигура меньше силуэта. */
export function plateOutline(w: ManifoldToplevel, b: BaseParams, g: Grid, wMm: number, hMm: number): { cs: CrossSection | null; error?: string } {
  if (b.thickness <= 0) return { cs: null }
  const { CrossSection } = w
  if (b.shape === 'silhouette') {
    const cs = CrossSection.ofPolygons(blockOutline(g, wMm, hMm), 'EvenOdd')
    return { cs: b.offset > 0 ? cs.offset(b.offset, 'Round', 2, 32) : cs }
  }
  const diag = Math.hypot(wMm, hMm)
  if (b.shape === 'circle') {
    const d = b.auto ? diag + 2 * b.margin : b.width
    if (d < diag - 1e-6) return { cs: null, error: 'keychain.error.plateTooSmall' }
    return { cs: CrossSection.circle(d / 2, 128) }
  }
  const pw = b.auto ? wMm + 2 * b.margin : b.width, ph = b.auto ? hMm + 2 * b.margin : b.height
  if (pw < wMm - 1e-6 || ph < hMm - 1e-6) return { cs: null, error: 'keychain.error.plateTooSmall' }
  if (b.shape === 'rect') return { cs: CrossSection.square([pw, ph], true) }
  return { cs: roundedRectCS(w, pw, ph, Math.min(b.radius, Math.min(pw, ph) / 2)) }
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
  /** Шаг сетки рельефа, мм, и признак, что он увеличен из-за бюджета. */
  cell?: number
  reduced?: boolean
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
  let count = 0
  for (let i = 0; i < sil.mask.length; i++) count += sil.mask[i]
  const fill = count / ((b[2] - b[0] + 1) * (b[3] - b[1] + 1))
  const { cell, reduced } = effectiveCell(wMm, hMm, fill, p.quality)
  const grid = buildGrid(sil.mask, img.width, b, wMm, hMm, cell, p.relief)
  const plate = plateOutline(w, p.base, grid, wMm, hMm)
  if (plate.error) return { solid: null, info: { ...base, error: plate.error, size: [wMm, hMm] } }
  const mesh = reliefMesh(grid, wMm, hMm, p.base.thickness)
  const raw = new w.Mesh({ numProp: 3, vertProperties: mesh.vertProperties, triVerts: mesh.triVerts })
  raw.merge()
  let relief = new w.Manifold(raw)
  if (relief.status() !== 'NoError' || relief.isEmpty()) return { solid: null, info: { ...base, error: 'keychain.error.mesh', size: [wMm, hMm] } }
  if (plate.cs) {
    const slab = w.Manifold.extrude(plate.cs, p.base.thickness)
    const merged = relief.add(slab)
    slab.delete(); relief.delete()
    relief = merged
  }
  return { solid: relief, info: { ...base, size: [wMm, hMm], cell, reduced, triangles: mesh.triangles } }
}

export async function buildKeychain(p: KeychainParams, registry: ImageRegistry, wasmUrl?: string) {
  return buildKeychainSolid(await getWasm(wasmUrl), p, registry)
}

