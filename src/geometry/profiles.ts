import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import { CLEARANCE, FOOT_LAYERS, FOOT_R_TOP, R_MIN, SOCKET_LAYERS, SOCKET_R_TOP, type Layers } from './spec'

export type LipStyle = 'default' | 'thin' | 'none'

/** Слои стопорной губы коробки. «Thin» — укороченная губа без вертикального участка. */
export const LIP_LAYERS: Record<Exclude<LipStyle, 'none'>, Layers> = {
  default: { low: 0.7, wall: 1.8, up: 1.9 },
  thin: { low: 0.7, wall: 0, up: 1.9 },
}

/** Толщина слэба-шаблона. Верхний слой выступает на эту величину над номинальной высотой (удобно для чистого разреза). */
export const SLAB_T = 0.001

/** Тонкая плита со скруглёнными углами: шаблон для hull. width — полная ширина квадрата. */
export function slab(w: ManifoldToplevel, width: number, r: number, z: number): Manifold {
  const { CrossSection, Manifold } = w
  const inner = Math.max(width - 2 * r, 0.01)
  const rounded = CrossSection.square([inner, inner], true).offset(r, 'Round', 2, 24)
  return Manifold.extrude(rounded, SLAB_T).translate([0, 0, z])
}

/**
 * Слоистый профиль с центром в (0,0), основанием z=0: нижняя фаска, стенка, верхняя фаска.
 * topWidth — ширина по верхней кромке, rTop — радиус скругления на ней.
 */
export function layeredHull(w: ManifoldToplevel, topWidth: number, rTop: number, layers: Layers): Manifold {
  const { low, wall, up } = layers
  const mid = topWidth - 2 * up
  const bottom = mid - 2 * low
  const rMid = Math.max(rTop - up, R_MIN)
  const rLow = Math.max(rMid - low, R_MIN)
  const parts: Manifold[] = []
  let z = 0
  if (low > 0) { parts.push(w.Manifold.hull([slab(w, bottom, rLow, 0), slab(w, mid, rMid, low)])); z = low }
  if (wall > 0) { parts.push(w.Manifold.hull([slab(w, mid, rMid, z), slab(w, mid, rMid, z + wall)])); z += wall }
  if (up > 0) { parts.push(w.Manifold.hull([slab(w, mid, rMid, z), slab(w, topWidth, rTop, z + up)])) }
  return w.Manifold.union(parts)
}

/** Гнездо одной ячейки базовой плиты. Верх z = SOCKET_HEIGHT (+SLAB_T). */
export function socketPocket(w: ManifoldToplevel, pitch: number): Manifold {
  return layeredHull(w, pitch - 2 * CLEARANCE + 0.5, SOCKET_R_TOP, SOCKET_LAYERS)
}

/** Ширина гнезда по нижнему слою профиля: по ней вырезается окно ячейки под гнездом. */
export const socketWindowWidth = (pitch: number) => pitch - 2 * CLEARANCE + 0.5 - 2 * (SOCKET_LAYERS.up + SOCKET_LAYERS.low)

/**
 * Окно ячейки под гнездом: контур совпадает с нижним слоем гнезда, поэтому стенка продолжается без ступеньки.
 * Тело занимает z от zFrom до zTo.
 */
export function socketWindow(w: ManifoldToplevel, pitch: number, zFrom: number, zTo: number): Manifold {
  const { CrossSection, Manifold } = w
  const width = socketWindowWidth(pitch)
  const rMid = Math.max(SOCKET_R_TOP - SOCKET_LAYERS.up, R_MIN)
  const rLow = Math.max(rMid - SOCKET_LAYERS.low, R_MIN)
  const rounded = CrossSection.square([Math.max(width - 2 * rLow, 0.01), Math.max(width - 2 * rLow, 0.01)], true).offset(rLow, 'Round', 2, 24)
  return Manifold.extrude(rounded, zTo - zFrom).translate([0, 0, zFrom])
}

/** Нога коробки (твёрдое тело) для одной ячейки. Верх z = 4.75 (+SLAB_T). */
export function binFoot(w: ManifoldToplevel, pitch: number): Manifold {
  return layeredHull(w, pitch - 2 * CLEARANCE, FOOT_R_TOP, FOOT_LAYERS)
}

/** Проём стопорной губы: вычитается из верха стенок коробки. null для стиля none. */
export function lipProfile(w: ManifoldToplevel, pitch: number, style: LipStyle): Manifold | null {
  if (style === 'none') return null
  return layeredHull(w, pitch - 2 * CLEARANCE, FOOT_R_TOP, LIP_LAYERS[style])
}

/** Тонкая плита-прямоугольник со скруглёнными углами: шаблон для hull. */
export function rectSlab(w: ManifoldToplevel, wx: number, wy: number, r: number, z: number): Manifold {
  const { CrossSection, Manifold } = w
  const rr = Math.min(r, wx / 2 - 0.005, wy / 2 - 0.005)
  const cs = rr > 0.001
    ? CrossSection.square([Math.max(wx - 2 * rr, 0.01), Math.max(wy - 2 * rr, 0.01)], true).offset(rr, 'Round', 2, 24)
    : CrossSection.square([wx, wy], true)
  return Manifold.extrude(cs, SLAB_T).translate([0, 0, z])
}

/** Радиусы слоёв (нижний, средний) для заданного верхнего радиуса: как в layeredHull. */
export function layerRadii(rTop: number, layers: Layers) {
  const rMid = Math.max(rTop - layers.up, R_MIN)
  const rLow = Math.max(rMid - layers.low, R_MIN)
  return { rMid, rLow }
}

/** Слоистый профиль прямоугольника topX × topY (как layeredHull для квадрата): для стопорной губы целой коробки. */
export function layeredHullRect(w: ManifoldToplevel, topX: number, topY: number, rTop: number, layers: Layers): Manifold {
  const { low, wall, up } = layers
  const { rMid, rLow } = layerRadii(rTop, layers)
  const parts: Manifold[] = []
  let z = 0
  const s = (dx: number, r: number, zz: number) => rectSlab(w, topX - 2 * dx, topY - 2 * dx, r, zz)
  if (low > 0) { parts.push(w.Manifold.hull([s(up + low, rLow, 0), s(up, rMid, low)])); z = low }
  if (wall > 0) { parts.push(w.Manifold.hull([s(up, rMid, z), s(up, rMid, z + wall)])); z += wall }
  if (up > 0) parts.push(w.Manifold.hull([s(up, rMid, z), s(0, rTop, z + up)]))
  return w.Manifold.union(parts)
}

/** Общая высота слоёв губы. */
export const lipHeight = (style: LipStyle) => (style === 'none' ? 0 : LIP_LAYERS[style].low + LIP_LAYERS[style].wall + LIP_LAYERS[style].up)
