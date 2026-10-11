/**
 * Пресеты принтеров: размеры стола по опубликованным характеристикам производителя (страницы specs / tech-specs на bambulab.com).
 * H2D: берётся объём печати одним соплом 325 × 320 × 325 (полный 350 × 320 содержит зоны только для двух сопел). Названия профилей Studio проверяются открытием проекта в Bambu Studio (см. export/bambu.ts); данные
 * написаны вручную, чужие дампы пресетов (AGPL) не копировались.
 */
export interface PrinterPreset {
  id: string
  /** Отображаемое имя (одно на оба языка: это названия моделей). */
  name: string
  /** Стол и максимальная высота, мм. */
  x: number
  y: number
  z: number
  /** Принтеры Bambu Lab получают метаданные проекта в 3MF. */
  bambu?: BambuProfile
  source: string
}

/** Имена профилей Bambu Studio для модели принтера. */
export interface BambuProfile {
  /** Значение printer_model (имя машины). */
  model: string
  /** Суффикс совместимости профилей процесса и пластика, например «X1C» в «0.20mm Standard @BBL X1C». */
  suffix: string
  /** Имена профилей пластика у этой модели всегда оканчиваются на «0.4 nozzle» (по проекту, сохранённому Studio для P2S). */
  nozzleInFilament?: boolean
}

export const CUSTOM_PRINTER = 'custom'

export const PRINTERS: PrinterPreset[] = [
  { id: 'a1-mini', name: 'Bambu Lab A1 mini', x: 180, y: 180, z: 180, bambu: { model: 'Bambu Lab A1 mini', suffix: 'A1M' }, source: 'https://wiki.bambulab.com/en/a1-mini' },
  { id: 'a1', name: 'Bambu Lab A1', x: 256, y: 256, z: 256, bambu: { model: 'Bambu Lab A1', suffix: 'A1' }, source: 'https://wiki.bambulab.com/en/a1' },
  { id: 'p1p', name: 'Bambu Lab P1P', x: 256, y: 256, z: 256, bambu: { model: 'Bambu Lab P1P', suffix: 'P1P' }, source: 'https://wiki.bambulab.com/en/p1' },
  { id: 'p1s', name: 'Bambu Lab P1S', x: 256, y: 256, z: 256, bambu: { model: 'Bambu Lab P1S', suffix: 'P1S' }, source: 'https://wiki.bambulab.com/en/p1' },
  { id: 'p2s', name: 'Bambu Lab P2S', x: 256, y: 256, z: 256, bambu: { model: 'Bambu Lab P2S', suffix: 'P2S', nozzleInFilament: true }, source: 'https://bambulab.com/en/p2s/specs' },
  { id: 'x1c', name: 'Bambu Lab X1 Carbon', x: 256, y: 256, z: 256, bambu: { model: 'Bambu Lab X1 Carbon', suffix: 'X1C' }, source: 'https://wiki.bambulab.com/en/x1' },
  { id: 'x1e', name: 'Bambu Lab X1E', x: 256, y: 256, z: 256, bambu: { model: 'Bambu Lab X1E', suffix: 'X1E' }, source: 'https://wiki.bambulab.com/en/x1e' },
  { id: 'h2d', name: 'Bambu Lab H2D', x: 325, y: 320, z: 325, bambu: { model: 'Bambu Lab H2D', suffix: 'H2D' }, source: 'https://bambulab.com/en/h2d/tech-specs' },
  { id: 'h2s', name: 'Bambu Lab H2S', x: 340, y: 320, z: 340, bambu: { model: 'Bambu Lab H2S', suffix: 'H2S' }, source: 'https://bambulab.com/en/h2s/tech-specs' },
]

export const printerById = (id: string) => PRINTERS.find((p) => p.id === id)

/** Процессы (высота слоя) и пластики, которые можно записать в проект. Названия Studio собираются с суффиксом принтера. */
export const PROCESSES = [
  { id: '0.20-standard', layer: 0.2, label: '0.20 mm Standard', studio: '0.20mm Standard' },
  { id: '0.16-optimal', layer: 0.16, label: '0.16 mm Optimal', studio: '0.16mm Optimal' },
  { id: '0.12-fine', layer: 0.12, label: '0.12 mm Fine', studio: '0.12mm Fine' },
  { id: '0.28-extra-draft', layer: 0.28, label: '0.28 mm Extra Draft', studio: '0.28mm Extra Draft' },
] as const

/** Пластики Bambu: имя профиля Studio, идентификатор (filament_ids), тип и цвет по умолчанию. */
export const FILAMENTS = [
  { id: 'pla', label: 'PLA', studio: 'Bambu PLA Basic', code: 'GFA00', type: 'PLA', colour: '#FFFFFF' },
  { id: 'petg', label: 'PETG', studio: 'Bambu PETG Basic', code: 'GFG00', type: 'PETG', colour: '#FFFFFF' },
  { id: 'abs', label: 'ABS', studio: 'Bambu ABS', code: 'GFB00', type: 'ABS', colour: '#FFFFFF' },
  { id: 'asa', label: 'ASA', studio: 'Bambu ASA', code: 'GFB01', type: 'ASA', colour: '#FFFFFF' },
  { id: 'tpu', label: 'TPU', studio: 'Bambu TPU 95A', code: 'GFU01', type: 'TPU', colour: '#FFFFFF' },
] as const

export const NOZZLES = [0.2, 0.4, 0.6, 0.8] as const
