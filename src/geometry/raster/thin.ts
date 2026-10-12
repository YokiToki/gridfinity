/**
 * Скелет маски (утончение Чжана–Суня): однопиксельная срединная линия каждой части силуэта.
 * Нужен для «хребта» вдоль оси фигуры. Маска 1 = материал; край картинки считается фоном.
 */
export function skeleton(mask: Uint8Array, w: number, h: number): Uint8Array {
  const m = new Uint8Array(mask)
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x])
  const drop: number[] = []
  let changed = true
  while (changed) {
    changed = false
    for (let pass = 0; pass < 2; pass++) {
      drop.length = 0
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!m[y * w + x]) continue
        const p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1), p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1)
        const n = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
        if (n < 2 || n > 6) continue
        const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
        let a = 0
        for (let i = 0; i < 8; i++) if (seq[i] === 0 && seq[i + 1] === 1) a++
        if (a !== 1) continue
        if (pass === 0 ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0 : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) drop.push(y * w + x)
      }
      for (const i of drop) { m[i] = 0; changed = true }
    }
  }
  return m
}
