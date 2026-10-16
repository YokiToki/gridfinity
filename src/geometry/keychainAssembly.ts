import type { Mat4 } from 'manifold-3d'

/** Матрица 4×4 по столбцам (как у three.js `Matrix4.fromArray` и `Manifold.transform`). */
export type { Mat4 }

/** Сборка половин брелка: перестановки частей листа печати в собранное положение. Чистые функции, без Manifold. */
export type Assembly = Record<string, Mat4>

export const identity = (): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

export const translation = (x: number, y: number, z: number): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]

/** Применить матрицу к точке. */
export function apply(m: Mat4, p: [number, number, number]): [number, number, number] {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ]
}

/**
 * Нижняя половина на листе = (x, −y, z) верхней, сдвинутая на (tx, ty). В собранном виде она зеркало верхней относительно z = 0:
 * (x, y, z) → (x, y, −z), то есть поворот на 180° вокруг X вместе с возвратом сдвига.
 */
export function bottomAssembly(tx: number, ty: number): Mat4 {
  return [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, -tx, ty, 0, 1]
}

/** Свободный штифт стоит на столе (z от 0 до len, центр по xy в `sheet`); в сборке он по центру отверстия и пересекает плоскость разъёма. */
export function pinAssembly(sheet: { x: number; y: number }, hole: { x: number; y: number }, len: number): Mat4 {
  return translation(hole.x - sheet.x, hole.y - sheet.y, -len / 2)
}

/** Раздвижка: верхняя половина вверх на gap/2, нижняя вниз; штифты остаются на плоскости разъёма. */
export function openOffsets(label: string, gap: number): number {
  return label === 'top' ? gap / 2 : label === 'bottom' ? -gap / 2 : 0
}

/** Матрица детали при раздвижке: сборка, затем сдвиг по Z. */
export function withOpenGap(label: string, m: Mat4, gap: number): Mat4 {
  const out = m.slice() as Mat4
  out[14] += openOffsets(label, gap)
  return out
}
