// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useModel } from './useModel'
import { sharpParams as defaultParams, units } from '../geometry/testing'
import type { MeshData } from '../geometry/mesh'

const mesh = (volume: number): MeshData => ({ vertProperties: new Float32Array(), triVerts: new Uint32Array(), numProp: 3, min: [0, 0, 0], max: [1, 1, 1], volume })

describe('useModel', () => {
  it('склеивает быстрые правки: генерируется только последняя', async () => {
    vi.useFakeTimers()
    const generate = vi.fn().mockResolvedValue(mesh(1))
    const { rerender } = renderHook(({ p }) => useModel('baseplate', p, { client: { generate } }), { initialProps: { p: defaultParams } })
    rerender({ p: { ...defaultParams, x: units(3) } })
    rerender({ p: { ...defaultParams, x: units(4) } })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(generate).toHaveBeenCalledTimes(1)
    expect(generate.mock.calls[0][1].x.value).toBe(4)
    vi.useRealTimers()
  })
  it('устаревший результат не заменяет новый', async () => {
    vi.useFakeTimers()
    let resolveOld!: (m: MeshData) => void
    const generate = vi.fn()
      .mockImplementationOnce(() => new Promise<MeshData>((r) => (resolveOld = r)))
      .mockResolvedValueOnce(mesh(2))
    const { result, rerender } = renderHook(({ p }) => useModel('baseplate', p, { client: { generate } }), { initialProps: { p: defaultParams } })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    rerender({ p: { ...defaultParams, x: units(5) } })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(result.current.mesh?.volume).toBe(2)
    await act(async () => { resolveOld(mesh(1)) })
    expect(result.current.mesh?.volume).toBe(2)
    vi.useRealTimers()
  })
  it('enabled=false: генерация не запускается, прежняя сетка остаётся, pending=true', async () => {
    vi.useFakeTimers()
    const generate = vi.fn().mockResolvedValue(mesh(1))
    const { result, rerender } = renderHook(({ p, enabled }) => useModel('baseplate', p, { client: { generate }, enabled }), { initialProps: { p: defaultParams, enabled: true } })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(result.current.mesh?.volume).toBe(1)
    rerender({ p: { ...defaultParams, x: units(7) }, enabled: false })
    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(generate).toHaveBeenCalledTimes(1)
    expect(result.current.mesh?.volume).toBe(1)
    expect(result.current.pending).toBe(true)
    rerender({ p: { ...defaultParams, x: units(7) }, enabled: true })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(generate).toHaveBeenCalledTimes(2)
    expect(result.current.pending).toBe(false)
    vi.useRealTimers()
  })
  it('при ошибке остаётся прежняя сетка, индикатор появляется с задержкой', async () => {
    vi.useFakeTimers()
    const generate = vi.fn().mockResolvedValueOnce(mesh(1)).mockRejectedValueOnce(new Error('bad'))
    const { result, rerender } = renderHook(({ p }) => useModel('baseplate', p, { client: { generate } }), { initialProps: { p: defaultParams } })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(result.current.busy).toBe(false)
    rerender({ p: { ...defaultParams, x: units(9) } })
    await act(async () => { await vi.advanceTimersByTimeAsync(10) })
    expect(result.current.busy).toBe(false) // быстрее порога
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(result.current.error).toBe('bad')
    expect(result.current.mesh?.volume).toBe(1)
    expect(result.current.busy).toBe(false)
    vi.useRealTimers()
  })
})
