import { dropCollinear, maskLoops, simplifyLoop, type Pt } from '../../geometry/art/trace'
import type { MaskPreview } from '../../geometry/keychain'

/**
 * Контуры силуэта в мм (начало — центр габарита, Y вверх) по маске предпросмотра: только для показа в редакторе положения.
 * Материал — значения 1 и 3 (залитые дырки), открытые дырки (2) — вырезы.
 */
export function previewContour(pv: MaskPreview, wMm: number, hMm: number): Pt[][] {
  const mask = new Uint8Array(pv.data.length)
  for (let i = 0; i < mask.length; i++) mask[i] = pv.data[i] === 1 || pv.data[i] === 3 ? 1 : 0
  const [x0, y0, x1, y1] = pv.box
  const sx = wMm / Math.max(1e-9, x1 - x0), sy = hMm / Math.max(1e-9, y1 - y0)
  return maskLoops(mask, pv.width, pv.height)
    .map((l) => simplifyLoop(dropCollinear(l), 0.6))
    .filter((l) => l.length >= 3)
    .map((l) => l.map(([px, py]): Pt => [(px - x0) * sx - wMm / 2, hMm / 2 - (py - y0) * sy]))
}

/** Ближайшая к точке (x, y) точка контуров (по отрезкам) и расстояние до неё. */
export function nearestOnContour(loops: Pt[][], x: number, y: number): { x: number; y: number; dist: number } | null {
  let best: { x: number; y: number; dist: number } | null = null
  for (const l of loops) for (let i = 0; i < l.length; i++) {
    const a = l[i], b = l[(i + 1) % l.length]
    const dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len2))
    const px = a[0] + t * dx, py = a[1] + t * dy
    const d = Math.hypot(x - px, y - py)
    if (!best || d < best.dist) best = { x: px, y: py, dist: d }
  }
  return best
}

/** Шаг сетки редактора: «круглое» число (1, 2, 5 × 10ⁿ), чтобы на отрезке span было около target линий. */
export function niceStep(span: number, target = 8): number {
  const raw = span / target
  const p = 10 ** Math.floor(Math.log10(raw))
  const m = raw / p
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p
}
