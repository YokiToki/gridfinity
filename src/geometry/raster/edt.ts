const INF = 1e20

/** Одномерное преобразование Фельценшвальба: d[q] = min_p ((q − p)² + f[p]). */
function dt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0
  v[0] = 0; z[0] = -INF; z[1] = INF
  for (let q = 1; q < n; q++) {
    let s: number
    for (;;) {
      const p = v[k]
      s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p)
      if (s <= z[k] && k > 0) k--
      else break
    }
    k++
    v[k] = q; z[k] = s; z[k + 1] = INF
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
  }
}

/**
 * Точное евклидово преобразование расстояний за O(n): для каждого пикселя квадрат расстояния до ближайшего нулевого
 * пикселя маски (в нулевых — 0). Если нулей нет, значения огромны. За пределами картинки нулей нет.
 */
export function edtSquared(mask: Uint8Array, w: number, h: number): Float64Array {
  const out = new Float64Array(w * h)
  const m = Math.max(w, h)
  const f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = mask[y * w + x] ? INF : 0
    dt1d(f, h, d, v, z)
    for (let y = 0; y < h; y++) out[y * w + x] = d[y]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = out[y * w + x]
    dt1d(f, w, d, v, z)
    for (let x = 0; x < w; x++) out[y * w + x] = d[x]
  }
  return out
}

/** Расстояние в пикселях (корень из edtSquared). */
export function edt(mask: Uint8Array, w: number, h: number): Float32Array {
  const sq = edtSquared(mask, w, h)
  const out = new Float32Array(sq.length)
  for (let i = 0; i < sq.length; i++) out[i] = Math.sqrt(sq[i])
  return out
}
