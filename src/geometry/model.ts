import { buildBaseplateParts, type BaseplateGeometry } from './baseplate'
import { meshOf, type MeshData } from './mesh'

/** Параметры по режимам. Новые режимы (box, cutout) добавляются сюда. */
export interface ModeParams { baseplate: BaseplateGeometry }
export type ModeId = keyof ModeParams

/** Одна часть модели: сетка и описание для превью. Без разделения часть одна (A1). */
export interface PartMesh { label: string; col: number; row: number; oversize: boolean; mesh: MeshData }
export interface ModelResult { parts: PartMesh[] }

/** Габариты всей модели в собранных координатах. */
export function modelBounds(r: ModelResult): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const p of r.parts) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p.mesh.min[k]); max[k] = Math.max(max[k], p.mesh.max[k]) }
  return { min, max }
}

/** Единая точка генерации: режим + параметры → части модели. Работает и в воркере, и в тестах. */
export async function generate<M extends ModeId>(mode: M, params: ModeParams[M], wasmUrl?: string): Promise<ModelResult> {
  switch (mode) {
    case 'baseplate': {
      const built = await buildBaseplateParts(params as BaseplateGeometry, wasmUrl)
      const parts = built.map(({ part, solid }) => {
        try { return { label: part.label, col: part.col, row: part.row, oversize: part.oversize, mesh: meshOf(solid) } } finally { solid.delete() }
      })
      return { parts }
    }
    default:
      throw new Error(`Unknown mode: ${String(mode)}`)
  }
}
