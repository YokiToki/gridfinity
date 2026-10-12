// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useKeychainModel } from './useKeychainModel'
import { defaultKeychain, type KeychainInfo, type KeychainParams } from '../../geometry/keychain'
import type { ModelResult } from '../../geometry/model'
import type { GrayImage } from '../../geometry/raster/threshold'

const mesh = { vertProperties: new Float32Array(9), triVerts: Uint32Array.from([0, 1, 2]), numProp: 3, min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number], volume: 1 }
const ok = (v: number): ModelResult => ({ parts: [{ label: 'A1', col: 0, row: 0, oversize: false, mesh: { ...mesh, volume: v } }], keychain: { threshold: 100, photoLike: false, preview: null } })
const empty = (error: string): ModelResult => ({ parts: [], keychain: { threshold: 100, photoLike: false, preview: null, error } satisfies KeychainInfo })
const img: GrayImage = { width: 2, height: 2, gray: new Uint8Array(4), alpha: null }
const P = (over: Partial<KeychainParams> = {}): KeychainParams => ({ ...defaultKeychain, imageId: 'i1', ...over })

describe('useKeychainModel (3.3)', () => {
  it('изображение регистрируется один раз, затем идёт генерация с параметрами', async () => {
    const client = { registerImage: vi.fn(), generate: vi.fn(async (..._a: unknown[]) => ok(5)) }
    const { result, rerender } = renderHook(({ p }) => useKeychainModel(p, img, { client, debounce: 0 }), { initialProps: { p: P() } })
    await waitFor(() => expect(result.current.model?.parts[0].mesh.volume).toBe(5))
    expect(client.registerImage).toHaveBeenCalledTimes(1)
    expect(client.registerImage).toHaveBeenCalledWith('i1', img)
    rerender({ p: P({ relief: { ...defaultKeychain.relief, hmax: 3 } }) })
    await waitFor(() => expect(client.generate).toHaveBeenCalledTimes(2))
    expect(client.registerImage).toHaveBeenCalledTimes(1) // тот же объект изображения не отправляется повторно
    expect(client.generate.mock.calls[0][0]).toBe('keychain')
  })
  it('без изображения ничего не генерируется', async () => {
    const client = { registerImage: vi.fn(), generate: vi.fn(async () => ok(1)) }
    const { result } = renderHook(() => useKeychainModel(P(), null, { client, debounce: 0 }))
    await act(async () => { await new Promise((r) => setTimeout(r, 30)) })
    expect(client.generate).not.toHaveBeenCalled()
    expect(result.current.model).toBeNull()
  })
  it('пустая маска оставляет прежнюю сетку, но экспорт становится недоступен (pending) и ошибка видна в info', async () => {
    const answers = [ok(7), empty('keychain.error.emptyMask')]
    const client = { registerImage: vi.fn(), generate: vi.fn(async () => answers.shift()!) }
    const { result, rerender } = renderHook(({ p }) => useKeychainModel(p, img, { client, debounce: 0 }), { initialProps: { p: P() } })
    await waitFor(() => expect(result.current.model?.parts[0].mesh.volume).toBe(7))
    expect(result.current.pending).toBe(false)
    rerender({ p: P({ silhouette: { ...defaultKeychain.silhouette, threshold: 5 } }) })
    await waitFor(() => expect(result.current.info?.error).toBe('keychain.error.emptyMask'))
    expect(result.current.model?.parts[0].mesh.volume).toBe(7) // прежняя сетка на месте
    expect(result.current.pending).toBe(true)
  })
  it('невалидные параметры (heightFloor ≥ hmax) не запускают генерацию', async () => {
    const client = { registerImage: vi.fn(), generate: vi.fn(async () => ok(1)) }
    const { result } = renderHook(() => useKeychainModel(P({ relief: { ...defaultKeychain.relief, heightFloor: 5 } }), img, { client, debounce: 0 }))
    await act(async () => { await new Promise((r) => setTimeout(r, 30)) })
    expect(client.generate).not.toHaveBeenCalled()
    expect(result.current.valid).toBe(false)
    expect(result.current.pending).toBe(true)
  })
})
