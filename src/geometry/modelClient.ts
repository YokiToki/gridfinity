import type { ModeId, ModeParams, ModelResult } from './model'
import type { IndexedMesh } from './stl-import'

export interface WorkerRequest { id: number; mode: ModeId; params: ModeParams[ModeId] }
/** Регистрация импортированной сетки в воркере: дальше вырезы ссылаются на неё по id. */
export interface WorkerMeshMessage { kind: 'mesh'; meshId: string; mesh: IndexedMesh }
export type WorkerMessage = WorkerRequest | WorkerMeshMessage
export type WorkerResponse = { id: number; result: ModelResult } | { id: number; error: string }

/** Минимальный интерфейс воркера: нужен, чтобы подменять его в тестах. */
export interface WorkerLike {
  postMessage(msg: WorkerMessage, transfer?: Transferable[]): void
  addEventListener(type: 'message', cb: (e: { data: WorkerResponse }) => void): void
  terminate?(): void
}

interface Pending { resolve: (m: ModelResult | null) => void; reject: (e: Error) => void }

/**
 * Клиент воркера генерации. Побеждает последний запрос: ответ на более старый запрос
 * разрешается как null и никогда не заменяет новый результат.
 */
export class ModelClient {
  private nextId = 1
  private latest = 0
  private pending = new Map<number, Pending>()

  constructor(private worker: WorkerLike) {
    worker.addEventListener('message', (e) => this.onMessage(e.data))
  }

  generate<M extends ModeId>(mode: M, params: ModeParams[M]): Promise<ModelResult | null> {
    const id = this.nextId++
    this.latest = id
    // более старые запросы больше никому не нужны
    for (const [oldId, p] of this.pending) if (oldId < id) { p.resolve(null); this.pending.delete(oldId) }
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker.postMessage({ id, mode, params })
    })
  }

  private onMessage(r: WorkerResponse) {
    const p = this.pending.get(r.id)
    if (!p) return // запрос уже вытеснен
    this.pending.delete(r.id)
    if (r.id !== this.latest) return p.resolve(null)
    if ('error' in r) p.reject(new Error(r.error))
    else p.resolve(r.result)
  }

  /** Сообщает воркеру сетку; сообщения идут по порядку, поэтому следующая генерация её уже видит. Копию передаём, исходная остаётся у вызывающего. */
  registerMesh(meshId: string, mesh: IndexedMesh) {
    const copy: IndexedMesh = { vertProperties: mesh.vertProperties.slice(), triVerts: mesh.triVerts.slice() }
    this.worker.postMessage({ kind: 'mesh', meshId, mesh: copy }, [copy.vertProperties.buffer, copy.triVerts.buffer])
  }

  dispose() { this.worker.terminate?.(); this.pending.clear() }
}
