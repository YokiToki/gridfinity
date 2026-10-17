import { checkQuad, type Pt } from '../../../geometry/photo/homography'

/** Радиус кольца и зона захвата в экранных пикселях: не зависят от размера снимка. */
export const RING_PX = 22
export const GRAB_MIN_PX = 56
export const GRAB_OUTSIDE_PX = 24
/** Доля короткой стороны листа, до которой угол захватывается (на крупном листе зона шире минимума). */
export const GRAB_FRACTION = 0.18

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Точка внутри многоугольника (чётность пересечений). */
export function inside(p: Pt, poly: Pt[]): boolean {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

/** Расстояние от точки до отрезка. */
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/**
 * Какой угол берётся нажатием в точке p (координаты снимка; px — размер экранного пикселя в координатах снимка). Нажатие должно
 * быть внутри листа или не дальше GRAB_OUTSIDE_PX от него; берётся ближайший угол, если он не дальше max(GRAB_MIN_PX,
 * GRAB_FRACTION короткой стороны листа). Иначе null: нажатие далеко от всех углов ничего не двигает.
 */
export function pickCorner(p: Pt, corners: Pt[], px: number): number | null {
  if (corners.length !== 4) return null
  const near = [0, 1, 2, 3].some((i) => distToSegment(p, corners[i], corners[(i + 1) % 4]) <= GRAB_OUTSIDE_PX * px)
  if (!inside(p, corners) && !near) return null
  const shortSide = Math.min(...[0, 1, 2, 3].map((i) => dist(corners[i], corners[(i + 1) % 4])))
  const reach = Math.max(GRAB_MIN_PX * px, GRAB_FRACTION * shortSide)
  let best = -1, bestD = Infinity
  corners.forEach((c, i) => { const d = dist(p, c); if (d < bestD) { bestD = d; best = i } })
  return bestD <= reach ? best : null
}

/**
 * Новое положение угла i при смещении указателя: старое положение плюс смещение (угол не уходит под указатель), в пределах снимка,
 * и четырёхугольник остаётся допустимым (угол не перепрыгивает через противоположный). Если сейчас четырёхугольник уже
 * недопустим (клавиатура, ручная расстановка), движение свободно, чтобы его можно было исправить.
 */
export function dragCorner(corners: Pt[], i: number, start: Pt, delta: Pt, w: number, h: number): Pt[] {
  const next: Pt = [Math.min(w, Math.max(0, start[0] + delta[0])), Math.min(h, Math.max(0, start[1] + delta[1]))]
  const moved = corners.map((c, k) => (k === i ? next : c))
  return checkQuad(corners) !== 'ok' || checkQuad(moved) === 'ok' ? moved : corners
}

export interface Box { l: number; t: number; r: number; b: number }

/** Пересечение прямоугольников; пустое — null. */
export function intersect(a: Box, b: Box): Box | null {
  const out = { l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) }
  return out.r > out.l && out.b > out.t ? out : null
}

/**
 * Где поставить лупу: в том углу видимой части редактора (экранные координаты), что дальше всего от активного угла, чтобы
 * указатель её не закрывал и она не уходила за прокрутку. place — какой угол выбран, left и top — положение лупы на экране.
 */
export function placeLoupe(active: Pt, visible: Box, size: number, margin = 8): { place: 'tl' | 'tr' | 'bl' | 'br'; left: number; top: number } {
  const lefts = [visible.l + margin, visible.r - margin - size], tops = [visible.t + margin, visible.b - margin - size]
  const cand = [
    { place: 'tl' as const, left: lefts[0], top: tops[0] }, { place: 'tr' as const, left: lefts[1], top: tops[0] },
    { place: 'bl' as const, left: lefts[0], top: tops[1] }, { place: 'br' as const, left: lefts[1], top: tops[1] },
  ]
  let best = cand[0], bestD = -1
  for (const c of cand) {
    const d = Math.hypot(c.left + size / 2 - active[0], c.top + size / 2 - active[1])
    if (d > bestD) { bestD = d; best = c }
  }
  return best
}
