import type { GrayImage } from '../raster/threshold'

/**
 * Отпечаток лапы для картинки карточки: подушка с двумя нижними долями и четыре пальца, склеенные плавным объединением полей
 * расстояний (в местах стыка получаются скругления, а не острые впадины). Координаты нормированы на сторону растра, y вниз,
 * форма симметрична относительно x = 0,5.
 */
interface Blob { x: number; y: number; a: number; b: number; /** Поворот эллипса, градусы (по часовой стрелке при y вниз). */ rot: number }

const PAD: Blob[] = [
  { x: 0.5, y: 0.655, a: 0.2, b: 0.16, rot: 0 },
  { x: 0.345, y: 0.765, a: 0.115, b: 0.105, rot: 25 },
  { x: 0.655, y: 0.765, a: 0.115, b: 0.105, rot: -25 },
]
/** Пальцы слева направо: крайний, средний, средний, крайний; правая половина — зеркало левой. */
const TOES_LEFT: Blob[] = [
  { x: 0.17, y: 0.53, a: 0.075, b: 0.115, rot: -35 },
  { x: 0.355, y: 0.345, a: 0.085, b: 0.135, rot: -10 },
]
/** Ширина склейки деталей лапы (в долях стороны растра). */
const BLEND = 0.03
const mirror = (b: Blob): Blob => ({ ...b, x: 1 - b.x, rot: -b.rot })
export const PAW_BLOBS: Blob[] = [...PAD, ...TOES_LEFT, ...TOES_LEFT.map(mirror)]

/** Приближённое расстояние со знаком до эллипса (f / |∇f|): точно у границы, где оно и нужно. Внутри — отрицательное. */
function ellipseDistance(blob: Blob, px: number, py: number): number {
  const t = (blob.rot * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t)
  const dx = px - blob.x, dy = py - blob.y
  const x = c * dx + s * dy, y = -s * dx + c * dy
  const f = (x * x) / (blob.a * blob.a) + (y * y) / (blob.b * blob.b) - 1
  const g = Math.hypot((2 * x) / (blob.a * blob.a), (2 * y) / (blob.b * blob.b))
  return g === 0 ? -Math.min(blob.a, blob.b) : f / g
}

/** Расстояние со знаком до силуэта лапы в точке (x, y) единичного квадрата: меньше нуля внутри. */
export function pawField(x: number, y: number): number {
  // экспоненциальный плавный минимум: не зависит от порядка деталей, поэтому форма строго симметрична;
  // детали с зазором меньше ≈ 1,4·BLEND срастаются плавной шейкой
  let sum = 0
  for (const blob of PAW_BLOBS) sum += Math.exp(-ellipseDistance(blob, x, y) / BLEND)
  return -BLEND * Math.log(sum)
}

/**
 * Растр лапы size × size: материал тёмный (0), фон светлый (255), край сглажен по ~1,5 пикселя, чтобы порог по яркости давал
 * контур с точностью до долей пикселя, а не ступени.
 */
export function pawBitmap(size = 1000): GrayImage {
  const gray = new Uint8Array(size * size)
  const aa = 1.5
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const d = pawField((i + 0.5) / size, (j + 0.5) / size) * size
    gray[j * size + i] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + d / aa)))
  }
  return { width: size, height: size, gray, alpha: null }
}
