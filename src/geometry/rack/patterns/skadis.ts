import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import { roundedRectCS } from '../../bin'
import { centredRun, type Box } from './region'
import type { SkadisParams } from './types'

export interface Slot { x: number; y: number }

/**
 * Центры пазов Skadis в осях области (центр в нуле): ряды через rowStep, в ряду паз через pitch, каждый нечётный ряд сдвинут на shift.
 * Берутся только пазы целиком внутри области; вся группа затем центрируется по X, так что поля слева и справа равны.
 */
export function skadisSlots(box: Box, s: SkadisParams): Slot[] {
  const rows = centredRun(box.height, s.slotLength, s.rowStep)
  const slots: Slot[] = []
  rows.forEach((y, j) => {
    const free = box.width - s.slotWidth, half = free / 2
    const off = j % 2 === 1 ? s.shift : 0
    const lo = Math.ceil((-half - off) / s.pitch - 1e-9), hi = Math.floor((half - off) / s.pitch + 1e-9)
    for (let i = lo; i <= hi; i++) slots.push({ x: off + i * s.pitch, y })
  })
  if (!slots.length) return slots
  const mid = (Math.min(...slots.map((q) => q.x)) + Math.max(...slots.map((q) => q.x))) / 2
  return slots.map((q) => ({ x: q.x - mid, y: q.y }))
}

export function skadisCut(w: ManifoldToplevel, box: Box, s: SkadisParams): CrossSection | null {
  const slots = skadisSlots(box, s)
  if (!slots.length) return null
  const one = roundedRectCS(w, s.slotWidth, s.slotLength, Math.min(s.slotWidth, s.slotLength) / 2, 32)
  return w.CrossSection.compose(slots.map((q) => one.translate([q.x, q.y])))
}
