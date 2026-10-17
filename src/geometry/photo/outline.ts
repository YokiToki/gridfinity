import { gaussianBlur } from '../raster/blur'
import { simplifyLoop, traceAlpha } from '../textOutline'
import type { Pt } from './homography'
import type { Segmentation } from './segment'

export interface TracedOutline {
  /** Контур в мм относительно центра своего габарита: ось y вверх (как в коробке), обход против часовой стрелки, без дырок. */
  points: Pt[]
  /** Габарит контура, мм. */
  size: { w: number; l: number }
  /** Центр габарита на листе, мм от центра листа, ось y вверх. */
  center: Pt
  areaMm2: number
}

/** Допуск упрощения контура, мм: меньше шага растра и заметно меньше любого допуска печати. */
export const OUTLINE_TOLERANCE = 0.15
/** Поля вокруг предмета при вырезании маски, пиксели: контур не упирается в край кадра. */
const PAD = 3

const signedArea = (p: Pt[]) => p.reduce((a, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return a + (x * y2 - x2 * y) / 2 }, 0)

/**
 * Силуэт → многоугольник в мм. Маска силуэта слегка размывается (σ = 1 пиксель), контур берётся с субпиксельной точностью
 * (marching squares), остаётся самая большая внешняя петля (дырки не нужны: карман повторяет внешний контур), контур
 * упрощается по Дугласу–Пекеру, ось y переворачивается вверх и обход делается против часовой стрелки.
 */
export function traceSilhouette(seg: Segmentation, id: number, paper: { width: number; height: number }): TracedOutline | null {
  const sil = seg.silhouettes.find((s) => s.id === id)
  if (!sil) return null
  const [bx0, by0, bx1, by1] = sil.bbox
  const x0 = bx0 - PAD, y0 = by0 - PAD, w = bx1 - bx0 + 1 + 2 * PAD, h = by1 - by0 + 1 + 2 * PAD
  const values = new Float32Array(w * h), ones = new Uint8Array(w * h).fill(1)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x0 + i, Y = y0 + j
    if (X >= 0 && Y >= 0 && X < seg.width && Y < seg.height && seg.labels[Y * seg.width + X] === id) values[j * w + i] = 255
  }
  const blurred = gaussianBlur(values, w, h, 1, ones)
  const mask = new Uint8Array(w * h)
  for (let k = 0; k < mask.length; k++) mask[k] = Math.round(blurred[k])
  const loops = traceAlpha(mask, w, h, 128)
  if (!loops.length) return null
  const outer = loops.reduce((best, l) => (Math.abs(signedArea(l)) > Math.abs(signedArea(best)) ? l : best))
  const s = seg.scale
  const simple = simplifyLoop(outer, OUTLINE_TOLERANCE * s)
  if (simple.length < 3) return null
  // пиксели кадра → мм листа (y вниз от левого верхнего угла)
  const mm = simple.map(([px, py]) => [(x0 + px) / s, (y0 + py) / s] as Pt)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of mm) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  let points = mm.map(([x, y]) => [x - cx, -(y - cy)] as Pt)
  if (signedArea(points) < 0) points = points.reverse()
  return {
    points,
    size: { w: maxX - minX, l: maxY - minY },
    center: [cx - paper.width / 2, -(cy - paper.height / 2)],
    areaMm2: Math.abs(signedArea(points)),
  }
}
