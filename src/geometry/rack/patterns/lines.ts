import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import { roundedRectCS } from '../../bin'
import { centredRun, type Box } from './region'
import type { LinesParams, PassthroughParams } from './types'

/** Горизонтальные пазы на всю ширину области: центры по Y, шаг height + wall. */
export const lineRows = (box: Box, s: LinesParams) => centredRun(box.height, s.height, s.height + s.wall)

export function linesCut(w: ManifoldToplevel, box: Box, s: LinesParams): CrossSection | null {
  const ys = lineRows(box, s)
  if (!ys.length) return null
  const one = roundedRectCS(w, box.width, s.height, s.height / 2, 24)
  return w.CrossSection.compose(ys.map((y) => one.translate([0, y])))
}

/** Один проём на всю область; borderX и borderY — дополнительная сплошная кромка с каждой стороны. */
export function passthroughCut(w: ManifoldToplevel, box: Box, s: PassthroughParams): CrossSection | null {
  const width = box.width - 2 * s.borderX, height = box.height - 2 * s.borderY
  if (width <= 0.01 || height <= 0.01) return null
  return roundedRectCS(w, width, height, s.radius, 32)
}
