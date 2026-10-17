import { defaultCutout, type Cutout } from '../../geometry/cutout'
import { normalizeFasteners } from '../fasteners/normalize'

const CUTOUT_DEFAULTS = { x: 0, y: 0, rotation: 0, depth: 10, clearance: 0.5, visible: true, name: 'Cutout' }
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** Донаполняет сохранённые параметры выреза; битые вырезы отбрасываются. */
export function migrateCutout(raw: Record<string, unknown>): Record<string, unknown> {
  const cutouts = Array.isArray(raw.cutouts)
    ? (raw.cutouts as unknown[])
        .filter((c) => { const o = obj(c), s = obj(o.source); return typeof o.id === 'string' && (s.kind === 'rect' || s.kind === 'mesh' || (s.kind === 'circle' && typeof s.diameter === 'number' && s.diameter > 0)) })
        .map((c) => ({ ...CUTOUT_DEFAULTS, ...obj(c) }) as unknown as Cutout)
    : []
  return {
    ...raw,
    height: { ...defaultCutout.height, ...obj(raw.height) },
    thickness: { ...defaultCutout.thickness, ...obj(raw.thickness) },
    fasteners: normalizeFasteners(raw.fasteners),
    cutouts,
  }
}
