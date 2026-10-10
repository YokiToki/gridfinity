export interface BedPreset { id: string; x: number; y: number }

/** Типичные размеры столов принтеров, мм. Проверенных пресетов Bambu больше в 09-export-3mf-bambu. */
export const BED_PRESETS: BedPreset[] = [
  { id: '180', x: 180, y: 180 },
  { id: '220', x: 220, y: 220 },
  { id: '235', x: 235, y: 235 },
  { id: '250', x: 250, y: 250 },
  { id: '256', x: 256, y: 256 },
  { id: '300', x: 300, y: 300 },
  { id: '350', x: 350, y: 350 },
]

export const presetFor = (x: number, y: number) => BED_PRESETS.find((p) => p.x === x && p.y === y)

/** Плита помещается на стол в любой ориентации. */
export const fitsBed = (sx: number, sy: number, bx: number, by: number) => (sx <= bx + 1e-9 && sy <= by + 1e-9) || (sy <= bx + 1e-9 && sx <= by + 1e-9)
