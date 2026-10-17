import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import type { RackRegion } from '../spec'

/** Прямоугольник узора в его собственных осях: центр в нуле, ширина по X, высота по Y. */
export interface Box { width: number; height: number }

/** Гравировка: плоская фигура и глубина от лицевой грани вниз. */
export interface Engrave { shape: CrossSection; depth: number }
/** Результат узора: вырез насквозь и/или гравировки разной глубины. Готовые узоры (26) возвращают только through. */
export interface PatternCut { through?: CrossSection | null; engrave?: Engrave[] }

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
 * так что один и тот же код работает и для вертикального, и для горизонтального узора. И сквозной вырез, и гравировки получают
 * один и тот же перенос.
 */
export function placeCut(region: RackRegion, rotate: boolean, build: (box: Box) => PatternCut | CrossSection | null): PatternCut {
  const rw = region.x1 - region.x0, rh = region.y1 - region.y0
  if (rw <= 0 || rh <= 0) return {}
  const made = rotate ? build({ width: rh, height: rw }) : build({ width: rw, height: rh })
  if (!made) return {}
  const fit = (cs: CrossSection) => (rotate ? cs.rotate(90) : cs).translate([(region.x0 + region.x1) / 2, (region.y0 + region.y1) / 2])
  const cut: PatternCut = 'through' in made || 'engrave' in made ? (made as PatternCut) : { through: made as CrossSection }
  return { through: cut.through ? fit(cut.through) : null, engrave: (cut.engrave ?? []).map((e) => ({ shape: fit(e.shape), depth: e.depth })) }
}

/** Обратная совместимость для узоров 26: один сквозной вырез. */
export function placePattern(_w: ManifoldToplevel, region: RackRegion, rotate: boolean, build: (box: Box) => CrossSection | null): CrossSection | null {
  return placeCut(region, rotate, build).through ?? null
}
