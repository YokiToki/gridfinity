import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { openMeshStore } from './meshStore'
import { repairMesh } from '../../geometry/stl-import'
import { boxSoup } from '../../geometry/stl-fixtures'

describe('meshStore', () => {
  const mesh = repairMesh(boxSoup(10, 20, 30)).mesh

  it('IndexedDB: сохранение, чтение и удаление; данные переживают повторное открытие базы', async () => {
    const factory = new IDBFactory()
    const a = await openMeshStore(factory)
    expect(a.persistent).toBe(true)
    await a.save('m1', mesh)
    const back = (await a.load('m1'))!
    expect(Array.from(back.vertProperties)).toEqual(Array.from(mesh.vertProperties))
    expect(Array.from(back.triVerts)).toEqual(Array.from(mesh.triVerts))
    const b = await openMeshStore(factory) // «после перезагрузки»
    expect(Array.from((await b.load('m1'))!.triVerts)).toEqual(Array.from(mesh.triVerts))
    await b.remove('m1')
    expect(await b.load('m1')).toBeUndefined()
    expect(await a.load('nope')).toBeUndefined()
  })
  it('нет IndexedDB: хранилище в памяти, persistent = false, работает в пределах сессии', async () => {
    const s = await openMeshStore(null)
    expect(s.persistent).toBe(false)
    await s.save('x', mesh)
    expect((await s.load('x'))!.triVerts.length).toBe(mesh.triVerts.length)
    await s.remove('x')
    expect(await s.load('x')).toBeUndefined()
  })
  it('IndexedDB, которая не открывается, даёт запасной вариант в памяти', async () => {
    const broken = { open() { throw new Error('denied') } } as unknown as IDBFactory
    const s = await openMeshStore(broken)
    expect(s.persistent).toBe(false)
    await s.save('y', mesh)
    expect(await s.load('y')).toBeDefined()
  })
  it('ошибка записи в IndexedDB переключает на память и сообщает об этом', async () => {
    const factory = new IDBFactory()
    const s = await openMeshStore(factory)
    // сломанные данные (функция не клонируется структурным копированием)
    await s.save('z', { vertProperties: (() => 1) as unknown as Float32Array, triVerts: new Uint32Array(0) })
    expect(s.persistent).toBe(false)
    expect(await s.load('z')).toBeDefined()
  })
})
