import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import { roundedRectCS } from '../../bin'
import { centredRun, type Box } from './region'
import type { PillsParams } from './types'

export interface Pill { x: number; y: number; width: number; height: number }

/**
 * Вертикальные «таблетки» сеткой с шагом width + wall по X и height + wall по Y. Остаток по высоте с каждого края (меньше шага)
 * можно занять укороченными таблетками, если они не короче своей ширины (иначе это был бы уже не паз).
 */
export function pillsLayout(box: Box, s: PillsParams): Pill[] {
  const xs = centredRun(box.width, s.width, s.width + s.wall), ys = centredRun(box.height, s.height, s.height + s.wall)
  const out: Pill[] = []
  for (const x of xs) for (const y of ys) out.push({ x, y, width: s.width, height: s.height })
  if (s.edgePills && ys.length) {
    const used = ys[ys.length - 1] - ys[0] + s.height
    const e = (box.height - used) / 2 - s.wall
    if (e >= s.width - 1e-9) {
      const y = used / 2 + s.wall + e / 2
      for (const x of xs) { out.push({ x, y, width: s.width, height: e }); out.push({ x, y: -y, width: s.width, height: e }) }
    }
  }
  return out
}

export function pillsCut(w: ManifoldToplevel, box: Box, s: PillsParams): CrossSection | null {
  const pills = pillsLayout(box, s)
  if (!pills.length) return null
  return w.CrossSection.compose(pills.map((p) => roundedRectCS(w, p.width, p.height, p.width / 2, 32).translate([p.x, p.y])))
}
