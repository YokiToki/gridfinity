export interface Components {
  /** Номер компоненты каждого пикселя (1…count); 0 — пиксель не из выбранного класса. */
  labels: Int32Array
  count: number
  /** sizes[k] — число пикселей компоненты k (sizes[0] не используется). */
  sizes: number[]
}

/**
 * Связные компоненты пикселей, равных value (8-связность, как в исходном конвейере). Нумерация — по порядку первого
 * пикселя при построчном обходе, поэтому номера стабильны, пока набор компонент не меняется.
 */
export function labelComponents(mask: Uint8Array, w: number, h: number, value = 1): Components {
  const labels = new Int32Array(w * h)
  const sizes: number[] = [0]
  const stack: number[] = []
  let count = 0
  for (let s = 0; s < labels.length; s++) {
    if (mask[s] !== value || labels[s] !== 0) continue
    count++
    let size = 0
    labels[s] = count
    stack.push(s)
    while (stack.length) {
      const p = stack.pop()!
      size++
      const x = p % w, y = (p - x) / w
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          const q = yy * w + xx
          if (mask[q] === value && labels[q] === 0) { labels[q] = count; stack.push(q) }
        }
      }
    }
    sizes.push(size)
  }
  return { labels, count, sizes }
}

export interface Hole {
  /** Номер дырки 1…n по порядку первого пикселя; стабилен, пока набор дырок тот же. */
  id: number
  /** Площадь, пиксели. */
  size: number
  /** Центр тяжести, пиксели изображения. */
  cx: number
  cy: number
  /** Номер компоненты фона (для заливки). */
  label: number
}

/** Дырки: компоненты фона, не касающиеся края картинки. Остальной фон — «снаружи». */
export function findHoles(mask: Uint8Array, w: number, h: number): { holes: Hole[]; labels: Int32Array } {
  const { labels, count, sizes } = labelComponents(mask, w, h, 0)
  const border = new Uint8Array(count + 1)
  for (let x = 0; x < w; x++) { border[labels[x]] = 1; border[labels[(h - 1) * w + x]] = 1 }
  for (let y = 0; y < h; y++) { border[labels[y * w]] = 1; border[labels[y * w + w - 1]] = 1 }
  const sx = new Float64Array(count + 1), sy = new Float64Array(count + 1)
  for (let i = 0; i < labels.length; i++) { const l = labels[i]; if (l && !border[l]) { sx[l] += i % w; sy[l] += Math.floor(i / w) } }
  const holes: Hole[] = []
  for (let l = 1; l <= count; l++) if (!border[l]) holes.push({ id: holes.length + 1, size: sizes[l], cx: sx[l] / sizes[l], cy: sy[l] / sizes[l], label: l })
  return { holes, labels }
}

/** Убирает пятна материала меньше minSize пикселей. */
export function removeSpecks(mask: Uint8Array, w: number, h: number, minSize: number): Uint8Array {
  if (minSize <= 1) return mask
  const { labels, sizes } = labelComponents(mask, w, h, 1)
  const out = new Uint8Array(mask.length)
  for (let i = 0; i < out.length; i++) if (labels[i] && sizes[labels[i]] >= minSize) out[i] = 1
  return out
}

/** Заливает дырки материалом, кроме перечисленных в keepOpen (по id из findHoles). Возвращает новую маску и список дырок. */
export function fillHoles(mask: Uint8Array, w: number, h: number, keepOpen: readonly number[] = []): { mask: Uint8Array; holes: Hole[] } {
  const { holes, labels } = findHoles(mask, w, h)
  const fillLabels = new Set(holes.filter((x) => !keepOpen.includes(x.id)).map((x) => x.label))
  const out = new Uint8Array(mask)
  if (fillLabels.size) for (let i = 0; i < out.length; i++) if (labels[i] && fillLabels.has(labels[i])) out[i] = 1
  return { mask: out, holes }
}
