import type { MeshData } from '../geometry/mesh'

/** Сетка для экспорта: только позиции (по три числа), треугольники и габарит; нижняя точка на z = 0, угол габарита в x = y = 0. */
export interface PlacedMesh {
  positions: Float32Array
  triangles: Uint32Array
  size: [number, number, number]
}

export interface OrientOptions {
  /** Перевернуть на 180° вокруг оси X: верх становится низом. */
  flip?: boolean
  /** Повернуть на 90° вокруг Z (для укладки на стол). */
  rotate?: boolean
}

/** Применяет ориентацию печати и переносит деталь в начало координат. Повороты собственные, обход граней сохраняется. */
export function orientMesh(mesh: MeshData, o: OrientOptions = {}): PlacedMesh {
  const n = mesh.vertProperties.length / mesh.numProp
  const pos = new Float32Array(n * 3)
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < n; i++) {
    let x = mesh.vertProperties[i * mesh.numProp], y = mesh.vertProperties[i * mesh.numProp + 1], z = mesh.vertProperties[i * mesh.numProp + 2]
    if (o.flip) { y = -y; z = -z }
    if (o.rotate) { const t = x; x = -y; y = t }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z
    if (x < mn[0]) mn[0] = x; if (x > mx[0]) mx[0] = x
    if (y < mn[1]) mn[1] = y; if (y > mx[1]) mx[1] = y
    if (z < mn[2]) mn[2] = z; if (z > mx[2]) mx[2] = z
  }
  for (let i = 0; i < n; i++) { pos[i * 3] -= mn[0]; pos[i * 3 + 1] -= mn[1]; pos[i * 3 + 2] -= mn[2] }
  return { positions: pos, triangles: mesh.triVerts, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] }
}

export type OrientationMode = 'auto' | 'asis' | 'flipped'

/**
 * Автоматическая ориентация: все детали генератора (плита, ящик, вырезной ящик) уже имеют плоское основание на z = 0,
 * поэтому по умолчанию печатаются как есть; «перевернуть» ставит деталь верхом на стол.
 */
export const shouldFlip = (mode: OrientationMode) => mode === 'flipped'
