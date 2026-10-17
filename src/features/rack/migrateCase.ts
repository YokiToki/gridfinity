import { defaultRackCase } from '../../geometry/rack/case'

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
const oneOf = <T extends string>(v: unknown, all: readonly T[], d: T): T => (all.includes(v as T) ? (v as T) : d)

/** Нормализует сохранённые параметры корпуса: каждое число, флаг и вид проверяются, частичная запись не ломает режим. */
export function migrateRackCase(raw: Record<string, unknown>): Record<string, unknown> {
  const d = defaultRackCase, dev = obj(raw.device), u = obj(raw.units), e = obj(raw.ears), w = obj(raw.window), k = obj(raw.keystones), c = obj(raw.cable), v = obj(raw.vents)
  return {
    device: { width: num(dev.width, d.device.width), depth: num(dev.depth, d.device.depth), height: num(dev.height, d.device.height) },
    gap: num(raw.gap, d.gap), wall: num(raw.wall, d.wall), plateThickness: num(raw.plateThickness, d.plateThickness),
    units: { auto: bool(u.auto, d.units.auto), value: Math.round(num(u.value, d.units.value)) },
    cornerRadius: num(raw.cornerRadius, d.cornerRadius), tolerance: bool(raw.tolerance, d.tolerance),
    ears: {
      positions: oneOf(e.positions === 'none' ? 'edges' : e.positions, ['all', 'outer', 'edges'], d.ears.positions),
      shape: oneOf(e.shape, ['round', 'slot'], d.ears.shape), size: num(e.size, d.ears.size), slotLength: num(e.slotLength, d.ears.slotLength),
    },
    window: { enabled: bool(w.enabled, d.window.enabled), lip: num(w.lip, d.window.lip) },
    keystones: { count: Math.round(num(k.count, d.keystones.count)), side: oneOf(k.side, ['left', 'right', 'below'], d.keystones.side) },
    cable: { count: Math.round(num(c.count, d.cable.count)), diameter: num(c.diameter, d.cable.diameter) },
    vents: { enabled: bool(v.enabled, d.vents.enabled), width: num(v.width, d.vents.width), wall: num(v.wall, d.vents.wall), margin: num(v.margin, d.vents.margin) },
  }
}
