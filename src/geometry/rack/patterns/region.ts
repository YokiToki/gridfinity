import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import type { RackRegion } from '../spec'

/** Прямоугольник узора в его собственных осях: центр в нуле, ширина по X, высота по Y. */
export interface Box { width: number; height: number }

/**
 * Центрированная раскладка: из `count` элементов шагом `pitch` занимается ровно столько, сколько помещается, и группа стоит
 * симметрично. Возвращает центры вдоль оси (0, если элементов нет).
 */
export function centredRun(available: number, size: number, pitch: number): number[] {
  if (available < size - 1e-9) return []
  const n = Math.floor((available - size) / pitch + 1e-9) + 1
  return Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * pitch)
}

/**
 * Ставит узор в область панели. build строит вырез в осях области (центр в нуле); при повороте на 90° оси области меняются местами,
 * так что один и тот же код работает и для вертикального, и для горизонтального узора.
 */
export function placePattern(w: ManifoldToplevel, region: RackRegion, rotate: boolean, build: (box: Box) => CrossSection | null): CrossSection | null {
  const rw = region.x1 - region.x0, rh = region.y1 - region.y0
  if (rw <= 0 || rh <= 0) return null
  const cs = rotate ? build({ width: rh, height: rw }) : build({ width: rw, height: rh })
  if (!cs) return null
  return (rotate ? cs.rotate(90) : cs).translate([(region.x0 + region.x1) / 2, (region.y0 + region.y1) / 2])
}
