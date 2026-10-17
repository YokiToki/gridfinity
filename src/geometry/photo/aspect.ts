import type { Pt } from './homography'
import type { PaperOrientation, PaperPreset } from './paper'

type V3 = [number, number, number]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/**
 * Истинное отношение ширины к высоте прямоугольника по четырём углам на снимке (левый верхний, правый верхний, правый нижний,
 * левый нижний). Метод Чжана–Хэ для сканирования белой доски: фокус выводится из самого четырёхугольника при главной точке в
 * центре кадра; если фокус вывести нельзя (камера смотрит почти перпендикулярно листу, знаменатель около нуля), берётся типичный
 * для телефона фокус около длинной стороны кадра. null — углы вырождены.
 */
export function estimateAspect(corners: Pt[], imgW: number, imgH: number): number | null {
  if (corners.length !== 4) return null
  const [tl, tr, br, bl] = corners
  // в обозначениях статьи: m1 = левый верхний, m2 = правый верхний, m3 = левый нижний, m4 = правый нижний
  const m1: V3 = [tl[0], tl[1], 1], m2: V3 = [tr[0], tr[1], 1], m3: V3 = [bl[0], bl[1], 1], m4: V3 = [br[0], br[1], 1]
  const den2 = dot(cross(m2, m4), m3), den3 = dot(cross(m3, m4), m2)
  if (Math.abs(den2) < 1e-9 || Math.abs(den3) < 1e-9) return null
  const k2 = dot(cross(m1, m4), m3) / den2, k3 = dot(cross(m1, m4), m2) / den3
  const n2: V3 = [k2 * m2[0] - m1[0], k2 * m2[1] - m1[1], k2 * m2[2] - m1[2]]
  const n3: V3 = [k3 * m3[0] - m1[0], k3 * m3[1] - m1[1], k3 * m3[2] - m1[2]]
  const u0 = imgW / 2, v0 = imgH / 2
  let f2 = NaN
  if (Math.abs(n2[2] * n3[2]) > 1e-9) {
    f2 = -(1 / (n2[2] * n3[2])) * ((n2[0] * n3[0] - (n2[0] * n3[2] + n2[2] * n3[0]) * u0 + n2[2] * n3[2] * u0 * u0) + (n2[1] * n3[1] - (n2[1] * n3[2] + n2[2] * n3[1]) * v0 + n2[2] * n3[2] * v0 * v0))
  }
  const f = Number.isFinite(f2) && f2 > 0 ? Math.sqrt(f2) : Math.max(imgW, imgH)
  const back = (n: V3): V3 => [(n[0] - u0 * n[2]) / f, (n[1] - v0 * n[2]) / f, n[2]]
  const q2 = back(n2), q3 = back(n3)
  const l2 = Math.hypot(...q2), l3 = Math.hypot(...q3)
  if (!(l2 > 0 && l3 > 0)) return null
  const r = l2 / l3
  return Number.isFinite(r) && r > 0 ? r : null
}

export interface PaperGuess {
  /** Распознанный формат; null — не A4 и не Letter (размер в мм неизвестен). */
  preset: Exclude<PaperPreset, 'custom'> | null
  orientation: PaperOrientation
  /** Отношение ширины к высоте листа в его ориентации. */
  ratio: number
}

/** Допуск отношения сторон при распознавании формата. */
export const ASPECT_TOLERANCE = 0.03
const ISO = Math.SQRT2, LETTER = 279.4 / 215.9

/** Формат и ориентация по пропорциям листа: A4 (1.414) или Letter (1.294) в пределах 3 %, книжная, если высота больше ширины. */
export function guessPaper(corners: Pt[], imgW: number, imgH: number): PaperGuess | null {
  const r = estimateAspect(corners, imgW, imgH)
  if (r === null) return null
  const long = Math.max(r, 1 / r)
  const near = (target: number) => Math.abs(long - target) / target <= ASPECT_TOLERANCE
  // A4 и Letter различаются на 9 %: при совпадении с обоими берётся ближайший
  const a4 = Math.abs(long - ISO) / ISO, lt = Math.abs(long - LETTER) / LETTER
  const preset = near(ISO) && (!near(LETTER) || a4 <= lt) ? 'a4' : near(LETTER) ? 'letter' : null
  return { preset, orientation: r < 1 ? 'portrait' : 'landscape', ratio: r }
}
