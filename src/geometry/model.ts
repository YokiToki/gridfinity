import { buildBaseplate, type BaseplateParams } from './baseplate'
import { meshOf, type MeshData } from './mesh'

/** Параметры по режимам. Новые режимы (box, cutout) добавляются сюда. */
export interface ModeParams { baseplate: BaseplateParams }
export type ModeId = keyof ModeParams

/** Единая точка генерации: режим + параметры → сетка. Работает и в воркере, и в тестах. */
export async function generate<M extends ModeId>(mode: M, params: ModeParams[M], wasmUrl?: string): Promise<MeshData> {
  switch (mode) {
    case 'baseplate': {
      const m = await buildBaseplate(params as BaseplateParams, wasmUrl)
      try { return meshOf(m) } finally { m.delete() }
    }
    default:
      throw new Error(`Unknown mode: ${String(mode)}`)
  }
}
