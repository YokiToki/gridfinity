import { CLEARANCE, DEFAULT_PITCH } from './spec'

/** Настройки толщин, мм. Каждый режим использует нужное ему подмножество. */
export interface Thickness {
  outerWall: number
  innerWall: number
  floor: number
  lip: number
  clearance: number
  /** Допуск печати для вырезов и посадок. */
  tolerance: number
}

export const defaultThickness: Thickness = {
  outerWall: 0.95,
  innerWall: 1.2,
  floor: 0.7,
  lip: 1.2,
  clearance: CLEARANCE,
  tolerance: 0.1,
}

export interface ThicknessError { field: keyof Thickness; key: string }
export interface ThicknessResult { ok: boolean; errors: ThicknessError[] }

/** Проверка толщин. key — ключ перевода (thickness.*), без готового текста. */
export function validateThickness(t: Thickness, pitch = DEFAULT_PITCH): ThicknessResult {
  const errors: ThicknessError[] = []
  const bad = (field: keyof Thickness, key: string) => errors.push({ field, key })
  for (const f of ['outerWall', 'innerWall', 'floor', 'lip'] as const) {
    if (!Number.isFinite(t[f])) bad(f, 'thickness.invalid')
    else if (t[f] < 0) bad(f, 'thickness.negative')
    else if (t[f] === 0 && f !== 'lip') bad(f, 'thickness.zero')
  }
  for (const f of ['clearance', 'tolerance'] as const) {
    if (!Number.isFinite(t[f])) bad(f, 'thickness.invalid')
    else if (t[f] < 0) bad(f, 'thickness.negative')
  }
  if (errors.length === 0) {
    if (t.clearance * 4 >= pitch) bad('clearance', 'thickness.clearanceTooLarge')
    // стенки не должны съедать всю ячейку
    if (2 * t.outerWall >= pitch - 2 * t.clearance) bad('outerWall', 'thickness.noInterior')
  }
  return { ok: errors.length === 0, errors }
}
