import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import { centredRun, type Box } from './region'
import type { HexParams } from './types'

export interface Hex { x: number; y: number }
const SQRT3 = Math.sqrt(3)

/** Радиус описанной окружности отверстия при ширине «между гранями» width. */
export const hexRadius = (width: number) => width / SQRT3

/**
 * Соты с вершинами слева и справа: шаг между центрами соседей width + wall по нормали к грани, поэтому стенка равна wall.
 * Колонки через 1.5 радиуса ячейки, нечётные сдвинуты на полшага. Шестиугольник берётся целиком (по габариту) и группа центрируется.
 */
export function hexCells(box: Box, h: HexParams): Hex[] {
  const d = h.width + h.wall, R = hexRadius(h.width), colStep = (d * SQRT3) / 2
  const cols = centredRun(box.width, 2 * R, colStep)
  const cells: Hex[] = []
  // высота колонки: чётные колонки идут на целых шагах, нечётные на полу-шагах; группа центрируется по Y общим габаритом
  cols.forEach((x, i) => {
    const off = i % 2 === 0 ? 0 : d / 2
    const half = (box.height - h.width) / 2
    const lo = Math.ceil((-half - off) / d - 1e-9), hi = Math.floor((half - off) / d + 1e-9)
    for (let k = lo; k <= hi; k++) cells.push({ x, y: off + k * d })
  })
  if (!cells.length) return cells
  const mid = (Math.min(...cells.map((c) => c.y)) + Math.max(...cells.map((c) => c.y))) / 2
  return cells.map((c) => ({ x: c.x, y: c.y - mid }))
}

export function hexCut(w: ManifoldToplevel, box: Box, h: HexParams): CrossSection | null {
  const cells = hexCells(box, h)
  if (!cells.length) return null
  const R = hexRadius(h.width)
  const poly = Array.from({ length: 6 }, (_, k): [number, number] => [R * Math.cos((k * Math.PI) / 3), R * Math.sin((k * Math.PI) / 3)])
  const one = w.CrossSection.ofPolygons([poly])
  return w.CrossSection.compose(cells.map((c) => one.translate([c.x, c.y])))
}
