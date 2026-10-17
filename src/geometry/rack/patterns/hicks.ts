import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import { hexCells } from './hex'
import type { Box } from './region'
import type { HicksParams } from './types'

const SQRT3 = Math.sqrt(3)
/** Радиус описанной окружности шестиугольника с апофемой a. */
const circum = (a: number) => (2 * a) / SQRT3
const hexPoly = (a: number): [number, number][] => Array.from({ length: 6 }, (_, k) => [circum(a) * Math.cos((k * Math.PI) / 3), circum(a) * Math.sin((k * Math.PI) / 3)])

/** Апофемы вырезанных колец ячейки снаружи внутрь: каждое кольцо шириной gap, между кольцами штрих stroke, в центре остаётся сплошной шестиугольник. */
export function hicksRings(width: number, stroke: number, gap: number): { outer: number; inner: number }[] {
  const rings: { outer: number; inner: number }[] = []
  if (!(stroke > 0) || !(gap > 0)) return rings
  let r = width / 2 - stroke
  while (r - gap >= stroke / 2 - 1e-9 && r - gap > 0) { rings.push({ outer: r, inner: r - gap }); r -= gap + stroke }
  return rings
}

/** Вершины (0…5), у которых кольцо k перекрыто перемычкой: чётные кольца 0, 2, 4, нечётные 1, 3, 5, так что соседние кольца держатся за разные вершины. */
export const bridgeVertices = (k: number): number[] => (k % 2 === 0 ? [0, 2, 4] : [1, 3, 5])

/** Вырез одной ячейки в нуле: вложенные кольца минус перемычки шириной stroke на чередующихся вершинах. */
export function hicksCell(w: ManifoldToplevel, p: HicksParams): CrossSection | null {
  const rings = hicksRings(p.width, p.stroke, p.gap)
  if (!rings.length) return null
  const { CrossSection } = w
  const parts = rings.map((r, k) => {
    const ring = CrossSection.ofPolygons([hexPoly(r.outer)]).subtract(CrossSection.ofPolygons([hexPoly(r.inner)]))
    const rin = circum(r.inner), rout = circum(r.outer)
    const bridges = bridgeVertices(k).map((v) => CrossSection.square([rout - rin + 0.4, p.stroke], true).translate([(rin + rout) / 2, 0]).rotate(60 * v))
    return ring.subtract(CrossSection.union(bridges))
  })
  return CrossSection.union(parts)
}

/**
 * Центры ячеек Hicks (ширина ячейки width, без зазора между ячейками). complete — ячейки целиком в области; с edgeCells добавляются
 * ещё те, что область только задевает (их потом обрезают по области). Решётка у обоих наборов одна: её начало — первая целая ячейка.
 */
export function hicksCells(box: Box, p: HicksParams): { complete: { x: number; y: number }[]; edge: { x: number; y: number }[] } {
  const whole = hexCells(box, { width: p.width, wall: 0 })
  if (!whole.length && !p.edgeCells) return { complete: [], edge: [] }
  const R = p.width / SQRT3, colStep = 1.5 * R, d = p.width
  const o = whole[0] ?? { x: 0, y: 0 }
  const hx = box.width / 2, hy = box.height / 2, eps = 1e-6
  const complete: { x: number; y: number }[] = [], edge: { x: number; y: number }[] = []
  const nx = Math.ceil((hx + R) / colStep) + 2, ny = Math.ceil((hy + d) / d) + 2
  for (let i = -nx - 4; i <= nx + 4; i++) for (let j = -ny - 2; j <= ny + 2; j++) {
    const x = o.x + i * colStep, y = o.y + j * d + (Math.abs(i) % 2 === 1 ? d / 2 : 0)
    const inside = Math.abs(x) + R <= hx + eps && Math.abs(y) + d / 2 <= hy + eps
    if (inside) complete.push({ x, y })
    else if (p.edgeCells && Math.abs(x) - R < hx - eps && Math.abs(y) - d / 2 < hy - eps) edge.push({ x, y })
  }
  return { complete, edge }
}

/** Hicks hexagon: соты из ячеек (стык в стык), в каждой вложенные шестиугольные кольца. Вырезы насквозь шириной gap, штрихи — материал. */
export function hicksCut(w: ManifoldToplevel, box: Box, p: HicksParams): CrossSection | null {
  const cell = hicksCell(w, p)
  if (!cell) return null
  const { complete, edge } = hicksCells(box, p)
  const whole = complete.map((c) => cell.translate([c.x, c.y]))
  const clip = w.CrossSection.square([box.width, box.height], true)
  const partial = edge.length ? [w.CrossSection.compose(edge.map((c) => cell.translate([c.x, c.y]))).intersect(clip)] : []
  const all = [...whole, ...partial]
  return all.length ? w.CrossSection.compose(all) : null
}
