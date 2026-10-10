import { defaultConnector } from '../../geometry/connectors'
import { defaultSplitSettings } from '../../geometry/split'
import { baseplateLayout, defaultParams, defaultPreview, defaultThickness, type BaseplateCore } from '../../geometry/baseplate'
import { defaultFasteners, slotsFromPoints, type FastenerKind } from '../../geometry/fasteners'
import type { Point } from '../../geometry/footprint'

const isPoint = (p: unknown): p is Point => !!p && typeof (p as Point).x === 'number' && typeof (p as Point).y === 'number'

/** Старый формат вида: булев флаг прототипа или manual-точки в координатах. */
function migrateKind(old: unknown, current: unknown, params: BaseplateCore): FastenerKind | undefined {
  if (old === true) return { mode: 'full', slots: [] }
  if (old === false) return { mode: 'none', slots: [] }
  if (!current || typeof current !== 'object') return undefined
  const k = current as { mode?: unknown; manual?: unknown; slots?: unknown }
  const mode = k.mode === 'none' || k.mode === 'corner' || k.mode === 'full' || k.mode === 'manual' ? k.mode : 'none'
  if (Array.isArray(k.slots)) return { mode, slots: k.slots as FastenerKind['slots'] }
  const points = Array.isArray(k.manual) ? k.manual.filter(isPoint) : []
  // координаты → ближайшие стандартные позиции текущей сетки (до 3 мм), остальные отбрасываем
  return { mode, slots: slotsFromPoints(points, baseplateLayout(params).fp) }
}

/** Настройки разделения: недостающие поля берутся из значений по умолчанию, в том числе вложенный connector. */
function normalizeSplit(raw: unknown) {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const c = (s.connector && typeof s.connector === 'object' ? s.connector : {}) as Record<string, unknown>
  return { ...defaultSplitSettings, ...s, connector: { ...defaultConnector, ...c, overrides: { ...((c.overrides as object | undefined) ?? {}) } } }
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/** Прототип: целые ячейки x/y, customSize + sizeX/sizeY в мм, unit — размер ячейки, плоские showPlate/plateX/plateY. */
function migratePrototypeShape(raw: Record<string, unknown>): Record<string, unknown> {
  if (typeof raw.x !== 'number' && typeof raw.y !== 'number' && !('unit' in raw) && !('showPlate' in raw) && !('customSize' in raw)) return raw
  const { unit, x, y, customSize, sizeX, sizeY, showPlate, plateX, plateY, ...rest } = raw
  const pitch = num(unit, defaultParams.pitch)
  const axis = (cells: unknown, size: unknown) => {
    if (customSize === true) return { mode: 'mm', value: Math.max(num(size, 0), num(cells, 2) * pitch), align: 'center' }
    return { mode: 'units', value: num(cells, 2), align: 'center' }
  }
  return {
    ...rest,
    pitch,
    x: typeof x === 'object' && x ? x : axis(x, sizeX),
    y: typeof y === 'object' && y ? y : axis(y, sizeY),
    preview: { ...defaultPreview, ...(rest.preview as object | undefined), ...(showPlate !== undefined ? { showPlate: showPlate === true } : {}), plateX: num(plateX, defaultPreview.plateX), plateY: num(plateY, defaultPreview.plateY) },
  }
}

/**
 * Приводит сохранённые параметры к текущему виду:
 * 1) плоская форма прототипа → оси, толщины и preview; 2) `magnets`/`screws` boolean (true → Full);
 * 3) manual-точки в координатах → слоты «ячейка + угол». Вложенные объекты донаполняются значениями по умолчанию.
 */
export function migrateBaseplate(input: Record<string, unknown>): Record<string, unknown> {
  const raw = migratePrototypeShape(input)
  const oldFlags = 'magnets' in raw || 'screws' in raw
  const f = raw.fasteners as Record<string, unknown> | undefined
  const needsPoints = !!f && [f.magnets, f.screws].some((k) => !!k && typeof k === 'object' && !('slots' in (k as object)))
  const { magnets, screws, fasteners, ...rest } = raw
  const withNested: Record<string, unknown> = {
    ...rest,
    thickness: { ...defaultThickness, ...((rest.thickness as object | undefined) ?? {}) },
    preview: { ...defaultPreview, ...((rest.preview as object | undefined) ?? {}) },
    split: normalizeSplit(rest.split),
  }
  if (!oldFlags && !needsPoints) return fasteners === undefined ? withNested : { ...withNested, fasteners }
  const params = { ...defaultParams, ...withNested } as BaseplateCore
  const cur = (fasteners ?? {}) as Record<string, unknown>
  return {
    ...withNested,
    fasteners: {
      ...defaultFasteners,
      ...cur,
      magnets: migrateKind(magnets, cur.magnets, params) ?? defaultFasteners.magnets,
      screws: migrateKind(screws, cur.screws, params) ?? defaultFasteners.screws,
    },
  }
}
