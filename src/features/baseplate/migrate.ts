import { defaultFasteners, type FastenerKind } from '../../geometry/fasteners'

const kindFrom = (old: unknown, current: unknown): FastenerKind | undefined => {
  if (old === true) return { mode: 'full', manual: [] }
  if (old === false) return { mode: 'none', manual: [] }
  return current as FastenerKind | undefined
}

/** Прототип хранил `magnets`/`screws` как boolean: true → режим Full, false → None. */
export function migrateBaseplate(raw: Record<string, unknown>): Record<string, unknown> {
  if (!('magnets' in raw) && !('screws' in raw)) return raw
  const { magnets, screws, fasteners, ...rest } = raw
  const f = (fasteners ?? {}) as Record<string, unknown>
  return {
    ...rest,
    fasteners: {
      ...defaultFasteners,
      ...f,
      magnets: kindFrom(magnets, f.magnets) ?? defaultFasteners.magnets,
      screws: kindFrom(screws, f.screws) ?? defaultFasteners.screws,
    },
  }
}
