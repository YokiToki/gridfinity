import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import type { Box, PatternCut } from './region'
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

function strokes(w: ManifoldToplevel, segs: Seg[], sw: number, box: Box): CrossSection | null {
  if (!segs.length || !(sw > 0)) return null
  const clipped = w.CrossSection.union(segs.map((s) => stroke(w, s, sw))).intersect(w.CrossSection.square([box.width, box.height], true))
  return clipped.isEmpty() ? null : clipped
}

/** Асаноха: гравировка, главные штрихи и детальные со своей шириной и глубиной; глубина 0 выключает набор. Через панель ничего не режется. */
export function asanohaCut(w: ManifoldToplevel, box: Box, p: AsanohaParams): PatternCut {
  if (box.width < 1 || box.height < 1) return {}
  const { main, detail } = asanohaSegments(box, p.width)
  const engrave: PatternCut['engrave'] = []
  if (p.detailDepth > 0) { const s = strokes(w, detail, p.detailWidth, box); if (s) engrave.push({ shape: s, depth: p.detailDepth }) }
  if (p.mainDepth > 0) { const s = strokes(w, main, p.mainWidth, box); if (s) engrave.push({ shape: s, depth: p.mainDepth }) }
  return { engrave }
}
