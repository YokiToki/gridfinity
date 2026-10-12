// Сглаживание поля значений по узлам сетки: гауссов фильтр и медиана 3 × 3 с маской материала.
// Усредняются только узлы материала (mask = 1) и не «закреплённые» (fixed = 1): значения снаружи силуэта и из закреплённых
// областей не затекают внутрь, а сами закреплённые узлы остаются как были.

/** Предел сигмы в ячейках (стоимость фильтра растёт линейно). */
export const MAX_SIGMA = 40
/** Меньше полуячейки фильтр на сетке ничего не меняет, поэтому любой ненулевой радиус поднимается до неё. */
export const MIN_SIGMA = 0.5

/** Сигма в ячейках из радиуса в мм: 0 — выключено, иначе от MIN_SIGMA до MAX_SIGMA. */
export function sigmaCells(radiusMm: number, cell: number): number {
  if (!(radiusMm > 0) || !(cell > 0)) return 0
  return Math.min(MAX_SIGMA, Math.max(MIN_SIGMA, radiusMm / cell))
}

function kernel(sigma: number): Float32Array {
  const r = Math.max(1, Math.ceil(3 * sigma))
  const k = new Float32Array(2 * r + 1)
  let sum = 0
  for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k[i + r] = v; sum += v }
  for (let i = 0; i < k.length; i++) k[i] /= sum
  return k
}

/**
 * Нормированная свёртка с гауссом: (G * (v·m)) / (G * m), раздельно по строкам и столбцам. Узлы вне mask и узлы fixed
 * не участвуют и не меняются. sigma ≤ 0 возвращает копию.
 */
export function gaussianBlur(values: Float32Array, nx: number, ny: number, sigma: number, mask: Uint8Array, fixed?: Uint8Array): Float32Array {
  if (!(sigma > 0)) return new Float32Array(values)
  const k = kernel(Math.min(sigma, MAX_SIGMA)), r = (k.length - 1) / 2
  const live = new Uint8Array(nx * ny)
  for (let i = 0; i < live.length; i++) live[i] = mask[i] && !(fixed && fixed[i]) ? 1 : 0
  const num = new Float32Array(nx * ny), den = new Float32Array(nx * ny)
  // по строкам
  for (let j = 0; j < ny; j++) {
    const row = j * nx
    for (let i = 0; i < nx; i++) {
      let a = 0, b = 0
      for (let d = -r; d <= r; d++) {
        const x = i + d
        if (x < 0 || x >= nx || !live[row + x]) continue
        const w = k[d + r]
        a += w * values[row + x]; b += w
      }
      num[row + i] = a; den[row + i] = b
    }
  }
  // по столбцам
  const out = new Float32Array(values)
  const colNum = new Float32Array(ny), colDen = new Float32Array(ny)
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) { colNum[j] = num[j * nx + i]; colDen[j] = den[j * nx + i] }
    for (let j = 0; j < ny; j++) {
      if (!live[j * nx + i]) continue
      let a = 0, b = 0
      for (let d = -r; d <= r; d++) {
        const y = j + d
        if (y < 0 || y >= ny) continue
        const w = k[d + r]
        a += w * colNum[y]; b += w * colDen[y]
      }
      // числитель и знаменатель свёрнуты по строкам, теперь по столбцам: частное и есть нормированная свёртка
      if (b > 0) out[j * nx + i] = a / b
    }
  }
  return out
}

/** Медиана 3 × 3 по соседям-материалу (включая сам узел): убирает одиночные выбросы. fixed-узлы не меняются и не участвуют. */
export function median3(values: Float32Array, nx: number, ny: number, mask: Uint8Array, fixed?: Uint8Array): Float32Array {
  const out = new Float32Array(values)
  const buf: number[] = []
  const live = (k: number) => mask[k] && !(fixed && fixed[k])
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i
    if (!live(k)) continue
    buf.length = 0
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const x = i + di, y = j + dj
      if (x < 0 || y < 0 || x >= nx || y >= ny) continue
      const q = y * nx + x
      if (live(q)) buf.push(values[q])
    }
    buf.sort((a, b) => a - b)
    const m = buf.length >> 1
    out[k] = buf.length % 2 ? buf[m] : (buf[m - 1] + buf[m]) / 2
  }
  return out
}
