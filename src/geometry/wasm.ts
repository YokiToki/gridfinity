import Module from 'manifold-3d'
import type { ManifoldToplevel } from 'manifold-3d'

let wasmPromise: Promise<ManifoldToplevel> | undefined

/** Один экземпляр WASM на процесс (поток). wasmUrl нужен только в браузере. */
export function getWasm(wasmUrl?: string): Promise<ManifoldToplevel> {
  wasmPromise ??= Module(wasmUrl ? { locateFile: () => wasmUrl } : undefined).then((w) => {
    w.setup()
    return w
  })
  return wasmPromise
}
