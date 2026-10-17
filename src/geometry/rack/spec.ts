/** Размеры 10-дюймовой стойки (мм). Из чертежа стандарта; проверяются тестом, внутри построителей не читаются как «шаг». */
export const RACK_UNIT = 44.45
export const RACK_WIDTH = 254
/** Расстояние между центрами отверстий левого и правого уха. */
export const EAR_HOLE_SPACING = 236.525
/** Окно между направляющими, где можно резать узор. */
export const RACK_WINDOW = 222.25
/** Положения отверстий внутри одного юнита от его нижней кромки. */
export const HOLE_OFFSETS = [6.35, 22.225, 38.1] as const
/** Допуск по высоте, чтобы соседние панели не упирались друг в друга. */
export const HEIGHT_TOLERANCE = 0.45
export const MIN_UNITS = 1
export const MAX_UNITS = 10

export interface EarHole { /** Центр относительно середины панели по X. */ x: number; /** От нижней кромки панели. */ y: number; /** Позиция в юните: 0 и 2 внешние, 1 средняя. */ slot: 0 | 1 | 2 }
export interface RackRegion { x0: number; x1: number; y0: number; y1: number }

/**
 * Раскладка панели: высота, центры отверстий каждого уха (на юнит три) и область узора. Начало: X от середины панели, Y от её нижней кромки.
 * Допуск съедается сверху, поэтому отверстия остаются на стандартных местах от нижней кромки юнита.
 */
export function rackLayout(units: number, tolerance: number, margin = 0) {
  const height = units * RACK_UNIT - tolerance
  const holes: EarHole[] = []
  for (let k = 0; k < units; k++) HOLE_OFFSETS.forEach((o, i) => holes.push({ x: EAR_HOLE_SPACING / 2, y: k * RACK_UNIT + o, slot: i as 0 | 1 | 2 }))
  const region: RackRegion = { x0: -(RACK_WINDOW / 2 - margin), x1: RACK_WINDOW / 2 - margin, y0: margin, y1: height - margin }
  return { width: RACK_WIDTH, height, holes, region, window: RACK_WINDOW }
}
