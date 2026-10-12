import { labelComponents } from './raster/components'
import { edt } from './raster/edt'

/**
 * Поле для поиска посадочных мест Keychain: узлы сетки рельефа с материалом, высота верха и расстояние до края.
 * Все координаты в мм, начало — центр габарита силуэта, Y вверх. Чистые функции без обращения к Manifold.
 */
export interface AnchorField {
  nx: number
  ny: number
  /** Номинальный шаг сетки, мм. */
  cell: number
  dx: number
  dy: number
  i0: number
  j0: number
  wMm: number
  hMm: number
  /** 1 — узел с материалом (силуэт и подложка). */
  solid: Uint8Array
  /** Высота верха над плоскостью стола, мм (у узлов с материалом). */
  top: Float32Array
  /** Расстояние до ближайшего узла без материала, мм (внутри материала). */
  dist: Float32Array
  /** Расстояние до ближайшего узла с материалом, мм (снаружи; в материале 0). */
  distOut: Float32Array
  /** 1 — внешний фон (связан с краем сетки); замкнутые полости не считаются. */
  exterior: Uint8Array
}

export interface FieldSource {
  nx: number; ny: number; dx: number; dy: number; i0: number; j0: number
  solid: Uint8Array
  top: Float32Array
}

export function anchorField(g: FieldSource, wMm: number, hMm: number, cell: number): AnchorField {
  const d = edt(g.solid, g.nx, g.ny)
  const dist = new Float32Array(d.length)
  for (let i = 0; i < d.length; i++) dist[i] = d[i] * cell
  const inv = new Uint8Array(g.solid.length)
  for (let i = 0; i < inv.length; i++) inv[i] = g.solid[i] ? 0 : 1
  const o = edt(inv, g.nx, g.ny)
  const distOut = new Float32Array(o.length)
  for (let i = 0; i < o.length; i++) distOut[i] = o[i] * cell
  return { ...g, cell, wMm, hMm, dist, distOut, exterior: exteriorOf(g.solid, g.nx, g.ny) }
}

/** Внешний фон: компоненты пустых узлов, касающиеся края сетки. Замкнутая дырка (открытая полость) внешней не считается. */
export function exteriorOf(solid: Uint8Array, nx: number, ny: number): Uint8Array {
  const { labels, count } = labelComponents(solid, nx, ny, 0)
  const border = new Uint8Array(count + 1)
  for (let x = 0; x < nx; x++) { border[labels[x]] = 1; border[labels[(ny - 1) * nx + x]] = 1 }
  for (let y = 0; y < ny; y++) { border[labels[y * nx]] = 1; border[labels[y * nx + nx - 1]] = 1 }
  const out = new Uint8Array(nx * ny)
  for (let i = 0; i < out.length; i++) if (labels[i] && border[labels[i]]) out[i] = 1
  return out
}

export const nodeMm = (f: AnchorField, i: number, j: number): [number, number] => [(i - f.i0) * f.dx - f.wMm / 2, f.hMm / 2 - (j - f.j0) * f.dy]
export const mmNode = (f: AnchorField, x: number, y: number): [number, number] => [Math.round((x + f.wMm / 2) / f.dx + f.i0), Math.round((f.hMm / 2 - y) / f.dy + f.j0)]
const inGrid = (f: AnchorField, i: number, j: number) => i >= 0 && j >= 0 && i < f.nx && j < f.ny

/** Относительные координаты (доля габарита силуэта: 0 слева, 0 снизу, Y вверх) ↔ мм от центра габарита. Позиции хранятся относительно, чтобы переживать смену размера. */
export const relToMm = (rx: number, ry: number, wMm: number, hMm: number): { x: number; y: number } => ({ x: rx * wMm - wMm / 2, y: ry * hMm - hMm / 2 })
export const mmToRel = (x: number, y: number, wMm: number, hMm: number): { x: number; y: number } => ({ x: (x + wMm / 2) / wMm, y: (y + hMm / 2) / hMm })

/** Минимальная высота верха по квадрату со стороной 2r вокруг каждого узла (разделяемый фильтр минимума); узлы без материала считаются нулевой высотой. */
export function minHeightField(f: AnchorField, radiusMm: number): Float32Array {
  const r = Math.max(0, Math.ceil(radiusMm / f.cell - 1e-9))
  const a = new Float32Array(f.nx * f.ny), b = new Float32Array(f.nx * f.ny)
  for (let i = 0; i < a.length; i++) a[i] = f.solid[i] ? f.top[i] : 0
  for (let y = 0; y < f.ny; y++) for (let x = 0; x < f.nx; x++) { // по строкам
    let m = Infinity
    for (let k = -r; k <= r; k++) { const xx = x + k; m = Math.min(m, xx < 0 || xx >= f.nx ? 0 : a[y * f.nx + xx]) }
    b[y * f.nx + x] = m
  }
  for (let y = 0; y < f.ny; y++) for (let x = 0; x < f.nx; x++) { // по столбцам
    let m = Infinity
    for (let k = -r; k <= r; k++) { const yy = y + k; m = Math.min(m, yy < 0 || yy >= f.ny ? 0 : b[yy * f.nx + x]) }
    a[y * f.nx + x] = m
  }
  return a
}

/** Требования к посадочному месту: радиус пятна, минимальная высота материала по всему пятну и минимальная стенка от края. */
export interface AnchorReq { radius: number; minHeight: number; minRim: number }
export type RejectReason = 'outside' | 'rim' | 'thin' | 'spacing'

export interface Anchor { x: number; y: number; /** Запас по худшему из требований, мм (больше — надёжнее). */ margin: number; height: number; rim: number; /** Для канала: ближайший выход на край по одному из восьми направлений. */ exit?: { x: number; y: number } }
export interface Rejected { x: number; y: number; reason: RejectReason; actual: number; required: number }

export interface FindOptions {
  /** Сколько мест вернуть. */
  count: number
  /** Минимальное расстояние между выбранными центрами, мм. */
  spacing: number
  /** Уже занятые места (центр и радиус): новые не ближе spacing + радиус. */
  avoid?: { x: number; y: number; r: number }[]
  /** Сколько отклонённых мест вернуть для показа (равномерная выборка). */
  rejectedSample?: number
  /** Не дальше этого расстояния от точки (необязательно): поиск вокруг желаемого места. */
  near?: { x: number; y: number; maxDist: number }
}

/**
 * Поиск мест: для каждого узла запас = min(стенка − minRim, минимальная высота по пятну − minHeight). Берутся лучшие места
 * по запасу с соблюдением расстояния между ними. Отклонённые возвращаются с причиной и фактическим значением (для подсказки).
 * Высота меряется по всему пятну, а не в центральной точке.
 */
export function findAnchors(f: AnchorField, req: AnchorReq, opt: FindOptions): { accepted: Anchor[]; rejected: Rejected[]; coarse: boolean } {
  const mh = minHeightField(f, req.radius)
  const cand: Anchor[] = []
  const failed: Rejected[] = []
  for (let j = 0; j < f.ny; j++) for (let i = 0; i < f.nx; i++) {
    const k = j * f.nx + i
    const [x, y] = nodeMm(f, i, j)
    if (opt.near && Math.hypot(x - opt.near.x, y - opt.near.y) > opt.near.maxDist) continue
    if (!f.solid[k]) { if (f.dist[k] === 0 && nearSolid(f, i, j)) failed.push({ x, y, reason: 'outside', actual: 0, required: 0 }); continue }
    const rim = f.dist[k] - req.radius, height = mh[k]
    if (rim < req.minRim - 1e-9) { failed.push({ x, y, reason: 'rim', actual: Math.max(0, rim), required: req.minRim }); continue }
    if (height < req.minHeight - 1e-9) { failed.push({ x, y, reason: 'thin', actual: height, required: req.minHeight }); continue }
    cand.push({ x, y, margin: Math.min(rim - req.minRim, height - req.minHeight), height, rim })
  }
  // при равном запасе (плато) надёжнее место с большей стенкой от края
  cand.sort((a, b) => b.margin - a.margin || b.rim - a.rim || a.y - b.y || a.x - b.x)
  const accepted: Anchor[] = []
  for (const c of cand) {
    if (accepted.length >= opt.count) break
    const clash = accepted.some((a) => Math.hypot(a.x - c.x, a.y - c.y) < opt.spacing) || (opt.avoid ?? []).some((a) => Math.hypot(a.x - c.x, a.y - c.y) < opt.spacing + a.r)
    if (clash) { if (failed.length < 4000) failed.push({ x: c.x, y: c.y, reason: 'spacing', actual: 0, required: opt.spacing }); continue }
    accepted.push(c)
  }
  const n = opt.rejectedSample ?? 40
  const step = Math.max(1, Math.floor(failed.length / n))
  const rejected = failed.filter((_, idx) => idx % step === 0).slice(0, n)
  return { accepted, rejected, coarse: 2 * req.radius < 2 * f.cell }
}

function nearSolid(f: AnchorField, i: number, j: number) {
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (inGrid(f, i + di, j + dj) && f.solid[(j + dj) * f.nx + i + di]) return true
  return false
}

/** Ближайший выход на край из точки по восьми направлениям (кратчайший луч внутри материала), мм. */
export function nearestExit(f: AnchorField, from: { x: number; y: number }): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null, bd = Infinity
  for (const [dx, dy] of [[0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]] as const) {
    const e = exitRay(f, from, { x: dx, y: dy })
    if (!e) continue
    const d = Math.hypot(e.x - from.x, e.y - from.y)
    if (d < bd) { bd = d; best = e }
  }
  return best
}

/** Узел поля у точки (мм) или null вне сетки. */
export function nodeAt(f: AnchorField, x: number, y: number): number | null {
  const [i, j] = mmNode(f, x, y)
  return inGrid(f, i, j) ? j * f.nx + i : null
}

/** Расстояние от точки до ближайшего материала, мм (0 внутри); бесконечность вне сетки. */
export function distToSolid(f: AnchorField, x: number, y: number): number {
  const k = nodeAt(f, x, y)
  return k === null ? Infinity : f.distOut[k]
}

/** Расстояние от края до точки (мм): 0 вне материала. */
export function rimAt(f: AnchorField, x: number, y: number): number {
  const k = nodeAt(f, x, y)
  return k !== null && f.solid[k] ? f.dist[k] : 0
}

/** Минимальная высота материала по пятну радиуса r с центром (x, y). */
export function heightOver(f: AnchorField, x: number, y: number, r: number): number {
  const k = nodeAt(f, x, y)
  return k === null ? 0 : minHeightField(f, r)[k]
}

/** Идём от точки по направлению, пока есть материал; возвращает последнюю точку внутри (выход на край) или null, если стартовая точка вне материала. */
export function exitRay(f: AnchorField, from: { x: number; y: number }, dir: { x: number; y: number }, maxLen = 1000): { x: number; y: number } | null {
  const l = Math.hypot(dir.x, dir.y) || 1
  const ux = dir.x / l, uy = dir.y / l
  const step = f.cell / 2
  let last: { x: number; y: number } | null = null
  for (let t = 0; t <= maxLen; t += step) {
    const x = from.x + ux * t, y = from.y + uy * t
    const k = nodeAt(f, x, y)
    if (k === null || !f.solid[k]) break
    last = { x, y }
  }
  return last
}

export type BreachResult = { ok: true } | { ok: false; reason: 'inside' | 'cavity' | 'outside' }

/**
 * Проверка выхода канала: цилиндр идёт от внутренней точки A к точке входа E и дальше на радиус плюс запас. Конец за выходом должен
 * лежать во внешнем фоне. Если он ещё в материале — канал не вышел наружу; если в замкнутой полости (открытая дырка) — тоже не наружу.
 */
export function channelBreach(f: AnchorField, a: { x: number; y: number }, e: { x: number; y: number }, radius: number): BreachResult {
  const dx = e.x - a.x, dy = e.y - a.y
  const l = Math.hypot(dx, dy)
  if (l < 1e-9) return { ok: false, reason: 'inside' }
  const probe = { x: e.x + (dx / l) * (radius + f.cell * 1.5), y: e.y + (dy / l) * (radius + f.cell * 1.5) }
  const k = nodeAt(f, probe.x, probe.y)
  if (k === null) return { ok: true } // за пределами сетки — открытый воздух
  if (f.solid[k]) return { ok: false, reason: 'inside' }
  return f.exterior[k] ? { ok: true } : { ok: false, reason: 'cavity' }
}
