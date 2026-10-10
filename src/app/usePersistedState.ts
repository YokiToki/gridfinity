import { useEffect, useState } from 'react'

/** Читает JSON из localStorage поверх значений по умолчанию; битые или пустые данные дают defaults. */
export function loadPersisted<T extends object>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaults
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults
    return { ...defaults, ...(parsed as Partial<T>) }
  } catch {
    return defaults
  }
}

export function usePersistedState<T extends object>(key: string, defaults: T) {
  const [state, setState] = useState<T>(() => loadPersisted(key, defaults))
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)) } catch { /* хранилище недоступно */ }
  }, [key, state])
  return [state, setState] as const
}
