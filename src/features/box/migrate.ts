import { defaultBox } from '../../geometry/box'
import { normalizeFasteners } from '../fasteners/normalize'

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** Донаполняет сохранённые параметры коробки значениями по умолчанию, включая вложенные объекты. */
export function migrateBox(raw: Record<string, unknown>): Record<string, unknown> {
  const c = obj(raw.compartments)
  return {
    ...raw,
    height: { ...defaultBox.height, ...obj(raw.height) },
    thickness: { ...defaultBox.thickness, ...obj(raw.thickness) },
    scoop: { ...defaultBox.scoop, ...obj(raw.scoop) },
    compartments: {
      ...defaultBox.compartments, ...c,
      xDividers: Array.isArray(c.xDividers) ? c.xDividers.filter((n) => typeof n === 'number') : [],
      yDividers: Array.isArray(c.yDividers) ? c.yDividers.filter((n) => typeof n === 'number') : [],
      removed: Array.isArray(c.removed) ? c.removed.filter((k) => typeof k === 'string') : [],
    },
    fasteners: normalizeFasteners(raw.fasteners),
  }
}
