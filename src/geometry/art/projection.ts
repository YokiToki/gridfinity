export type V3 = [number, number, number]

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }

/** Ортогональная камера: оси экрана и направление на камеру в мировых координатах (Z вверх). */
export interface Camera { right: V3; up: V3; toCam: V3 }

/** azimuth — направление взгляда в плане (45° = камера с +X, −Y, как в редакторе), elevation — угол над горизонтом. */
export function makeCamera(azimuthDeg: number, elevationDeg: number): Camera {
  const a = (azimuthDeg * Math.PI) / 180, e = (elevationDeg * Math.PI) / 180
  const toCam: V3 = [Math.cos(e) * Math.sin(a), -Math.cos(e) * Math.cos(a), Math.sin(e)]
  const right: V3 = [Math.cos(a), Math.sin(a), 0]
  return { right, up: norm(cross(toCam, right)), toCam }
}

/** Истинная изометрия: 45° по азимуту и arctan(1/√2) ≈ 35,264° по высоте. */
export const ISO = makeCamera(45, (Math.atan(1 / Math.SQRT2) * 180) / Math.PI)

export interface Projected { x: number; y: number; depth: number }

/** x вправо, y вниз (как в SVG), depth растёт к камере. */
export function project(c: Camera, p: V3): Projected {
  return { x: dot(p, c.right), y: -dot(p, c.up), depth: dot(p, c.toCam) }
}

export interface Fit { scale: number; offsetX: number; offsetY: number }

/** Масштаб и сдвиг, при которых облако точек по центру вписано в width × height с полем pad, с сохранением пропорций. */
export function fitPoints(pts: { x: number; y: number }[], width: number, height: number, pad: number): Fit {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y) }
  const scale = Math.min((width - 2 * pad) / (x1 - x0 || 1), (height - 2 * pad) / (y1 - y0 || 1))
  return { scale, offsetX: width / 2 - ((x0 + x1) / 2) * scale, offsetY: height / 2 - ((y0 + y1) / 2) * scale }
}

export const applyFit = (f: Fit, p: { x: number; y: number }) => ({ x: p.x * f.scale + f.offsetX, y: p.y * f.scale + f.offsetY })
export { dot, cross, norm }
