import { useEffect, useState } from 'react'

/**
 * Читает JSON из localStorage поверх значений по умолчанию; битые или пустые данные дают defaults.
 * migrate приводит старый формат сохранённых данных к текущему до слияния с defaults.
 */
export function loadPersisted<T extends object>(key: string, defaults: T, migrate?: (raw: Record<string, unknown>) => Record<string, unknown>): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaults
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults
    const data = migrate ? migrate(parsed as Record<string, unknown>) : (parsed as Record<string, unknown>)
    return { ...defaults, ...(data as Partial<T>) }
  } catch {
    return defaults
  }
}

export function usePersistedState<T extends object>(key: string, defaults: T, migrate?: (raw: Record<string, unknown>) => Record<string, unknown>) {
  const [state, setState] = useState<T>(() => loadPersisted(key, defaults, migrate))
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)) } catch { /* хранилище недоступно */ }
  }, [key, state])
  return [state, setState] as const
}
