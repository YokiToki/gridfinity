import { cutoutBounds, cutoutLayout, type Box, type Cutout, type CutoutParams } from './cutout'
import type { AxisSize } from './baseplate'
import { CLEARANCE } from './spec'

/** Центрирование, выравнивание по краю, распределение и подгонка габарита: чистые функции над вырезами. */

export type Axis = 'x' | 'y'
export type Side = 'left' | 'right' | 'front' | 'back'
export interface Cavity { x: number; y: number }

const cx = (b: Box) => (b.minX + b.maxX) / 2
const cy = (b: Box) => (b.minY + b.maxY) / 2

/** Центр габарита выреза совпадает с центром полости по выбранной оси (или по обеим). */
export function centerCutout(c: Cutout, axis: Axis | 'both' = 'both'): Cutout {
  const b = cutoutBounds(c)
  return { ...c, x: axis === 'y' ? c.x : c.x - cx(b), y: axis === 'x' ? c.y : c.y - cy(b) }
}

/** Край выреза на расстоянии margin от внутренней стенки: left/right — по X, front/back — по Y (front = −Y). */
export function alignEdge(c: Cutout, side: Side, margin: number, cavity: Cavity): Cutout {
  const b = cutoutBounds(c)
  if (side === 'left') return { ...c, x: c.x + (-cavity.x / 2 + margin - b.minX) }
  if (side === 'right') return { ...c, x: c.x + (cavity.x / 2 - margin - b.maxX) }
  if (side === 'front') return { ...c, y: c.y + (-cavity.y / 2 + margin - b.minY) }
  return { ...c, y: c.y + (cavity.y / 2 - margin - b.maxY) }
}

/** Равные зазоры между вырезами вдоль оси внутри полости; порядок сохраняется по текущему положению, скрытые не двигаются. */
export function distribute(list: Cutout[], axis: Axis, cavity: Cavity, margin = 0): Cutout[] {
  const vis = list.filter((c) => c.visible)
  if (vis.length < 2) return list
  const lo = (c: Cutout) => (axis === 'x' ? cutoutBounds(c).minX : cutoutBounds(c).minY)
  const size = (c: Cutout) => { const b = cutoutBounds(c); return axis === 'x' ? b.maxX - b.minX : b.maxY - b.minY }
  const ordered = [...vis].sort((a, b) => lo(a) - lo(b))
  const len = axis === 'x' ? cavity.x : cavity.y
  const total = ordered.reduce((s, c) => s + size(c), 0)
  const gap = (len - 2 * margin - total) / (ordered.length - 1)
  const moved = new Map<string, Cutout>()
  let pos = -len / 2 + margin
  for (const c of ordered) {
    const d = pos - lo(c)
    moved.set(c.id, axis === 'x' ? { ...c, x: c.x + d } : { ...c, y: c.y + d })
    pos += size(c) + gap
  }
  return list.map((c) => moved.get(c.id) ?? c)
}

export interface FitResult { x: AxisSize; y: AxisSize; cutouts: Cutout[]; sizeX: number; sizeY: number }

/**
 * Наименьший габарит, в который помещаются все видимые вырезы с отступом margin от стенки; вырезы сдвигаются так,
 * чтобы их общий габарит оказался в центре. Размер в мм с точностью 0.1 и не меньше одной ячейки.
 */
export function fitFootprint(p: CutoutParams, margin = 0.8): FitResult | null {
  const vis = p.cutouts.filter((c) => c.visible)
  if (vis.length === 0) return null
  const boxes = vis.map(cutoutBounds)
  const minX = Math.min(...boxes.map((b) => b.minX)), maxX = Math.max(...boxes.map((b) => b.maxX))
  const minY = Math.min(...boxes.map((b) => b.minY)), maxY = Math.max(...boxes.map((b) => b.maxY))
  const wall = p.thickness.outerWall
  const need = (span: number) => Math.max(p.pitch, Math.ceil((span + 2 * margin + 2 * wall + 2 * CLEARANCE) * 10 - 1e-6) / 10)
  const sizeX = need(maxX - minX), sizeY = need(maxY - minY)
  const dx = -(minX + maxX) / 2, dy = -(minY + maxY) / 2
  const cutouts = p.cutouts.map((c) => (c.visible ? { ...c, x: c.x + dx, y: c.y + dy } : c))
  return { x: { mode: 'mm', value: sizeX, align: p.x.align }, y: { mode: 'mm', value: sizeY, align: p.y.align }, cutouts, sizeX, sizeY }
}

// ---------- привязка ----------

export interface SnapResult { x: number; y: number; guideX: number | null; guideY: number | null }

/** Ближайшая цель к одному из значений кромок: сдвиг и сама цель, либо null, если ничего не ближе radius. */
export function snapAxis(edges: number[], targets: number[], radius: number): { delta: number; target: number } | null {
  let best: { delta: number; target: number } | null = null
  for (const e of edges) for (const t of targets) {
    const d = t - e
    if (Math.abs(d) <= radius && (!best || Math.abs(d) < Math.abs(best.delta) - 1e-9)) best = { delta: d, target: t }
  }
  return best
}

/** Цели привязки по оси: центр полости, доли шага сетки, внутренние края полости и края/центры остальных вырезов. */
export function snapTargets(axis: Axis, others: Cutout[], cavity: Cavity, pitch: number): number[] {
  const half = (axis === 'x' ? cavity.x : cavity.y) / 2
  const t = [0, -half, half]
  for (let k = 1; k * (pitch / 2) <= half; k++) t.push(k * (pitch / 2), -k * (pitch / 2))
  for (const o of others) { const b = cutoutBounds(o); t.push(...(axis === 'x' ? [b.minX, cx(b), b.maxX] : [b.minY, cy(b), b.maxY])) }
  return t
}

/** Привязка перетаскиваемого выреза (c — с уже предложенным положением): к целям привязываются левая/центральная/правая кромки. */
export function snapMove(c: Cutout, others: Cutout[], cavity: Cavity, pitch: number, radius = 1.5, enabled = true): SnapResult {
  if (!enabled) return { x: c.x, y: c.y, guideX: null, guideY: null }
  const b = cutoutBounds(c)
  const sx = snapAxis([b.minX, cx(b), b.maxX], snapTargets('x', others, cavity, pitch), radius)
  const sy = snapAxis([b.minY, cy(b), b.maxY], snapTargets('y', others, cavity, pitch), radius)
  return { x: c.x + (sx?.delta ?? 0), y: c.y + (sy?.delta ?? 0), guideX: sx?.target ?? null, guideY: sy?.target ?? null }
}

export { cutoutLayout }

export interface FitUnitsResult extends FitResult {
  /** Размер корпуса целыми юнитами. */
  unitsX: number
  unitsY: number
}

/**
 * Подгонка габарита целыми юнитами: наименьшее число ячеек по каждой оси, в которое помещаются все видимые вырезы с отступом
 * margin от стенки (стенка и зазор корпуса учтены, как в fitFootprint). Вырезы сдвигаются так, чтобы их общий габарит стоял по
 * центру. Размер в мм (`sizeX`, `sizeY`) — размер целых юнитов.
 */
export function fitFootprintUnits(p: CutoutParams, margin = 0.8): FitUnitsResult | null {
  const f = fitFootprint(p, margin)
  if (!f) return null
  const unitsX = Math.max(1, Math.ceil(f.sizeX / p.pitch - 1e-9)), unitsY = Math.max(1, Math.ceil(f.sizeY / p.pitch - 1e-9))
  return {
    ...f,
    x: { mode: 'units', value: unitsX, align: p.x.align },
    y: { mode: 'units', value: unitsY, align: p.y.align },
    sizeX: unitsX * p.pitch,
    sizeY: unitsY * p.pitch,
    unitsX,
    unitsY,
  }
}
