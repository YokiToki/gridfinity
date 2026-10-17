/** Лист бумаги в кадре: стандартные форматы и свой размер. Размеры в мм. */
export type PaperPreset = 'letter' | 'a4' | 'custom'
export type PaperOrientation = 'portrait' | 'landscape'
export interface Paper { width: number; height: number }

/** Короткая и длинная сторона формата, мм. */
export const PAPER_PRESETS: Record<Exclude<PaperPreset, 'custom'>, { short: number; long: number }> = {
  letter: { short: 215.9, long: 279.4 },
  a4: { short: 210, long: 297 },
}

export const CUSTOM_PAPER_MIN = 50
export const CUSTOM_PAPER_MAX = 1000
const clampCustom = (v: number) => Math.min(CUSTOM_PAPER_MAX, Math.max(CUSTOM_PAPER_MIN, Number.isFinite(v) ? v : CUSTOM_PAPER_MIN))

/**
 * Размер листа в выбранной ориентации: книжная — ширина меньше высоты, альбомная — наоборот. У своего размера width и length
 * заданы пользователем как есть (ширина по горизонтали), ориентация его только меняет местами, если она не совпадает.
 */
export function paperSize(preset: PaperPreset, orientation: PaperOrientation, custom: { width: number; length: number } = { width: 210, length: 297 }): Paper {
  const [a, b] = preset === 'custom'
    ? [clampCustom(custom.width), clampCustom(custom.length)]
    : [PAPER_PRESETS[preset].short, PAPER_PRESETS[preset].long]
  const short = Math.min(a, b), long = Math.max(a, b)
  return orientation === 'portrait' ? { width: short, height: long } : { width: long, height: short }
}

/** Масштаб растра выпрямленного листа, пикселей на мм: 4, а длинная сторона не больше 2000 пикселей. */
export const RECTIFIED_PX_PER_MM = 4
export const RECTIFIED_MAX_SIDE = 2000
export const rectifiedScale = (p: Paper) => Math.min(RECTIFIED_PX_PER_MM, RECTIFIED_MAX_SIDE / Math.max(p.width, p.height))
