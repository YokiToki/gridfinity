import type { PartMesh } from '../../geometry/model'
import { apply, withOpenGap, type Assembly, type Mat4 } from '../../geometry/keychainAssembly'

/** Вид половин брелка: лист печати или собранный брелок. */
export type KeychainView = 'sheet' | 'assembled'

export const OPEN_GAP_MAX = 15

/** Матрица детали в собранном виде с раздвижкой; null — деталь стоит как на листе (собранного вида нет). */
export function assembledMatrix(label: string, assembly: Assembly | undefined, view: KeychainView, openGap: number): Mat4 | null {
  const m = view === 'assembled' ? assembly?.[label] : undefined
  return m ? withOpenGap(label, m, Math.min(OPEN_GAP_MAX, Math.max(0, openGap))) : null
}

/** Габарит всех деталей в текущей раскладке: углы габаритов, перенесённые матрицами. Для подгонки камеры. */
export function layoutBounds(parts: PartMesh[], assembly: Assembly | undefined, view: KeychainView, openGap: number): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const part of parts) {
    const m = assembledMatrix(part.label, assembly, view, openGap)
    const { min: a, max: b } = part.mesh
    for (let i = 0; i < 8; i++) {
      const c: [number, number, number] = [i & 1 ? b[0] : a[0], i & 2 ? b[1] : a[1], i & 4 ? b[2] : a[2]]
      const p = m ? apply(m, c) : c
      for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]) }
    }
  }
  return { min, max }
}
