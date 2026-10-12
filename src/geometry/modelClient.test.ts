import { describe, expect, it } from 'vitest'
import { ModelClient, type WorkerLike, type WorkerMessage, type WorkerRequest, type WorkerResponse } from './modelClient'
import { defaultKeychain } from './keychain'
import { result, sharpParams as defaultParams, units } from './testing'


class FakeWorker implements WorkerLike {
  sent: WorkerRequest[] = []
  meshes: WorkerMessage[] = []
  private cb: ((e: { data: WorkerResponse }) => void) | undefined
  postMessage(m: WorkerMessage) { if ('kind' in m) this.meshes.push(m); else this.sent.push(m) }
  addEventListener(_t: 'message', cb: (e: { data: WorkerResponse }) => void) { this.cb = cb }
  reply(r: WorkerResponse) { this.cb!({ data: r }) }
}

describe('ModelClient', () => {
  it('ответ на устаревший запрос отбрасывается (в любом порядке ответов)', async () => {
    const w = new FakeWorker()
    const c = new ModelClient(w)
    const a = c.generate('baseplate', defaultParams)
    const b = c.generate('baseplate', { ...defaultParams, x: units(3) })
    w.reply({ id: 2, result: result(2) }) // новый ответ пришёл первым
    w.reply({ id: 1, result: result(1) }) // старый — позже
    expect(await a).toBeNull()
    expect((await b)?.parts[0].mesh.volume).toBe(2)
  })
  it('старый ответ раньше нового тоже не побеждает', async () => {
    const w = new FakeWorker()
    const c = new ModelClient(w)
    const a = c.generate('baseplate', defaultParams)
    const b = c.generate('baseplate', defaultParams)
    w.reply({ id: 1, result: result(1) })
    w.reply({ id: 2, result: result(2) })
    expect(await a).toBeNull()
    expect((await b)?.parts[0].mesh.volume).toBe(2)
  })
  it('ошибка воркера отклоняет актуальный запрос', async () => {
    const w = new FakeWorker()
    const c = new ModelClient(w)
    const a = c.generate('baseplate', defaultParams)
    w.reply({ id: 1, error: 'boom' })
    await expect(a).rejects.toThrow('boom')
  })
  it('регистрация сетки уходит воркеру копией и не занимает запросы', () => {
    const w = new FakeWorker()
    const c = new ModelClient(w)
    const mesh = { vertProperties: new Float32Array([1, 2, 3]), triVerts: new Uint32Array([0, 0, 0]) }
    c.registerMesh('m1', mesh)
    expect(w.sent).toEqual([])
    expect(w.meshes[0]).toMatchObject({ kind: 'mesh', meshId: 'm1' })
    expect(Array.from((w.meshes[0] as { mesh: typeof mesh }).mesh.vertProperties)).toEqual([1, 2, 3])
    expect(mesh.vertProperties.length).toBe(3) // исходная сетка осталась у вызывающего
  })
  it('запросы получают возрастающие id и содержат режим и параметры', () => {
    const w = new FakeWorker()
    const c = new ModelClient(w)
    void c.generate('baseplate', defaultParams)
    void c.generate('baseplate', defaultParams)
    expect(w.sent.map((m) => m.id)).toEqual([1, 2])
    expect(w.sent[0].mode).toBe('baseplate')
  })
  it('keychain: изображение отправляется воркеру копией, запросы идут по порядку, последний побеждает', async () => {
    const w = new FakeWorker()
    const c = new ModelClient(w)
    const img = { width: 2, height: 1, gray: Uint8Array.from([0, 255]), alpha: Uint8Array.from([255, 255]) }
    c.registerImage('i1', img)
    expect(img.gray.length).toBe(2) // исходный буфер у вызывающего цел
    const m = w.meshes[0] as Extract<WorkerMessage, { kind: 'image' }>
    expect(m).toMatchObject({ kind: 'image', imageId: 'i1' })
    expect(Array.from(m.image.gray)).toEqual([0, 255])
    const a = c.generate('keychain', { ...defaultKeychain, imageId: 'i1' })
    const b = c.generate('keychain', { ...defaultKeychain, imageId: 'i1', size: { ...defaultKeychain.size, longest: 40 } })
    w.reply({ id: 2, result: result(2) })
    w.reply({ id: 1, result: result(1) })
    expect(await a).toBeNull()
    expect((await b)?.parts[0].mesh.volume).toBe(2)
  })

  it('registerText: сообщение kind=text с копией маски, исходный буфер цел, передаётся владение копией', () => {
    const w = new FakeWorker()
    const c = new ModelClient(w)
    const raster = { mask: Uint8Array.from([0, 255, 128, 0]), width: 2, height: 2, pxPerMm: 12 }
    c.registerText('t1', raster)
    expect(raster.mask.length).toBe(4)
    const m = w.meshes[0] as Extract<WorkerMessage, { kind: 'text' }>
    expect(m).toMatchObject({ kind: 'text', textId: 't1' })
    expect(m.raster).toMatchObject({ width: 2, height: 2, pxPerMm: 12 })
    expect(Array.from(m.raster.mask)).toEqual([0, 255, 128, 0])
    expect(m.raster.mask).not.toBe(raster.mask)
  })
})
