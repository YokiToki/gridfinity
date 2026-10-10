import { useMemo, type ReactNode } from 'react'
import { usePersistedState } from '../app/usePersistedState'
import { UnitContext, type Unit } from './units'

export function UnitProvider({ children }: { children: ReactNode }) {
  const [s, setS] = usePersistedState<{ unit: Unit }>('gridfinity.unit', { unit: 'mm' })
  const unit: Unit = s.unit === 'in' ? 'in' : 'mm'
  const value = useMemo(() => ({ unit, setUnit: (u: Unit) => setS({ unit: u }) }), [unit, setS])
  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>
}
