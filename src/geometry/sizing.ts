export type Align = 'start' | 'center' | 'end'

export interface AxisLayout {
  /** Целых ячеек. */
  cells: number
  /** Остаток, заполняется плоской вставкой. */
  padding: number
  /** Смещение блока ячеек от начала габарита. */
  offset: number
  /** Габарит меньше одной ячейки: ячейка усечена. */
  truncated: boolean
}

const EPS = 1e-9

/** Раскладывает размер по оси на целые ячейки и остаток. */
export function resolveAxis(size: number, pitch: number, align: Align = 'center'): AxisLayout {
  const ratio = size / pitch
  const truncated = ratio < 1 - EPS
  const cells = Math.max(1, Math.floor(ratio + EPS))
  const raw = truncated ? 0 : size - cells * pitch
  const padding = raw < 1e-6 ? 0 : raw
  const offset = align === 'start' ? 0 : align === 'end' ? padding : padding / 2
  return { cells, padding, offset, truncated }
}

export const unitsToMm = (units: number, pitch: number) => units * pitch
export const mmToUnits = (mm: number, pitch: number) => mm / pitch
