/**
 * Сглаживание бинарной маски: размытие по Гауссу и порог 0,5. Убирает ступеньки в один-два пикселя и тонкие «иглы» растра,
 * а края у больших областей сдвигает меньше, чем на долю пикселя. Углы скругляются примерно на σ.
 */
export function smoothMask(mask: Uint8Array, w: number, h: number, sigma: number): Uint8Array {
  if (!(sigma > 0)) return mask
  const r = Math.max(1, Math.ceil(sigma * 3))
  const k = new Float32Array(2 * r + 1)
  let sum = 0
  for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k[i + r] = v; sum += v }
  for (let i = 0; i < k.length; i++) k[i] /= sum
  const tmp = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      let a = 0
      for (let i = -r; i <= r; i++) { const xx = x + i; if (xx >= 0 && xx < w && mask[row + xx]) a += k[i + r] }
      tmp[row + x] = a
    }
  }
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0
      for (let i = -r; i <= r; i++) { const yy = y + i; if (yy >= 0 && yy < h) a += k[i + r] * tmp[yy * w + x] }
      if (a >= 0.5) out[y * w + x] = 1
    }
  }
  return out
}
