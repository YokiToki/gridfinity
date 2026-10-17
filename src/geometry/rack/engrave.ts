import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import type { Issue } from './patterns/types'
import type { Engrave } from './patterns/region'

/** Минимум материала за гравировкой: два периметра сопла 0.4 мм. */
export const ENGRAVE_FLOOR = 0.8
/** Предел глубины гравировки для панели такой толщины. */
export const maxEngraveDepth = (thickness: number) => Math.max(0, thickness - ENGRAVE_FLOOR)

/**
 * Вычитает гравировки из лицевой грани (верх панели, z = thickness): призма от грани вниз на глубину (больше предела — предел),
 * с запасом над гранью для чистого реза. Глубина 0 и меньше ничего не режет. Возвращает новое тело, исходное не трогает.
 */
export function applyEngrave(w: ManifoldToplevel, solid: Manifold, items: Engrave[], thickness: number): Manifold {
  const limit = maxEngraveDepth(thickness)
  let out = solid
  for (const it of items) {
    const depth = Math.min(it.depth, limit)
    if (depth <= 1e-9) continue
    const cutter = w.Manifold.extrude(it.shape, depth + 0.5).translate([0, 0, thickness - depth])
    const next = out.subtract(cutter)
    cutter.delete()
    if (out !== solid) out.delete()
    out = next
  }
  return out
}

/** Предупреждения о глубине выше предела: по одному на настройку, с пределом в value. */
export function engraveIssues(depths: { setting: string; depth: number }[], thickness: number): Issue[] {
  const max = maxEngraveDepth(thickness)
  return depths.filter((d) => d.depth > max + 1e-9).map((d) => ({ key: 'rack.warning.depth', setting: d.setting, value: max }))
}
