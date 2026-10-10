import { describe, expect, it } from 'vitest'
import { ModelClient, type WorkerLike, type WorkerRequest, type WorkerResponse } from './modelClient'
import { defaultParams } from './baseplate'
import type { MeshData } from './mesh'

const mesh = (volume: number): MeshData => ({ vertProperties: new Float32Array(), triVerts: new Uint32Array(), numProp: 3, min: [0, 0, 0], max: [1, 1, 1], volume })

class FakeWorker implements WorkerLike {
  sent: WorkerRequest[] = []
  private cb: ((e: { data: WorkerResponse }) => void) | undefined
  postMessage(m: WorkerRequest) { this.sent.push(m) }
  addEventListener(_t: 'message', cb: (e: { data: WorkerResponse }) => void) { this.cb = cb }
  reply(r: WorkerResponse) { this.cb!({ data: r }) }
}

describe('ModelClient', () => {
  it('ответ на устаревший запрос отбрасывается (в любом порядке ответов)', async () => {
    const w = new FakeWorker()
    const c = new ModelClient(w)
    const a = c.generate('baseplate', defaultParams)
    const b = c.generate('baseplate', { ...defaultParams, x: 3 })
    w.reply({ id: 2, mesh: mesh(2) }) // новый ответ пришёл первым
    w.reply({ id: 1, mesh: mesh(1) }) // старый — позже
    expect(await a).toBeNull()
    expect((await b)?.volume).toBe(2)
  })
  it('старый ответ раньше нового тоже не побеждает', async () => {
    const w = new FakeWorker()
    const c = new ModelClient(w)
    const a = c.generate('baseplate', defaultParams)
    const b = c.generate('baseplate', defaultParams)
    w.reply({ id: 1, mesh: mesh(1) })
    w.reply({ id: 2, mesh: mesh(2) })
    expect(await a).toBeNull()
    expect((await b)?.volume).toBe(2)
  })
  it('ошибка воркера отклоняет актуальный запрос', async () => {
    const w = new FakeWorker()
    const c = new ModelClient(w)
    const a = c.generate('baseplate', defaultParams)
    w.reply({ id: 1, error: 'boom' })
    await expect(a).rejects.toThrow('boom')
  })
  it('запросы получают возрастающие id и содержат режим и параметры', () => {
    const w = new FakeWorker()
    const c = new ModelClient(w)
    void c.generate('baseplate', defaultParams)
    void c.generate('baseplate', defaultParams)
    expect(w.sent.map((m) => m.id)).toEqual([1, 2])
    expect(w.sent[0].mode).toBe('baseplate')
  })
})
