import { applyFit, dot, norm, project, type Camera, type Fit, type V3 } from './projection'
import { lightFor, toneOf, TONES } from './shade'

export interface TriMesh { positions: Float32Array; triangles: Uint32Array }

/** Картинка тонов: по пикселю — тон ближайшей грани (EMPTY, если ничего нет) и её глубина. */
export interface ToneImage { width: number; height: number; tone: Uint8Array; depth: Float32Array }
export const EMPTY = 255

/**
 * Z-буфер без WebGL: каждый треугольник заливается в сетку width × height, побеждает ближайший к камере.
 * fit переводит проекцию (в единицах модели) в пиксели; тон считается по нормали грани (плоское затенение).
 */
export function rasterize(mesh: TriMesh, cam: Camera, fit: Fit, width: number, height: number, tones = TONES): ToneImage {
  const tone = new Uint8Array(width * height).fill(EMPTY)
  const depth = new Float32Array(width * height).fill(-Infinity)
  const light = lightFor(cam)
  const P = mesh.positions, T = mesh.triangles
  const pt = (i: number): V3 => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]
  for (let t = 0; t < T.length; t += 3) {
    const a = pt(T[t]), b = pt(T[t + 1]), c = pt(T[t + 2])
    const n = norm([(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])])
    if (dot(n, cam.toCam) <= 1e-9) continue // грань смотрит от камеры
    const v = [a, b, c].map((p) => { const q = project(cam, p); const s = applyFit(fit, q); return { x: s.x, y: s.y, d: q.depth } })
    const x0 = Math.max(0, Math.floor(Math.min(v[0].x, v[1].x, v[2].x))), x1 = Math.min(width - 1, Math.ceil(Math.max(v[0].x, v[1].x, v[2].x)))
    const y0 = Math.max(0, Math.floor(Math.min(v[0].y, v[1].y, v[2].y))), y1 = Math.min(height - 1, Math.ceil(Math.max(v[0].y, v[1].y, v[2].y)))
    const area = (v[1].x - v[0].x) * (v[2].y - v[0].y) - (v[2].x - v[0].x) * (v[1].y - v[0].y)
    if (Math.abs(area) < 1e-12) continue
    const tn = toneOf(n, light, tones)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5
      const w0 = ((v[1].x - px) * (v[2].y - py) - (v[2].x - px) * (v[1].y - py)) / area
      const w1 = ((v[2].x - px) * (v[0].y - py) - (v[0].x - px) * (v[2].y - py)) / area
      const w2 = 1 - w0 - w1
      if (w0 < -1e-9 || w1 < -1e-9 || w2 < -1e-9) continue
      const d = w0 * v[0].d + w1 * v[1].d + w2 * v[2].d
      const i = y * width + x
      if (d > depth[i]) { depth[i] = d; tone[i] = tn }
    }
  }
  return { width, height, tone, depth }
}
