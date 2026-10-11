import { buildBaseplateParts, type BaseplateGeometry } from './baseplate'
import { buildBox, type BoxParams } from './box'
import { buildCutout, buildCutoutTools, type CutoutParams, type MeshRegistry } from './cutout'
import type { IndexedMesh } from './stl-import'
import { getWasm } from './wasm'
import { meshOf, type MeshData } from './mesh'

/** Параметры по режимам. Новые режимы (box, cutout) добавляются сюда. */
export interface ModeParams { baseplate: BaseplateGeometry; box: BoxParams; cutout: CutoutParams }

/** Импортированные сетки этого потока (воркера): вырезы ссылаются на них по id. */
export const meshRegistry: MeshRegistry = new Map()
export const registerMesh = (id: string, mesh: IndexedMesh) => { meshRegistry.set(id, mesh) }
export type ModeId = keyof ModeParams

/** Одна часть модели: сетка и описание для превью. Без разделения часть одна (A1). */
export interface PartMesh { label: string; col: number; row: number; oversize: boolean; mesh: MeshData }
/** Вырезающий инструмент: только для превью, не часть модели (габариты, объём и экспорт его не учитывают). */
export interface ToolMesh { id: string; name: string; mesh: MeshData }
export interface ModelResult { parts: PartMesh[]; tools?: ToolMesh[] }

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
    case 'box': {
      const m = await buildBox(params as BoxParams, wasmUrl)
      try { return { parts: [{ label: 'A1', col: 0, row: 0, oversize: false, mesh: meshOf(m) }] } } finally { m.delete() }
    }
    case 'cutout': {
      const m = await buildCutout(params as CutoutParams, meshRegistry, wasmUrl)
      const tools = buildCutoutTools(await getWasm(wasmUrl), params as CutoutParams, meshRegistry)
      try {
        return { parts: [{ label: 'A1', col: 0, row: 0, oversize: false, mesh: meshOf(m) }], tools: tools.map((t) => ({ id: t.id, name: t.name, mesh: t.mesh })) }
      } finally { m.delete() }
    }
    default:
      throw new Error(`Unknown mode: ${String(mode)}`)
  }
}
