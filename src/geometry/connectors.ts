/** Типы и настройки соединителей между частями плиты (геометрия — ниже в этом же файле). */

export type ConnectorType = 'none' | 'holes' | 'dovetail'
export const CONNECTOR_TYPES: ConnectorType[] = ['none', 'holes', 'dovetail']

export interface ConnectorConfig {
  type: ConnectorType
  /** Пресет отверстий: m3 | m6x2 | pin3 | custom. */
  preset: string
  /** Диаметр отверстия, мм. */
  diameter: number
  /** Глубина отверстия в каждую часть, мм. */
  depth: number
  /** Сколько соединителей на торец. */
  count: number
  /** Отступ от концов торца, мм. */
  inset: number
  /** Зазор печатного замка на сторону, мм. */
  clearance: number
  /** Ширина шейки и головки ласточкина хвоста вдоль торца, мм; глубина — `dovetailDepth`. */
  neck: number
  tip: number
  dovetailDepth: number
  /** Тип отдельных разрезов: ключ `x:3` / `y:1` (номер ячейки, перед которой разрез). */
  overrides: Record<string, ConnectorType>
}

export interface HolePreset { id: string; diameter: number; depth: number }
/** Размеры уже с зазором под посадку. */
export const HOLE_PRESETS: HolePreset[] = [
  { id: 'm3', diameter: 3.2, depth: 6 },
  { id: 'm6x2', diameter: 6.1, depth: 2.1 },
  { id: 'pin3', diameter: 3.1, depth: 6 },
]
export const CUSTOM = 'custom'

export const defaultConnector: ConnectorConfig = {
  type: 'none', preset: 'm3', diameter: 3.2, depth: 6, count: 2, inset: 10, clearance: 0.2, neck: 4, tip: 6, dovetailDepth: 1.5, overrides: {},
}

export function withHolePreset(c: ConnectorConfig, id: string): ConnectorConfig {
  const p = HOLE_PRESETS.find((x) => x.id === id)
  return p ? { ...c, preset: id, diameter: p.diameter, depth: p.depth } : { ...c, preset: CUSTOM }
}

export const cutKey = (axis: 'x' | 'y', index: number) => `${axis}:${index}`

/** Тип соединителя на конкретном разрезе: переопределение или общий. */
export const connectorTypeAt = (c: ConnectorConfig, axis: 'x' | 'y', index: number): ConnectorType => c.overrides[cutKey(axis, index)] ?? c.type
