import type { Manifold } from 'manifold-3d'
import { roundedRectCS } from '../bin'
import { getWasm } from '../wasm'
import { applyEngrave } from './engrave'
import { cutPattern, patternIssues } from './patterns'
import { defaultPattern, type Issue, type PatternParams } from './patterns/types'
import { HEIGHT_TOLERANCE, MAX_UNITS, MIN_UNITS, RACK_WIDTH, rackLayout } from './spec'

export type EarPositions = 'all' | 'outer' | 'edges'
export type EarShape = 'round' | 'slot'
export interface EarParams { positions: EarPositions; shape: EarShape; /** Диаметр круга или ширина паза. */ size: number; /** Длина паза по горизонтали (как на стандартных панелях). */ slotLength: number }
export interface BackParams { enabled: boolean; thickness: number }

export interface RackPanelParams {
  units: number
  thickness: number
  cornerRadius: number
  /** Вычесть 0.45 мм из высоты, чтобы соседние панели помещались. */
  tolerance: boolean
  ears: EarParams
  pattern: PatternParams
  back: BackParams
}

export const defaultRackPanel: RackPanelParams = {
  units: 2, thickness: 3, cornerRadius: 3, tolerance: true,
  ears: { positions: 'all', shape: 'slot', size: 6.5, slotLength: 10 },
  pattern: defaultPattern,
  back: { enabled: false, thickness: 0.6 },
}

export const PANEL_LIMITS = { thickness: [1.5, 8], cornerRadius: [0, 10], earSize: [2, 12], backThickness: [0.2, 2], margin: [0, 30] } as const

const between = (v: number, [lo, hi]: readonly [number, number]) => v >= lo && v <= hi

/** Проверка параметров: errors останавливают построение (ключи rack.error.*), warnings только предупреждают (rack.warning.*). */
export function validateRackPanel(p: RackPanelParams): { errors: string[]; warnings: Issue[] } {
  const errors: string[] = []
  if (!Number.isInteger(p.units) || p.units < MIN_UNITS || p.units > MAX_UNITS) errors.push('rack.error.units')
  if (!between(p.thickness, PANEL_LIMITS.thickness)) errors.push('rack.error.thickness')
  if (!between(p.cornerRadius, PANEL_LIMITS.cornerRadius)) errors.push('rack.error.cornerRadius')
  if (!between(p.ears.size, PANEL_LIMITS.earSize)) errors.push('rack.error.earSize')
  else if (p.ears.shape === 'slot' && p.ears.slotLength < p.ears.size) errors.push('rack.error.slotLength')
  if (p.back.enabled && !between(p.back.thickness, PANEL_LIMITS.backThickness)) errors.push('rack.error.backThickness')
  if (!between(p.pattern.margin, PANEL_LIMITS.margin)) errors.push('rack.error.margin')
  if (errors.length) return { errors, warnings: [] }
  const l = rackLayout(p.units, p.tolerance ? HEIGHT_TOLERANCE : 0, p.pattern.margin)
  const warnings: Issue[] = []
  if (p.pattern.kind !== 'none') {
    if (l.region.x1 - l.region.x0 <= 0 || l.region.y1 - l.region.y0 <= 0) errors.push('rack.error.region')
    else warnings.push(...patternIssues(p.pattern, l.region, p.thickness))
  }
  return { errors, warnings }
}

/** Вырез отверстий ушей: оба уха, по юнитам, в осях панели (X от середины, Y от нижней кромки). */
function earCut(w: Awaited<ReturnType<typeof getWasm>>, p: RackPanelParams, holes: ReturnType<typeof rackLayout>['holes']) {
  const { CrossSection } = w
  // edges: только нижнее отверстие первого юнита и верхнее последнего (4 на панель при любом числе юнитов)
  const used = holes.filter((h, i) => p.ears.positions === 'all' || (p.ears.positions === 'outer' && h.slot !== 1) || (p.ears.positions === 'edges' && (i === 0 || i === holes.length - 1)))
  if (!used.length) return null
  const one = p.ears.shape === 'round' ? CrossSection.circle(p.ears.size / 2, 48) : roundedRectCS(w, Math.max(p.ears.slotLength, p.ears.size), p.ears.size, p.ears.size / 2, 24)
  return CrossSection.compose(used.flatMap((h) => [one.translate([h.x, h.y]), one.translate([-h.x, h.y])]))
}

export interface BuiltRackPanel { panel: Manifold | null; back: Manifold | null; /** Ключ rack.error.* при невозможности построить. */ error?: string; warnings: Issue[] }

/**
 * Панель стойки: z от 0 (задняя грань) до толщины (лицевая), X от середины, Y от нижней кромки. Задняя стенка стоит позади, z от −t до 0.
 * Узор может разрезать панель на части: тогда построение отклоняется (rack.error.disconnected).
 */
export async function buildRackPanel(p: RackPanelParams, wasmUrl?: string): Promise<BuiltRackPanel> {
  const v = validateRackPanel(p)
  if (v.errors.length) return { panel: null, back: null, error: v.errors[0], warnings: [] }
  const w = await getWasm(wasmUrl)
  const { Manifold } = w
  const l = rackLayout(p.units, p.tolerance ? HEIGHT_TOLERANCE : 0, p.pattern.margin)
  const r = Math.min(p.cornerRadius, l.height / 2 - 0.01)
  const outline = roundedRectCS(w, RACK_WIDTH, l.height, r, 48).translate([0, l.height / 2])
  const ears = earCut(w, p, l.holes)
  const base = ears ? outline.subtract(ears) : outline
  const cut = cutPattern(w, p.pattern, l.region)
  const plan = cut.through ? base.subtract(cut.through) : base
  const solid = Manifold.extrude(plan, p.thickness)
  const parts = solid.decompose()
  const pieces = parts.length
  parts.forEach((q) => q.delete())
  if (pieces > 1) { solid.delete(); return { panel: null, back: null, error: 'rack.error.disconnected', warnings: v.warnings } }
  const panel = cut.engrave?.length ? applyEngrave(w, solid, cut.engrave, p.thickness) : solid
  if (panel !== solid) solid.delete()
  const back = p.back.enabled ? Manifold.extrude(base, p.back.thickness).translate([0, 0, -p.back.thickness]) : null
  return { panel, back, warnings: v.warnings }
}
