/// <reference lib="webworker" />
import wasmUrl from 'manifold-3d/manifold.wasm?url'
import { generate } from './model'
import { transferables } from './mesh'
import type { WorkerRequest, WorkerResponse } from './modelClient'

// Воркер владеет экземпляром WASM; Manifold-объекты наружу не выходят, только сетка.
self.addEventListener('message', async (e: MessageEvent<WorkerRequest>) => {
  const { id, mode, params } = e.data
  try {
    const mesh = await generate(mode, params, wasmUrl)
    self.postMessage({ id, mesh } satisfies WorkerResponse, transferables(mesh))
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse)
  }
})
