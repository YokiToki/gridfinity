/**
 * Убирает вырожденные треугольники (три вершины почти на одной прямой). У сетки они законны (CSG соединяет коллинеарные вершины,
 * например концы пазов в одном ряду), но нормаль такого треугольника случайна: контур и затенение рисовали бы по нему линию.
 * Порог относительный: удвоенная площадь меньше 1e-4 от квадрата длинной стороны.
 */
export function dropDegenerate(positions: Float32Array, tris: Uint32Array, eps = 1e-4): Uint32Array {
  const keep: number[] = []
  for (let i = 0; i < tris.length; i += 3) {
    const a = tris[i] * 3, b = tris[i + 1] * 3, c = tris[i + 2] * 3
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2]
    const wx = positions[c] - positions[a], wy = positions[c + 1] - positions[a + 1], wz = positions[c + 2] - positions[a + 2]
    const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx
    const vx = wx - ux, vy = wy - uy, vz = wz - uz
    const longest = Math.max(ux * ux + uy * uy + uz * uz, wx * wx + wy * wy + wz * wz, vx * vx + vy * vy + vz * vz)
    if (Math.hypot(cx, cy, cz) > eps * longest) keep.push(tris[i], tris[i + 1], tris[i + 2])
  }
  return keep.length === tris.length ? tris : Uint32Array.from(keep)
}
