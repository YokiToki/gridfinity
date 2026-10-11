import type { ModeId } from './modes'
import type { ProductId } from './products'

const KEY = 'gridfinity.last'
export interface LastSession { product: ProductId; /** Только у продуктов с режимами. */ mode?: ModeId; size: string; savedAt: number }

/** Запоминает последнюю работу: продукт, режим (если есть) и краткий размер. */
export function recordSession(mode: ModeId | null, size: string, product: ProductId = 'gridfinity') {
  try { localStorage.setItem(KEY, JSON.stringify({ product, ...(mode ? { mode } : {}), size, savedAt: Date.now() } satisfies LastSession)) } catch { /* ignore */ }
}

/** Старые записи без product относятся к Gridfinity; битые данные дают null. */
export function readSession(): LastSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!s || typeof s.size !== 'string' || typeof s.savedAt !== 'number') return null
    const product: ProductId = s.product === 'keychain' ? 'keychain' : 'gridfinity'
    if (product === 'gridfinity' && typeof s.mode !== 'string') return null
    return { product, mode: typeof s.mode === 'string' ? s.mode : undefined, size: s.size, savedAt: s.savedAt }
  } catch { /* ignore */ }
  return null
}
