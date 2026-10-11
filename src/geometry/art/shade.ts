import { dot, norm, type Camera, type V3 } from './projection'

export const TONES = 7

/** Ключевой свет относительно камеры: сверху слева, чуть спереди; три видимые грани куба получают разные тона. */
export function lightFor(c: Camera): V3 {
  return norm([
    c.toCam[0] * 0.45 + c.up[0] * 0.55 - c.right[0] * 0.65,
    c.toCam[1] * 0.45 + c.up[1] * 0.55 - c.right[1] * 0.65,
    c.toCam[2] * 0.45 + c.up[2] * 0.55 - c.right[2] * 0.65,
  ])
}

/** Номер тона 0…tones−1 по нормали: окружающий свет плюс диффузный от ключевого, квантованный. */
export function toneOf(normal: V3, light: V3, tones = TONES): number {
  const i = 0.22 + 0.78 * Math.max(0, dot(normal, light))
  return Math.min(tones - 1, Math.floor(i * tones))
}
