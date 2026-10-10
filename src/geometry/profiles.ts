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

/** Нога коробки (твёрдое тело) для одной ячейки. Верх z = 4.75 (+SLAB_T). */
export function binFoot(w: ManifoldToplevel, pitch: number): Manifold {
  return layeredHull(w, pitch - 2 * CLEARANCE, FOOT_R_TOP, FOOT_LAYERS)
}

/** Проём стопорной губы: вычитается из верха стенок коробки. null для стиля none. */
export function lipProfile(w: ManifoldToplevel, pitch: number, style: LipStyle): Manifold | null {
  if (style === 'none') return null
  return layeredHull(w, pitch - 2 * CLEARANCE, FOOT_R_TOP, LIP_LAYERS[style])
}
