import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import { binFoot, layeredHullRect, lipHeight, rectSlab, LIP_LAYERS, layerRadii, type LipStyle } from './profiles'
import { cellCenters, footprintFromSize, type Footprint } from './footprint'
import { axisMm, type AxisSize } from './baseplate'
import { allPositions, magnetSize, type FastenerConfig } from './fasteners'
import { CLEARANCE, FOOT_LAYERS, FOOT_R_TOP, HEIGHT_UNIT, R_MIN, layersHeight } from './spec'

/** Общая основа Box и Cutout: габарит, ноги, тело, губа, крепёж снизу. */
export interface BinHeight { mode: 'units' | 'mm'; value: number }
export interface BinThickness { outerWall: number; innerWall: number; floor: number }

export interface BinParams {
  pitch: number
  x: AxisSize
  y: AxisSize
  height: BinHeight
  thickness: BinThickness
  lip: LipStyle
  fasteners: FastenerConfig
}

/** Высота ноги коробки. */
export const FOOT_HEIGHT = layersHeight(FOOT_LAYERS) // 4.75

export const binHeightMm = (h: BinHeight) => (h.mode === 'units' ? h.value * HEIGHT_UNIT : h.value)

export interface BinLayout {
  fp: Footprint
  sizeX: number
  sizeY: number
  /** Внешний габарит корпуса: размер минус зазор 0.5 мм. */
  outerX: number
  outerY: number
  /** Внутренняя полость в плане (внутри внешней стенки). */
  cavityX: number
  cavityY: number
  /** Высота стенок без губы и полная высота с губой. */
  wallTop: number
  lipH: number
  total: number
  /** Низ полости или поверхность пола: над ногой плюс толщина пола. */
  cavityBottom: number
}

export const binLayout = (p: BinParams): BinLayout => {
  const sizeX = axisMm(p.x, p.pitch), sizeY = axisMm(p.y, p.pitch)
  const outerX = sizeX - 2 * CLEARANCE, outerY = sizeY - 2 * CLEARANCE
  const wallTop = binHeightMm(p.height)
  const lipH = lipHeight(p.lip)
  return {
    fp: footprintFromSize(sizeX, sizeY, p.pitch, p.x.align, p.y.align), sizeX, sizeY, outerX, outerY,
    cavityX: outerX - 2 * p.thickness.outerWall, cavityY: outerY - 2 * p.thickness.outerWall,
    wallTop, lipH, total: wallTop + lipH, cavityBottom: FOOT_HEIGHT + p.thickness.floor,
  }
}

export const roundedRectCS = (w: ManifoldToplevel, x: number, y: number, r: number) => {
  const rr = Math.min(r, x / 2 - 0.005, y / 2 - 0.005)
  return rr > 0.001
    ? w.CrossSection.square([Math.max(x - 2 * rr, 0.01), Math.max(y - 2 * rr, 0.01)], true).offset(rr, 'Round', 2, 24)
    : w.CrossSection.square([x, y], true)
}

export const prism = (w: ManifoldToplevel, x: number, y: number, r: number, z0: number, z1: number) =>
  w.Manifold.extrude(roundedRectCS(w, x, y, r), z1 - z0).translate([0, 0, z0])

/** Ноги на полных ячейках и тело над ними (сплошное, до полной высоты). */
export function buildBinBody(w: ManifoldToplevel, p: BinParams, l: BinLayout): Manifold {
  const foot = binFoot(w, p.pitch)
  const feet = cellCenters(l.fp).map((c) => foot.translate([c.x, c.y, 0]))
  const body = prism(w, l.outerX, l.outerY, FOOT_R_TOP, FOOT_HEIGHT - 0.001, l.total)
  return w.Manifold.union([body, ...feet])
}

/** Проём стопорной губы над стенкой: сверху чуть уже габарита, чтобы на кромке оставалась тонкая плоскость. */
export function lipOpening(w: ManifoldToplevel, lip: LipStyle, l: BinLayout): Manifold | null {
  if (lip === 'none') return null
  return layeredHullRect(w, l.outerX - 0.2, l.outerY - 0.2, FOOT_R_TOP - 0.1, LIP_LAYERS[lip]).translate([0, 0, l.wallTop])
}

/** Отверстия в ногах снизу: магнитные гнёзда от дна вверх, винтовые — глухие в ногу. */
export function bottomFasteners(w: ManifoldToplevel, p: BinParams, l: BinLayout): Manifold[] {
  const pos = allPositions(p.fasteners, l.fp)
  const m = magnetSize(p.fasteners)
  const out: Manifold[] = []
  for (const q of pos.magnets) out.push(w.Manifold.cylinder(m.depth + 1, m.d / 2, m.d / 2, 32).translate([q.x, q.y, -1]))
  const sr = p.fasteners.screwD / 2
  for (const q of pos.screws) out.push(w.Manifold.cylinder(FOOT_HEIGHT + 1, sr, sr, 24).translate([q.x, q.y, -1]))
  return out
}

export { layerRadii, rectSlab, R_MIN }
