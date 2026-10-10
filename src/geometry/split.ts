import type { Footprint } from './footprint'
import { defaultConnector, type ConnectorConfig } from './connectors'

/** Всё, что нужно геометрии для разделения: объём печати уже с учётом отступа от краёв. */
export interface SplitGeometry {
  enabled: boolean
  maxX: number
  maxY: number
  /** true — разрезы считаются автоматически; false — используются xCuts/yCuts. */
  auto: boolean
  /** Разрезы: индекс ячейки, перед которой проходит разрез (1..cells−1). */
  xCuts: number[]
  yCuts: number[]
  connector: ConnectorConfig
}

/** Настройки разделения в параметрах режима: из них и размера стола считается SplitGeometry. */
export interface SplitSettings {
  enabled: boolean
  /** Объём печати: размер стола из превью или свои значения. */
  source: 'plate' | 'custom'
  bedX: number
  bedY: number
  /** Отступ от краёв стола с каждой стороны, мм. */
  margin: number
  auto: boolean
  xCuts: number[]
  yCuts: number[]
  connector: ConnectorConfig
  /** Части разнесены в превью. */
  exploded: boolean
  /** Зазор между частями в разнесённом виде, мм. */
  gap: number
}

export const defaultSplitSettings: SplitSettings = {
  enabled: false, source: 'plate', bedX: 256, bedY: 256, margin: 5, auto: true, xCuts: [], yCuts: [], connector: defaultConnector, exploded: true, gap: 10,
}

/** Геометрическая часть настроек; plate — размер стола в превью. */
export function splitGeometry(s: SplitSettings, plate: { x: number; y: number }): SplitGeometry {
  const bx = s.source === 'plate' ? plate.x : s.bedX
  const by = s.source === 'plate' ? plate.y : s.bedY
  return { enabled: s.enabled, maxX: bx - 2 * s.margin, maxY: by - 2 * s.margin, auto: s.auto, xCuts: s.xCuts, yCuts: s.yCuts, connector: s.connector }
}

export const defaultSplit: SplitGeometry = { enabled: false, maxX: 246, maxY: 246, auto: true, xCuts: [], yCuts: [], connector: defaultConnector }

export interface AutoCutsResult {
  /** Индексы ячеек, перед которыми проходит разрез. Пусто — одна часть. */
  cuts: number[]
  parts: number
  /** Ни при каком числе частей ячейка (с припуском бортика/отступа) не помещается в объём. */
  error?: 'cellTooBig'
}

const EPS = 1e-9

/**
 * Автоматическое деление оси: наименьшее число частей, при котором каждая помещается в maxSize;
 * ячейки распределяются поровну, остаток достаётся первым частям. lead/trail — материал до первой и после
 * последней ячейки (отступ и бортик), он остаётся в крайних частях.
 */
export function autoCuts(cells: number, pitch: number, maxSize: number, lead = 0, trail = 0): AutoCutsResult {
  if (pitch > maxSize + EPS) return { cuts: [], parts: 1, error: 'cellTooBig' }
  for (let n = 1; n <= cells; n++) {
    const base = Math.floor(cells / n), rem = cells % n
    const counts = Array.from({ length: n }, (_, k) => base + (k < rem ? 1 : 0))
    const fits = counts.every((c, k) => c * pitch + (k === 0 ? lead : 0) + (k === n - 1 ? trail : 0) <= maxSize + EPS)
    if (fits) {
      const cuts: number[] = []
      let acc = 0
      for (let k = 0; k < n - 1; k++) { acc += counts[k]; cuts.push(acc) }
      return { cuts, parts: n }
    }
  }
  return { cuts: [], parts: 1, error: 'cellTooBig' }
}

export interface CellRegion { i0: number; i1: number; j0: number; j1: number }

export interface Part extends CellRegion {
  /** A1, B1, …: буква — столбец, число — строка (с 1). Не зависит от размеров других частей. */
  label: string
  col: number
  row: number
  /** Прямоугольник части в координатах плиты; крайние части включают отступ и бортик. */
  x0: number
  x1: number
  y0: number
  y1: number
  sizeX: number
  sizeY: number
  /** Часть не помещается в объём печати в любой ориентации. */
  oversize: boolean
}

export const columnLetter = (n: number) => {
  let s = ''
  let k = n
  do { s = String.fromCharCode(65 + (k % 26)) + s; k = Math.floor(k / 26) - 1 } while (k >= 0)
  return s
}

export interface ResolvedCuts { xCuts: number[]; yCuts: number[]; error?: 'cellTooBig' }

const clean = (cuts: number[], cells: number) => [...new Set(cuts.filter((c) => Number.isInteger(c) && c > 0 && c < cells))].sort((a, b) => a - b)

/** Итоговые разрезы: автоматические или заданные вручную (очищенные от лишнего). */
export function resolveCuts(fp: Footprint, s: SplitGeometry): ResolvedCuts {
  if (!s.enabled) return { xCuts: [], yCuts: [] }
  if (!s.auto) return { xCuts: clean(s.xCuts, fp.nx), yCuts: clean(s.yCuts, fp.ny) }
  const ax = autoCuts(fp.nx, fp.pitch, s.maxX, fp.offsetX, fp.sizeX - fp.offsetX - fp.nx * fp.pitch)
  const ay = autoCuts(fp.ny, fp.pitch, s.maxY, fp.offsetY, fp.sizeY - fp.offsetY - fp.ny * fp.pitch)
  return { xCuts: ax.cuts, yCuts: ay.cuts, error: ax.error ?? ay.error }
}

const bounds = (cells: number, cuts: number[]) => [0, ...cuts, cells]

/** Части по разрезам. Крайние части владеют отступом и бортиком, поэтому объединение частей равно плите. */
export function splitParts(fp: Footprint, xCuts: number[], yCuts: number[], maxX = Infinity, maxY = Infinity): Part[] {
  const bx = bounds(fp.nx, xCuts), by = bounds(fp.ny, yCuts)
  const edge = (i: number, last: number, size: number, offset: number, idx: number) => (idx === 0 ? -size / 2 : idx === last ? size / 2 : -size / 2 + offset + i * fp.pitch)
  const parts: Part[] = []
  for (let c = 0; c < bx.length - 1; c++) {
    for (let r = 0; r < by.length - 1; r++) {
      const i0 = bx[c], i1 = bx[c + 1], j0 = by[r], j1 = by[r + 1]
      const x0 = edge(i0, bx.length - 1, fp.sizeX, fp.offsetX, c), x1 = edge(i1, bx.length - 1, fp.sizeX, fp.offsetX, c + 1)
      const y0 = edge(j0, by.length - 1, fp.sizeY, fp.offsetY, r), y1 = edge(j1, by.length - 1, fp.sizeY, fp.offsetY, r + 1)
      const sizeX = x1 - x0, sizeY = y1 - y0
      const fits = (sizeX <= maxX + EPS && sizeY <= maxY + EPS) || (sizeY <= maxX + EPS && sizeX <= maxY + EPS)
      parts.push({ label: `${columnLetter(c)}${r + 1}`, col: c, row: r, i0, i1, j0, j1, x0, x1, y0, y1, sizeX, sizeY, oversize: !fits })
    }
  }
  return parts
}

export const MAX_PARTS = 36
