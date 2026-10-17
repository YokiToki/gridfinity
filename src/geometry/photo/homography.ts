import type { GrayImage } from '../raster/threshold'
import { rectifiedScale, type Paper } from './paper'

export type Pt = [number, number]
/** Матрица 3 × 3 по строкам: [h0 h1 h2; h3 h4 h5; h6 h7 1]. */
export type Mat3 = [number, number, number, number, number, number, number, number, number]

/** Применяет проективное преобразование к точке. */
export function applyH(h: Mat3, [x, y]: Pt): Pt {
  const w = h[6] * x + h[7] * y + h[8]
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]
}

/** Гомография, переводящая четыре точки src в четыре точки dst (метод прямого решения 8 × 8, выбор главного элемента). null — вырождена. */
export function homography(src: Pt[], dst: Pt[]): Mat3 | null {
  if (src.length !== 4 || dst.length !== 4) return null
  const a: number[][] = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i]
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y, v])
  }
  for (let c = 0; c < 8; c++) {
    let p = c
    for (let r = c + 1; r < 8; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r
    if (Math.abs(a[p][c]) < 1e-12) return null
    ;[a[c], a[p]] = [a[p], a[c]]
    for (let r = 0; r < 8; r++) {
      if (r === c) continue
      const f = a[r][c] / a[c][c]
      if (f !== 0) for (let k = c; k < 9; k++) a[r][k] -= f * a[c][k]
    }
  }
  const h = a.map((row, i) => row[8] / row[i])
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
}

/** Обратная матрица (для проверок и построения тестовых снимков); null — вырождена. */
export function invertH(m: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, h, i] = m
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g
  const det = a * A + b * B + c * C
  if (Math.abs(det) < 1e-18) return null
  const r: Mat3 = [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d]
  const k = r[8]
  return r.map((v) => v / k) as Mat3
}

export type QuadCheck = 'ok' | 'notConvex' | 'mirrored' | 'tooSmall'

/**
 * Четыре угла листа в порядке обхода по часовой стрелке (в системе с осью y вниз): левый верхний, правый верхний, правый нижний,
 * левый нижний. Против часовой — зеркальный порядок (результат вышел бы зеркальным); самопересечение и вырожденность — не выпуклый.
 */
export function checkQuad(q: Pt[], minEdge = 8): QuadCheck {
  if (q.length !== 4) return 'notConvex'
  const cross = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
  const c = [0, 1, 2, 3].map((i) => cross(q[i], q[(i + 1) % 4], q[(i + 2) % 4]))
  for (let i = 0; i < 4; i++) if (Math.hypot(q[(i + 1) % 4][0] - q[i][0], q[(i + 1) % 4][1] - q[i][1]) < minEdge) return 'tooSmall'
  if (c.every((v) => v > 0)) return 'ok'
  if (c.every((v) => v < 0)) return 'mirrored'
  return 'notConvex'
}

export interface Rectified {
  /** Растр листа в яркости; пиксель (i, j) — точка листа (i + 0,5, j + 0,5) / scale мм от левого верхнего угла. */
  image: GrayImage
  /** Пикселей на мм. */
  scale: number
  paper: Paper
}

/** Билинейная выборка яркости; за пределами снимка берётся ближайший край. */
function sample(img: GrayImage, x: number, y: number): number {
  const w = img.width, h = img.height
  const fx = Math.min(w - 1, Math.max(0, x - 0.5)), fy = Math.min(h - 1, Math.max(0, y - 0.5))
  const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1)
  const tx = fx - x0, ty = fy - y0, g = img.gray
  const top = g[y0 * w + x0] * (1 - tx) + g[y0 * w + x1] * tx
  const bot = g[y1 * w + x0] * (1 - tx) + g[y1 * w + x1] * tx
  return top * (1 - ty) + bot * ty
}

/**
 * Выпрямление: для каждого пикселя листа берётся точка снимка по гомографии лист → снимок (так в результате нет дыр).
 * corners — углы листа на снимке (пиксели): левый верхний, правый верхний, правый нижний, левый нижний.
 * Возвращает null, если углы не образуют допустимый четырёхугольник.
 */
export function rectify(photo: GrayImage, corners: Pt[], paper: Paper): Rectified | null {
  if (checkQuad(corners) !== 'ok') return null
  const rect: Pt[] = [[0, 0], [paper.width, 0], [paper.width, paper.height], [0, paper.height]]
  const h = homography(rect, corners)
  if (!h) return null
  const scale = rectifiedScale(paper)
  const w = Math.max(1, Math.round(paper.width * scale)), hh = Math.max(1, Math.round(paper.height * scale))
  const gray = new Uint8Array(w * hh)
  for (let j = 0; j < hh; j++) {
    for (let i = 0; i < w; i++) {
      const [x, y] = applyH(h, [(i + 0.5) / scale, (j + 0.5) / scale])
      gray[j * w + i] = Math.round(sample(photo, x, y))
    }
  }
  return { image: { width: w, height: hh, gray, alpha: null }, scale, paper }
}
