/** Изображение для обработки: яркость 0…255 и, если есть, прозрачность. Пиксели идут по строкам сверху вниз. */
export interface GrayImage { width: number; height: number; gray: Uint8Array; alpha: Uint8Array | null }

/** Порог Оцу: яркости ≤ t считаются одним классом, > t другим; t разделяет классы с максимальной межклассовой дисперсией. */
export function otsu(gray: Uint8Array): number {
  const hist = new Float64Array(256)
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++
  const total = gray.length
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * hist[t]
  let wB = 0, sumB = 0, best = -1, thr = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB, mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > best) { best = between; thr = t }
  }
  return thr
}

/** Прозрачность считается заданной, если есть хотя бы один не полностью непрозрачный пиксель. */
export const hasAlpha = (img: GrayImage) => {
  if (!img.alpha) return false
  for (let i = 0; i < img.alpha.length; i++) if (img.alpha[i] < 250) return true
  return false
}

/**
 * Изображение → маска силуэта (1 = материал). Есть прозрачность — силуэт по ней (alpha ≥ 128); иначе тёмное — материал
 * (яркость ≤ порога), как «чернила» в исходном конвейере. invert меняет роли.
 */
export function toMask(img: GrayImage, threshold: number, invert: boolean): Uint8Array {
  const n = img.width * img.height
  const out = new Uint8Array(n)
  if (hasAlpha(img)) {
    const a = img.alpha!
    for (let i = 0; i < n; i++) out[i] = (a[i] >= 128) !== invert ? 1 : 0
  } else {
    for (let i = 0; i < n; i++) out[i] = (img.gray[i] <= threshold) !== invert ? 1 : 0
  }
  return out
}

/** Доля пикселей со средней яркостью: у фотографий она велика, у линейных рисунков мала (подсказка «это не рисунок»). */
export function midtoneShare(gray: Uint8Array): number {
  let mid = 0
  for (let i = 0; i < gray.length; i++) if (gray[i] > 64 && gray[i] < 192) mid++
  return gray.length ? mid / gray.length : 0
}
