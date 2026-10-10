import { createContext, useContext } from 'react'

export type Unit = 'mm' | 'in'
export const MM_PER_INCH = 25.4

export const toDisplay = (mm: number, unit: Unit) => (unit === 'in' ? mm / MM_PER_INCH : mm)
export const fromDisplay = (value: number, unit: Unit) => (unit === 'in' ? value * MM_PER_INCH : value)

/** Округление для показа: мм до 2 знаков, дюймы до 3. */
export function formatLength(mm: number, unit: Unit) {
  const digits = unit === 'in' ? 3 : 2
  return String(Number(toDisplay(mm, unit).toFixed(digits)))
}

export interface UnitContextValue { unit: Unit; setUnit: (u: Unit) => void }
export const UnitContext = createContext<UnitContextValue>({ unit: 'mm', setUnit: () => {} })
export const useUnit = () => useContext(UnitContext)
