import type { ModeId } from './modes'

const KEY = 'gridfinity.last'
export interface LastSession { mode: ModeId; size: string; savedAt: number }

export function recordSession(mode: ModeId, size: string) {
  try { localStorage.setItem(KEY, JSON.stringify({ mode, size, savedAt: Date.now() } satisfies LastSession)) } catch { /* ignore */ }
}

export function readSession(): LastSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (s && typeof s.mode === 'string' && typeof s.size === 'string' && typeof s.savedAt === 'number') return s
  } catch { /* ignore */ }
  return null
}
