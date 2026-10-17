export type PatternKind = 'none' | 'skadis' | 'hex' | 'pills' | 'lines' | 'passthrough'
export const PATTERN_KINDS: PatternKind[] = ['none', 'skadis', 'hex', 'pills', 'lines', 'passthrough']

/** Параметры каждого узора хранятся отдельно, чтобы переключение вида не теряло настройки остальных. */
export interface SkadisParams { slotWidth: number; slotLength: number; pitch: number; rowStep: number; shift: number }
export interface HexParams { width: number; wall: number }
/** width — размер поперёк (по Y), length — вдоль (по X). */
export interface PillsParams { width: number; length: number; wall: number; edgePills: boolean }
export interface LinesParams { height: number; wall: number }
export interface PassthroughParams { borderX: number; borderY: number; radius: number }

export interface PatternParams {
  kind: PatternKind
  /** Поле между краем области (окно между ушами) и узором. */
  margin: number
  /** Поворот узора на 90°. */
  rotate: boolean
  skadis: SkadisParams; hex: HexParams; pills: PillsParams; lines: LinesParams; passthrough: PassthroughParams
}

export const defaultPattern: PatternParams = {
  kind: 'none', margin: 3, rotate: false,
  skadis: { slotWidth: 5, slotLength: 15, pitch: 40, rowStep: 20, shift: 20 },
  hex: { width: 8, wall: 1.6 },
  pills: { width: 6, length: 20, wall: 2, edgePills: true },
  lines: { height: 3, wall: 2 },
  passthrough: { borderX: 0, borderY: 0, radius: 3 },
}

/** Замечание о печатаемости: ключ перевода и имя настройки (ключ rack.field.*), которая слишком мала. */
export interface Issue { key: string; setting?: string; /** Число для текста (предел глубины, мм). */ value?: number }
/** Минимальная печатаемая ширина: два периметра сопла 0.4 мм. */
export const MIN_FEATURE = 0.8
