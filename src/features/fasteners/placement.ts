import type { Footprint, Point } from '../../geometry/footprint'

/** Точки в модели считаются от центра габарита, в редакторе и списке — от его угла (X вправо, Y вверх). */
export const toCorner = (p: Point, fp: Footprint): Point => ({ x: p.x + fp.sizeX / 2, y: p.y + fp.sizeY / 2 })
export const fromCorner = (p: Point, fp: Footprint): Point => ({ x: p.x - fp.sizeX / 2, y: p.y - fp.sizeY / 2 })

export const SNAP_RADIUS = 3 // мм

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Ближайшая стандартная позиция в радиусе привязки; иначе точка как есть. */
export function snapPoint(p: Point, snaps: Point[], radius = SNAP_RADIUS): Point {
  let best: Point | null = null
  let bd = radius
  for (const s of snaps) { const d = dist(p, s); if (d <= bd) { best = s; bd = d } }
  return best ? { ...best } : p
}

export function clampToFootprint(p: Point, fp: Footprint): Point {
  return { x: Math.min(fp.sizeX / 2, Math.max(-fp.sizeX / 2, p.x)), y: Math.min(fp.sizeY / 2, Math.max(-fp.sizeY / 2, p.y)) }
}

const SAME = 0.01
export const indexAt = (points: Point[], p: Point) => points.findIndex((q) => dist(p, q) < SAME)

/** Если в точке уже есть отверстие — убирает его, иначе добавляет. */
export function togglePoint(points: Point[], p: Point): Point[] {
  const i = indexAt(points, p)
  return i >= 0 ? points.filter((_, k) => k !== i) : [...points, { ...p }]
}
