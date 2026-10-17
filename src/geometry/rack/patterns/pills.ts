import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import { roundedRectCS } from '../../bin'
import { centredRun, type Box } from './region'
import type { PillsParams } from './types'

export interface Pill { x: number; y: number; /** Размер по X. */ length: number; /** Размер по Y. */ width: number }

/**
 * Горизонтальные «таблетки» кирпичной кладкой: ряды через width + wall по Y, в ряду шаг length + wall, каждый нечётный ряд сдвинут на
 * полшага. Остаток в конце ряда (меньше шага) можно занять укороченными таблетками, если они не короче своей ширины.
 */
export function pillsLayout(box: Box, s: PillsParams): Pill[] {
  const rows = centredRun(box.height, s.width, s.width + s.wall), step = s.length + s.wall
  const out: Pill[] = []
  rows.forEach((y, j) => {
    const off = j % 2 === 1 ? step / 2 : 0
    const half = (box.width - s.length) / 2
    const lo = Math.ceil((-half - off) / step - 1e-9), hi = Math.floor((half - off) / step + 1e-9)
    if (lo > hi) return
    for (let i = lo; i <= hi; i++) out.push({ x: off + i * step, y, length: s.length, width: s.width })
    if (s.edgePills) {
      const first = off + lo * step - s.length / 2
      const e = first + box.width / 2 - s.wall // свободное место слева (то же справа: ряд симметричен) за вычетом стенки
      if (e >= s.width - 1e-9) {
        out.push({ x: -box.width / 2 + e / 2, y, length: e, width: s.width })
        out.push({ x: box.width / 2 - e / 2, y, length: e, width: s.width })
      }
    }
  })
  return out
}

export function pillsCut(w: ManifoldToplevel, box: Box, s: PillsParams): CrossSection | null {
  const pills = pillsLayout(box, s)
  if (!pills.length) return null
  return w.CrossSection.compose(pills.map((p) => roundedRectCS(w, p.length, p.width, p.width / 2, 32).translate([p.x, p.y])))
}
