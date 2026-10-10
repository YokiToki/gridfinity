import { useEffect, useRef, useState } from 'react'
import type { MeshData } from '../geometry/mesh'
import { ModelClient, type WorkerLike } from '../geometry/modelClient'
import type { ModeId, ModeParams } from '../geometry/model'

let shared: ModelClient | undefined
/** Общий клиент с воркером. Создаётся лениво, чтобы тесты не поднимали Worker. */
export function getModelClient(): ModelClient {
  shared ??= new ModelClient(new Worker(new URL('../geometry/worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike)
  return shared
}

export interface UseModelOptions {
  /** Пауза перед запуском генерации, мс: быстрые правки склеиваются. */
  debounce?: number
  /** Индикатор «строю» показывается, если генерация длится дольше, мс. */
  indicatorDelay?: number
  client?: Pick<ModelClient, 'generate'>
  /** false — параметры невалидны: ничего не генерируем, прежняя сетка остаётся, экспорт считается устаревшим. */
  enabled?: boolean
}

/** Генерация модели вне основного потока: debounce, побеждает последний запрос, прежняя сетка остаётся при ошибке. */
export function useModel<M extends ModeId>(mode: M, params: ModeParams[M], opts: UseModelOptions = {}) {
  const { debounce = 150, indicatorDelay = 200, client, enabled = true } = opts
  const [mesh, setMesh] = useState<MeshData | null>(null)
  const [busy, setBusy] = useState(false)
  /** Параметры изменились, а сетка ещё старая: экспортировать её нельзя. */
  const [pending, setPending] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef(client)
  clientRef.current = client

  useEffect(() => {
    if (!enabled) { setPending(true); setBusy(false); return }
    let cancelled = false
    let finished = false
    setPending(true)
    const indicator = setTimeout(() => !cancelled && !finished && setBusy(true), indicatorDelay)
    const timer = setTimeout(() => {
      const c = clientRef.current ?? getModelClient()
      c.generate(mode, params).then(
        (m) => {
          if (cancelled || !m) return // устарело
          finished = true
          setMesh(m); setError(null); setBusy(false); setPending(false)
        },
        (e: Error) => { if (!cancelled) { finished = true; setError(e.message); setBusy(false); setPending(false) } },
      )
    }, debounce)
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(indicator) }
  }, [mode, params, debounce, indicatorDelay, enabled])

  return { mesh, busy, pending, error }
}
