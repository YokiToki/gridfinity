import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import type { Box } from './region'
import type { AsanohaParams } from './types'

export interface Seg { x0: number; y0: number; x1: number; y1: number }
const SQRT3 = Math.sqrt(3)

/** Шаг решётки: радиус шестиугольника с шириной между гранями width. */
export const asanohaStep = (width: number) => width / SQRT3

/**
 * Отрезки асаноха в осях области (узел решётки в центре): main — рёбра треугольной решётки с шагом R (стороны и диагонали шестиугольников,
 * общие рёбра один раз), detail — три отрезка от центра каждого треугольника к его углам. Берутся отрезки, габарит которых задевает область.
 */
export function asanohaSegments(box: Box, width: number): { main: Seg[]; detail: Seg[] } {
  const R = asanohaStep(width)
  if (!(R > 1e-6)) return { main: [], detail: [] }
  const hx = box.width / 2, hy = box.height / 2
  const ax = R, bx = R / 2, by = (R * SQRT3) / 2
  const jMax = Math.ceil(hy / by) + 2, iMax = Math.ceil(hx / R) + jMax + 2
  const pt = (i: number, j: number): [number, number] => [i * ax + j * bx, j * by]
  const touches = (...p: [number, number][]) => {
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1])
    return Math.max(...xs) >= -hx && Math.min(...xs) <= hx && Math.max(...ys) >= -hy && Math.min(...ys) <= hy
  }
  const main: Seg[] = [], detail: Seg[] = []
  for (let j = -jMax; j <= jMax; j++) for (let i = -iMax; i <= iMax; i++) {
    const p = pt(i, j), pa = pt(i + 1, j), pb = pt(i, j + 1), pc = pt(i - 1, j + 1)
    for (const q of [pa, pb, pc]) if (touches(p, q)) main.push({ x0: p[0], y0: p[1], x1: q[0], y1: q[1] })
    // два треугольника на узел: «вверх» (p, p+a, p+b) и «вниз» (p+a, p+b, p+a+b)
    for (const tri of [[p, pa, pb], [pa, pb, pt(i + 1, j + 1)]] as [number, number][][]) {
      if (!touches(...tri)) continue
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3
      for (const c of tri) detail.push({ x0: cx, y0: cy, x1: c[0], y1: c[1] })
    }
  }
  return { main, detail }
}

/** Штрих отрезка: прямоугольник шириной sw с квадратными концами (на узлах соседние штрихи смыкаются без щелей). */
function stroke(w: ManifoldToplevel, s: Seg, sw: number): CrossSection {
  const dx = s.x1 - s.x0, dy = s.y1 - s.y0, len = Math.hypot(dx, dy)
  return w.CrossSection.square([len + sw, sw], true).rotate((Math.atan2(dy, dx) * 180) / Math.PI).translate([(s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2])
}

/**
 * Асаноха: штрихи (главные и детальные) остаются материалом, отверстия — промежутки между ними. Все штрихи связаны в одну сеть и
 * упираются в рамку, поэтому панель остаётся одним куском. Режутся только целые отверстия (не задевающие край области).
 */
export function asanohaCut(w: ManifoldToplevel, box: Box, p: AsanohaParams): CrossSection | null {
  if (box.width < 1 || box.height < 1 || !(p.mainWidth > 0)) return null
  const { main, detail } = asanohaSegments(box, p.width)
  if (!main.length) return null
  const strokes = w.CrossSection.union([...main.map((s) => stroke(w, s, p.mainWidth)), ...(p.detailWidth > 0 ? detail.map((s) => stroke(w, s, p.detailWidth)) : [])])
  const open = w.CrossSection.square([box.width, box.height], true).subtract(strokes)
  const eps = 1e-4, keep = open.decompose().filter((c) => {
    const b = c.bounds()
    return b.min[0] > -box.width / 2 + eps && b.max[0] < box.width / 2 - eps && b.min[1] > -box.height / 2 + eps && b.max[1] < box.height / 2 - eps && c.area() > 0.05
  })
  return keep.length ? w.CrossSection.compose(keep) : null
}
