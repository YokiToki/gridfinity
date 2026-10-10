import { defaultFasteners, type FastenerConfig, type FastenerKind } from '../../geometry/fasteners'

const MODES = ['none', 'corner', 'full', 'manual']

function kind(raw: unknown, fallback: FastenerKind): FastenerKind {
  const k = (raw && typeof raw === 'object' ? raw : {}) as { mode?: unknown; slots?: unknown }
  return { mode: (MODES.includes(k.mode as string) ? k.mode : fallback.mode) as FastenerKind['mode'], slots: Array.isArray(k.slots) ? (k.slots as FastenerKind['slots']) : fallback.slots }
}

/** Сохранённый крепёж с любыми пропусками → полная настройка: недостающие поля и виды берутся по умолчанию. */
export function normalizeFasteners(raw: unknown): FastenerConfig {
  const f = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return { ...defaultFasteners, ...f, magnets: kind(f.magnets, defaultFasteners.magnets), screws: kind(f.screws, defaultFasteners.screws) } as FastenerConfig
}
