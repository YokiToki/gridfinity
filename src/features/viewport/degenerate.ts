/**
 * Рёбра-складки сетки для контура модели: рёбра, у которых угол между нормалями соседних граней больше angleDeg, и граничные рёбра.
 * Свой алгоритм вместо THREE.EdgesGeometry из-за вырожденных треугольников: CSG соединяет коллинеарные вершины (например концы пазов в
 * одном ряду) тонкими треугольниками с нулевой площадью и случайной нормалью, а по ним EdgesGeometry рисует линию через всю грань.
 * Здесь такой треугольник берёт нормаль соседа через свою длинную сторону. Возвращает пары вершин (x, y, z, x, y, z) подряд.
 */
export function creaseEdges(positions: Float32Array, tris: Uint32Array, angleDeg = 25, eps = 1e-4): Float32Array {
  const nt = tris.length / 3, n = new Float32Array(nt * 3), bad = new Uint8Array(nt)
  const longest = new Int8Array(nt) // номер длинной стороны вырожденного треугольника: 0 = a-b, 1 = b-c, 2 = c-a
  for (let t = 0; t < nt; t++) {
    const a = tris[t * 3] * 3, b = tris[t * 3 + 1] * 3, c = tris[t * 3 + 2] * 3
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2]
    const wx = positions[c] - positions[a], wy = positions[c + 1] - positions[a + 1], wz = positions[c + 2] - positions[a + 2]
    const vx = positions[c] - positions[b], vy = positions[c + 1] - positions[b + 1], vz = positions[c + 2] - positions[b + 2]
    const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx
    const l0 = ux * ux + uy * uy + uz * uz, l1 = vx * vx + vy * vy + vz * vz, l2 = wx * wx + wy * wy + wz * wz
    const len = Math.hypot(cx, cy, cz), big = Math.max(l0, l1, l2)
    if (len > eps * big) { n[t * 3] = cx / len; n[t * 3 + 1] = cy / len; n[t * 3 + 2] = cz / len } else { bad[t] = 1; longest[t] = l0 >= l1 && l0 >= l2 ? 0 : l1 >= l2 ? 1 : 2 }
  }
  const nv = positions.length / 3
  const key = (p: number, q: number) => (p < q ? p * nv + q : q * nv + p)
  const faces = new Map<number, number[]>()
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
    const e = key(tris[t * 3 + k], tris[t * 3 + (k + 1) % 3])
    const list = faces.get(e)
    if (list) list.push(t); else faces.set(e, [t])
  }
  // вырожденный треугольник наследует нормаль соседа через длинную сторону (несколько проходов: рядом бывают цепочки таких)
  for (let pass = 0; pass < 4; pass++) {
    let left = 0
    for (let t = 0; t < nt; t++) {
      if (!bad[t]) continue
      const k = longest[t]
      const list = faces.get(key(tris[t * 3 + k], tris[t * 3 + (k + 1) % 3]))
      const o = list?.find((u) => u !== t && !bad[u])
      if (o === undefined) { left++; continue }
      n[t * 3] = n[o * 3]; n[t * 3 + 1] = n[o * 3 + 1]; n[t * 3 + 2] = n[o * 3 + 2]; bad[t] = 0
    }
    if (!left) break
  }
  const cos = Math.cos((angleDeg * Math.PI) / 180), out: number[] = []
  const push = (p: number, q: number) => out.push(positions[p * 3], positions[p * 3 + 1], positions[p * 3 + 2], positions[q * 3], positions[q * 3 + 1], positions[q * 3 + 2])
  for (const [e, list] of faces) {
    const p = Math.floor(e / nv), q = e - p * nv
    if (list.length === 1) { if (!bad[list[0]]) push(p, q); continue }
    const [t1, t2] = list
    if (bad[t1] || bad[t2]) continue
    if (n[t1 * 3] * n[t2 * 3] + n[t1 * 3 + 1] * n[t2 * 3 + 1] + n[t1 * 3 + 2] * n[t2 * 3 + 2] < cos) push(p, q)
  }
  return Float32Array.from(out)
}
