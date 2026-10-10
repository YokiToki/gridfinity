/** Ширина плавного появления сетки над плоскостью, доля расстояния до цели. */
export const GROUND_RAMP = 0.08

const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * Непрозрачность сетки и стола в превью: 1, когда камера над плоскостью XY, 0 — на плоскости и ниже,
 * между ними плавный переход шириной GROUND_RAMP · distance над плоскостью (z = 0).
 */
export function groundOpacity(cameraZ: number, distance: number): number {
  const w = Math.max(GROUND_RAMP * distance, 1e-6)
  const t = Math.min(1, Math.max(0, cameraZ / w))
  return smooth(t)
}
