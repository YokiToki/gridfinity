import { baseplateFootprint, defaultParams, type BaseplateParams } from '../../geometry/baseplate'
import { defaultFasteners, slotsFromPoints, type FastenerKind } from '../../geometry/fasteners'
import type { Point } from '../../geometry/footprint'

const isPoint = (p: unknown): p is Point => !!p && typeof (p as Point).x === 'number' && typeof (p as Point).y === 'number'

/** Старый формат вида: булев флаг прототипа или manual-точки в координатах. */
function migrateKind(old: unknown, current: unknown, params: BaseplateParams): FastenerKind | undefined {
  if (old === true) return { mode: 'full', slots: [] }
  if (old === false) return { mode: 'none', slots: [] }
  if (!current || typeof current !== 'object') return undefined
  const k = current as { mode?: unknown; manual?: unknown; slots?: unknown }
  const mode = k.mode === 'none' || k.mode === 'corner' || k.mode === 'full' || k.mode === 'manual' ? k.mode : 'none'
  if (Array.isArray(k.slots)) return { mode, slots: k.slots as FastenerKind['slots'] }
  const points = Array.isArray(k.manual) ? k.manual.filter(isPoint) : []
  // координаты → ближайшие стандартные позиции текущей сетки (до 3 мм), остальные отбрасываем
  return { mode, slots: slotsFromPoints(points, baseplateFootprint(params)) }
}

/**
 * Прототип хранил `magnets`/`screws` как boolean (true → Full). Затем manual-режим хранил точки в координатах;
 * теперь выбор хранится слотами «ячейка + угол».
 */
export function migrateBaseplate(raw: Record<string, unknown>): Record<string, unknown> {
  const oldFlags = 'magnets' in raw || 'screws' in raw
  const f = raw.fasteners as Record<string, unknown> | undefined
  const needsPoints = !!f && [f.magnets, f.screws].some((k) => !!k && typeof k === 'object' && !('slots' in (k as object)))
  if (!oldFlags && !needsPoints) return raw
  const { magnets, screws, fasteners, ...rest } = raw
  const params = { ...defaultParams, ...rest } as BaseplateParams
  const cur = (fasteners ?? {}) as Record<string, unknown>
  return {
    ...rest,
    fasteners: {
      ...defaultFasteners,
      ...cur,
      magnets: migrateKind(magnets, cur.magnets, params) ?? defaultFasteners.magnets,
      screws: migrateKind(screws, cur.screws, params) ?? defaultFasteners.screws,
    },
  }
}
