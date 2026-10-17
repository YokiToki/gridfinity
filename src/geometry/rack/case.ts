import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d'
import { roundedRectCS } from '../bin'
import { getWasm } from '../wasm'
import { defaultRackPanel, plateBase, type EarParams } from './panel'
import { hexCut } from './patterns/hex'
import { MIN_FEATURE, type Issue } from './patterns/types'
import { HEIGHT_TOLERANCE, KEYSTONE_H, KEYSTONE_PITCH, KEYSTONE_W, MAX_UNITS, RACK_UNIT, RACK_WINDOW } from './spec'

export type KeystoneSide = 'left' | 'right' | 'below'
export interface DeviceParams { width: number; depth: number; height: number }
export interface UnitsParams { /** true — минимальное число юнитов, иначе value (не меньше минимального). */ auto: boolean; value: number }
export interface WindowParams { enabled: boolean; /** Насколько пластина заходит на край устройства. */ lip: number }
export interface KeystoneParams { count: number; side: KeystoneSide }
export interface CableParams { /** 0, 1 или 2 отверстия: по одному в свободной зоне сбоку от корпуса. */ count: number; diameter: number }
export interface VentParams { enabled: boolean; /** Ширина шестиугольника между гранями. */ width: number; wall: number; /** Отступ узора от краёв стенки и от пластины. */ margin: number }

export interface RackCaseParams {
  device: DeviceParams
  /** Зазор между устройством и оболочкой. */
  gap: number
  wall: number
  plateThickness: number
  units: UnitsParams
  cornerRadius: number
  tolerance: boolean
  ears: EarParams
  window: WindowParams
  keystones: KeystoneParams
  cable: CableParams
  vents: VentParams
}

export const defaultRackCase: RackCaseParams = {
  device: { width: 120, depth: 160, height: 40 },
  gap: 0.4, wall: 2, plateThickness: 3,
  units: { auto: true, value: 2 },
  cornerRadius: 3, tolerance: true,
  ears: defaultRackPanel.ears,
  window: { enabled: true, lip: 3 },
  keystones: { count: 0, side: 'right' },
  cable: { count: 0, diameter: 8 },
  vents: { enabled: false, width: 8, wall: 1.6, margin: 6 },
}

export const CASE_LIMITS = { width: [10, 260], depth: [10, 400], height: [10, 500], gap: [0, 5], wall: [0.8, 10], plate: [1.5, 8], lip: [0, 50], cable: [2, 30], vent: [3, 40], ventWall: [0.2, 10], ventMargin: [1, 40], keystones: [0, 6] } as const
const between = (v: number, [lo, hi]: readonly [number, number]) => v >= lo && v <= hi
/** Поле между свободной зоной пластины и рейками / краем корпуса. */
const EDGE = 3

/** Размеры корпуса, число юнитов и положение окна (Y от нижней кромки пластины, X от середины). */
export function caseLayout(p: RackCaseParams) {
  const d = p.device, t = p.gap + p.wall
  const outerW = d.width + 2 * t, outerH = d.height + 2 * t, shellLen = d.depth + p.gap
  const tol = p.tolerance ? HEIGHT_TOLERANCE : 0
  const autoUnits = Math.max(1, Math.ceil((outerH + tol) / RACK_UNIT - 1e-9))
  const raised = !p.units.auto && p.units.value < autoUnits
  const units = p.units.auto ? autoUnits : Math.max(Math.round(p.units.value), autoUnits)
  const plateH = units * RACK_UNIT - tol
  return {
    outerW, outerH, shellLen, autoUnits, units, raised, plateH, centreY: plateH / 2,
    cavityW: d.width + 2 * p.gap, cavityH: d.height + 2 * p.gap,
    window: { width: d.width - 2 * p.window.lip, height: d.height - 2 * p.window.lip },
    /** На сколько корпус шире окна между рейками (≤ 0 — помещается). */
    excess: outerW - RACK_WINDOW,
  }
}

/** Ошибки (rack.error.*, останавливают построение; excess — на сколько мм шире окна) и предупреждения (rack.warning.*). */
export function validateRackCase(p: RackCaseParams): { errors: string[]; warnings: Issue[]; excess: number } {
  const errors: string[] = []
  const d = p.device
  if (!between(d.width, CASE_LIMITS.width) || !between(d.depth, CASE_LIMITS.depth) || !between(d.height, CASE_LIMITS.height)) errors.push('rack.error.device')
  if (!between(p.gap, CASE_LIMITS.gap)) errors.push('rack.error.gap')
  if (!between(p.wall, CASE_LIMITS.wall)) errors.push('rack.error.wall')
  if (!between(p.plateThickness, CASE_LIMITS.plate)) errors.push('rack.error.thickness')
  if (!between(p.cornerRadius, [0, 10])) errors.push('rack.error.cornerRadius')
  if (!between(p.ears.size, [2, 12])) errors.push('rack.error.earSize')
  else if (p.ears.shape === 'slot' && p.ears.slotLength < p.ears.size) errors.push('rack.error.slotLength')
  if (p.window.enabled && (p.window.lip < 0 || p.window.lip > (Math.min(d.width, d.height) - 4) / 2)) errors.push('rack.error.lip')
  if (p.vents.enabled && (!between(p.vents.width, CASE_LIMITS.vent) || !between(p.vents.wall, CASE_LIMITS.ventWall) || !between(p.vents.margin, CASE_LIMITS.ventMargin))) errors.push('rack.error.vents')
  if (!between(p.keystones.count, CASE_LIMITS.keystones) || !Number.isInteger(p.keystones.count)) errors.push('rack.error.keystones')
  if (![0, 1, 2].includes(p.cable.count) || (p.cable.count > 0 && !between(p.cable.diameter, CASE_LIMITS.cable))) errors.push('rack.error.cable')
  if (errors.length) return { errors, warnings: [], excess: 0 }
  const l = caseLayout(p)
  if (l.excess > 1e-9) errors.push('rack.error.tooWide')
  if (l.units > MAX_UNITS) errors.push('rack.error.tooTall')
  const warnings: Issue[] = []
  if (p.vents.enabled && p.vents.wall < MIN_FEATURE - 1e-9) warnings.push({ key: 'rack.warning.thin', setting: 'ventWall' })
  if (!errors.length) warnings.push(...frontExtras(p, l).warnings)
  return { errors, warnings, excess: Math.max(0, l.excess) }
}

export interface Opening { x: number; y: number }
/**
 * Положение keystone и кабельных отверстий в свободной зоне пластины: между корпусом и рейками (по бокам) или под корпусом. Что не
 * помещается, не вырезается, а предупреждение называет, что именно (setting: keystones | cable).
 */
export function frontExtras(p: RackCaseParams, l = caseLayout(p)): { keystones: Opening[]; cables: Opening[]; warnings: Issue[] } {
  const rail = RACK_WINDOW / 2 - EDGE, warnings: Issue[] = []
  const sideWidth = rail - (l.outerW / 2 + EDGE) // ширина свободной зоны с каждой стороны
  const sideX = (side: 'left' | 'right') => (side === 'right' ? 1 : -1) * ((l.outerW / 2 + EDGE + rail) / 2)
  const keystones: Opening[] = [], cables: Opening[] = []
  const n = p.keystones.count
  const usedSides = new Set<string>()
  if (n > 0) {
    if (p.keystones.side === 'below') {
      const strip = l.centreY - l.outerH / 2 - 2 * EDGE // высота полосы под корпусом
      const rowW = (n - 1) * KEYSTONE_PITCH + KEYSTONE_W
      if (strip >= KEYSTONE_H && rowW <= 2 * rail) {
        const y = EDGE + strip / 2
        for (let i = 0; i < n; i++) keystones.push({ x: (i - (n - 1) / 2) * KEYSTONE_PITCH, y })
      } else warnings.push({ key: 'rack.warning.fit', setting: 'keystones' })
    } else {
      const colH = (n - 1) * KEYSTONE_PITCH + KEYSTONE_H
      if (sideWidth >= KEYSTONE_W && colH <= l.plateH - 2 * EDGE) {
        usedSides.add(p.keystones.side)
        for (let i = 0; i < n; i++) keystones.push({ x: sideX(p.keystones.side), y: l.centreY + (i - (n - 1) / 2) * KEYSTONE_PITCH })
      } else warnings.push({ key: 'rack.warning.fit', setting: 'keystones' })
    }
  }
  // кабельные отверстия: по стороне без keystone; сначала правая
  const sides = (['right', 'left'] as const).filter((s) => !usedSides.has(s)).slice(0, p.cable.count)
  if (p.cable.count > 0) {
    if (sides.length < p.cable.count || sideWidth < p.cable.diameter || p.cable.diameter > l.plateH - 2 * EDGE) warnings.push({ key: 'rack.warning.fit', setting: 'cable' })
    else for (const s of sides) cables.push({ x: sideX(s), y: l.centreY })
  }
  return { keystones, cables, warnings }
}

export interface BuiltRackCase { solid: Manifold | null; error?: string; excess?: number; warnings: Issue[] }

/** Вырез окна и отверстий в плоскости пластины: X от середины, Y от нижней кромки. */
function frontCut(w: ManifoldToplevel, p: RackCaseParams, l: ReturnType<typeof caseLayout>, extras: ReturnType<typeof frontExtras>): CrossSection | null {
  const { CrossSection } = w
  const parts: CrossSection[] = []
  if (p.window.enabled) parts.push(roundedRectCS(w, l.window.width, l.window.height, 2, 24).translate([0, l.centreY]))
  const key = CrossSection.square([KEYSTONE_W, KEYSTONE_H], true)
  for (const o of extras.keystones) parts.push(key.translate([o.x, o.y]))
  for (const o of extras.cables) parts.push(CrossSection.circle(p.cable.diameter / 2, 48).translate([o.x, o.y]))
  return parts.length ? CrossSection.union(parts) : null
}

/**
 * Вырезы-соты в трёх стенках оболочки: верх и оба бока. Узор строится плоским в оси стенки и выдавливается только на толщину стенки
 * (внутренняя грань совпадает с полостью, наружу запас), так что полость не затрагивается.
 */
export function ventCutters(w: ManifoldToplevel, p: RackCaseParams, l: ReturnType<typeof caseLayout>): Manifold[] {
  const v = p.vents, m = v.margin, T = p.wall + 1, out: Manifold[] = []
  const zc = -l.shellLen / 2, top = l.centreY + l.outerH / 2, side = l.outerW / 2
  const topBox = { width: l.outerW - 2 * m, height: l.shellLen - 2 * m }, sideBox = { width: l.shellLen - 2 * m, height: l.outerH - 2 * m }
  const hex = { width: v.width, wall: v.wall }
  const topCs = topBox.width > v.width && topBox.height > v.width ? hexCut(w, topBox, hex) : null
  const sideCs = sideBox.width > v.width && sideBox.height > v.width ? hexCut(w, sideBox, hex) : null
  if (topCs) out.push(w.Manifold.extrude(topCs, T).rotate([90, 0, 0]).translate([0, top + 1, zc]))
  if (sideCs) {
    out.push(w.Manifold.extrude(sideCs, T).rotate([0, 90, 0]).translate([side - p.wall, l.centreY, zc]))
    out.push(w.Manifold.extrude(sideCs, T).rotate([0, -90, 0]).translate([-(side - p.wall), l.centreY, zc]))
  }
  return out
}

/**
 * Корпус: пластина с ушами и оболочка позади неё, открытая сзади. Строится с лицевой гранью сверху (пластина z от 0 до толщины, оболочка
 * z от −(глубина + зазор) до 0), затем зеркалится по z: лицевая грань лежит на z = 0 (на столе при печати), оболочка растёт вверх.
 * Оболочка по центру пластины по X и по высоте. Окно и отверстия режутся в пластине, соты — в стенках.
 */
export async function buildRackCase(p: RackCaseParams, wasmUrl?: string): Promise<BuiltRackCase> {
  const v = validateRackCase(p)
  if (v.errors.length) return { solid: null, error: v.errors[0], excess: v.excess, warnings: [] }
  const w = await getWasm(wasmUrl)
  const { Manifold } = w
  const l = caseLayout(p)
  const { base } = plateBase(w, l.units, p.tolerance, p.cornerRadius, p.ears)
  const extras = frontExtras(p, l)
  const front = frontCut(w, p, l, extras)
  const plate = Manifold.extrude(front ? base.subtract(front) : base, p.plateThickness)
  const outer = Manifold.extrude(roundedRectCS(w, l.outerW, l.outerH, 0, 4), l.shellLen).translate([0, l.centreY, -l.shellLen])
  const cavity = Manifold.extrude(roundedRectCS(w, l.cavityW, l.cavityH, 0, 4), l.shellLen + 1).translate([0, l.centreY, -l.shellLen - 1])
  let shell = outer.subtract(cavity)
  if (p.vents.enabled) for (const c of ventCutters(w, p, l)) { shell = shell.subtract(c) }
  const built = plate.add(shell)
  const solid = built.mirror([0, 0, 1]).translate([0, 0, p.plateThickness])
  built.delete()
  const parts = solid.decompose(), pieces = parts.length
  parts.forEach((q) => q.delete())
  if (pieces > 1) { solid.delete(); return { solid: null, error: 'rack.error.disconnected', warnings: v.warnings } }
  return { solid, warnings: v.warnings }
}
