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
  /** Тот же лист в цвете (R, G, B подряд), если снимок цветной: цвет отличает тень от предмета. */
  rgb?: Uint8Array
  /** Пикселей на мм. */
  scale: number
  paper: Paper
}

/**
 * Выпрямление: для каждого пикселя листа берётся точка снимка по гомографии лист → снимок (так в результате нет дыр).
 * corners — углы листа на снимке (пиксели): левый верхний, правый верхний, правый нижний, левый нижний. rgb — цвет снимка
 * (R, G, B подряд, размеры как у photo): если задан, цвет выпрямляется так же. pxPerMm — меньший масштаб для быстрого превью
 * (по умолчанию 4 пикселя на мм, как нужно для силуэтов).
 * Возвращает null, если углы не образуют допустимый четырёхугольник.
 */
export function rectify(photo: GrayImage, corners: Pt[], paper: Paper, rgb?: Uint8Array, pxPerMm?: number): Rectified | null {
  if (checkQuad(corners) !== 'ok') return null
  const rect: Pt[] = [[0, 0], [paper.width, 0], [paper.width, paper.height], [0, paper.height]]
  const hm = homography(rect, corners)
  if (!hm) return null
  const scale = pxPerMm ? Math.min(pxPerMm, rectifiedScale(paper)) : rectifiedScale(paper)
  const w = Math.max(1, Math.round(paper.width * scale)), hh = Math.max(1, Math.round(paper.height * scale))
  const gray = new Uint8Array(w * hh)
  const colour = rgb && rgb.length === photo.width * photo.height * 3 ? new Uint8Array(w * hh * 3) : undefined
  const g = photo.gray, pw = photo.width, ph = photo.height
  const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = hm
  const inv = 1 / scale
  // горячий цикл: без выделения памяти на пиксель (ни массивов, ни объектов), отсюда скорость при перетаскивании угла
  for (let j = 0; j < hh; j++) {
    const y = (j + 0.5) * inv
    const rx = h1 * y + h2, ry = h4 * y + h5, rw = h7 * y + h8
    for (let i = 0; i < w; i++) {
      const x = (i + 0.5) * inv
      const iw = 1 / (h6 * x + rw)
      let fx = (h0 * x + rx) * iw - 0.5, fy = (h3 * x + ry) * iw - 0.5
      fx = fx < 0 ? 0 : fx > pw - 1 ? pw - 1 : fx
      fy = fy < 0 ? 0 : fy > ph - 1 ? ph - 1 : fy
      const x0 = fx | 0, y0 = fy | 0
      const x1 = x0 + 1 < pw ? x0 + 1 : x0, y1 = y0 + 1 < ph ? y0 + 1 : y0
      const tx = fx - x0, ty = fy - y0
      const i00 = y0 * pw + x0, i10 = y0 * pw + x1, i01 = y1 * pw + x0, i11 = y1 * pw + x1
      const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty
      const k = j * w + i
      gray[k] = Math.round(g[i00] * w00 + g[i10] * w10 + g[i01] * w01 + g[i11] * w11)
      if (colour && rgb) {
        const o = k * 3, a = i00 * 3, b = i10 * 3, c = i01 * 3, d = i11 * 3
        colour[o] = Math.round(rgb[a] * w00 + rgb[b] * w10 + rgb[c] * w01 + rgb[d] * w11)
        colour[o + 1] = Math.round(rgb[a + 1] * w00 + rgb[b + 1] * w10 + rgb[c + 1] * w01 + rgb[d + 1] * w11)
        colour[o + 2] = Math.round(rgb[a + 2] * w00 + rgb[b + 2] * w10 + rgb[c + 2] * w01 + rgb[d + 2] * w11)
      }
    }
  }
  return { image: { width: w, height: hh, gray, alpha: null }, ...(colour ? { rgb: colour } : {}), scale, paper }
}
