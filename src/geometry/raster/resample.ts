/** Габарит материала в маске: [x0, y0, x1, y1] (включительно) или null, если маска пуста. */
export function maskBounds(mask: Uint8Array, w: number, h: number): [number, number, number, number] | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  return x1 < 0 ? null : [x0, y0, x1, y1]
}

/**
 * Вырезает прямоугольник [x0, x1) × [y0, y1) маски и переводит в сетку nw × nh усреднением по площади с порогом 0,5.
 * Так размер сетки не зависит от разрешения картинки; растяжение по осям разное, если пропорции nw/nh другие.
 */
export function resampleMask(mask: Uint8Array, w: number, x0: number, y0: number, x1: number, y1: number, nw: number, nh: number): Uint8Array {
  const out = new Uint8Array(nw * nh)
  const sw = x1 - x0, sh = y1 - y0
  for (let j = 0; j < nh; j++) {
    const ya = y0 + (j * sh) / nh, yb = y0 + ((j + 1) * sh) / nh
    for (let i = 0; i < nw; i++) {
      const xa = x0 + (i * sw) / nw, xb = x0 + ((i + 1) * sw) / nw
      let sum = 0, area = 0
      for (let y = Math.floor(ya); y < Math.ceil(yb); y++) {
        const wy = Math.min(y + 1, yb) - Math.max(y, ya)
        if (wy <= 0) continue
        for (let x = Math.floor(xa); x < Math.ceil(xb); x++) {
          const wx = Math.min(x + 1, xb) - Math.max(x, xa)
          if (wx <= 0) continue
          const a = wx * wy
          area += a
          if (mask[y * w + x]) sum += a
        }
      }
      out[j * nw + i] = area > 0 && sum / area >= 0.5 ? 1 : 0
    }
  }
  return out
}
