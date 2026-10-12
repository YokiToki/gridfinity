// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { defaultText, textRasterKey, type TextParams } from '../../geometry/text'
import type { RasterDeps } from './textRaster'
import { noTextRaster, useTextRaster } from './useTextRaster'

const T = (over: Partial<TextParams> = {}): TextParams => ({ ...defaultText, enabled: true, content: 'ANNA', ...over })
/** Фальшивый canvas с постоянной маской и счётчиком вызовов loadFont. */
const deps = (lost = false): RasterDeps & { loadFont: ReturnType<typeof vi.fn> } => ({
  createCanvas: (w, h) => ({
    width: w, height: h,
    getContext: () => ({
      font: '', textBaseline: '', textAlign: '', fillStyle: '', letterSpacing: '0px',
      measureText: (s: string) => ({ width: s.length * 7, actualBoundingBoxAscent: 7, actualBoundingBoxDescent: 0 }),
      fillText: () => {}, getImageData: (_x: number, _y: number, ww: number, hh: number) => ({ data: new Uint8ClampedArray(ww * hh * 4) }),
    }),
  }),
  loadFont: vi.fn(async () => !lost),
})
const client = () => ({ registerText: vi.fn() })

describe('useTextRaster', () => {
  it('выключенная или пустая надпись: ничего не растрируется и не регистрируется', async () => {
    const c = client(), d = deps()
    const a = renderHook(() => useTextRaster(T({ enabled: false }), { client: c, deps: d, debounce: 0 }))
    const b = renderHook(() => useTextRaster(T({ content: '  ' }), { client: c, deps: d, debounce: 0 }))
    await new Promise((r) => setTimeout(r, 30))
    expect(c.registerText).not.toHaveBeenCalled()
    expect(a.result.current).toBe(noTextRaster)
    expect(b.result.current.maskId).toBeUndefined()
  })
  it('растр регистрируется один раз под ключом, maskId совпадает с textRasterKey', async () => {
    const c = client()
    const t = T()
    const { result } = renderHook(() => useTextRaster(t, { client: c, deps: deps(), debounce: 0 }))
    await waitFor(() => expect(result.current.maskId).toBe(textRasterKey(t)))
    expect(c.registerText).toHaveBeenCalledTimes(1)
    expect(c.registerText.mock.calls[0][0]).toBe(textRasterKey(t))
    expect(result.current.raster).toMatchObject({ pxPerMm: 12 })
    expect(result.current.fontLost).toBe(false)
  })
  it('сдвиг, поворот, режим, высота и глубина растр не пересчитывают', async () => {
    const c = client(), d = deps()
    const { result, rerender } = renderHook(({ t }) => useTextRaster(t, { client: c, deps: d, debounce: 0 }), { initialProps: { t: T() } })
    await waitFor(() => expect(result.current.maskId).toBeDefined())
    const id = result.current.maskId
    rerender({ t: T({ x: 0.1, y: 0.9, rotation: 40, mode: 'engrave', height: 3, depth: 2 }) })
    await new Promise((r) => setTimeout(r, 40))
    expect(c.registerText).toHaveBeenCalledTimes(1)
    expect(d.loadFont).toHaveBeenCalledTimes(1)
    expect(result.current.maskId).toBe(id)
  })
  it.each([
    ['содержимое', { content: 'Анна' }], ['размер', { size: 10 }], ['шрифт', { font: { id: 'lobster', bold: false, italic: false } }],
    ['межбуквенный', { letterSpacing: 1 }], ['межстрочный', { lineSpacing: 2 }], ['выравнивание', { align: 'left' as const }],
  ])('смена параметра «%s» даёт новый растр и новую регистрацию', async (_n, over) => {
    const c = client()
    const { result, rerender } = renderHook(({ t }) => useTextRaster(t, { client: c, deps: deps(), debounce: 0 }), { initialProps: { t: T() } })
    await waitFor(() => expect(result.current.maskId).toBeDefined())
    const first = result.current.maskId
    rerender({ t: T(over) })
    await waitFor(() => expect(result.current.maskId).not.toBe(first))
    expect(c.registerText).toHaveBeenCalledTimes(2)
  })
  it('пока рисуется новый растр, прежний остаётся, busy включён', async () => {
    const c = client()
    let release: () => void = () => {}
    const slow = deps()
    slow.loadFont = vi.fn(() => new Promise<boolean>((r) => { release = () => r(true) }))
    const fast = deps()
    const { result, rerender } = renderHook(({ t, d }) => useTextRaster(t, { client: c, deps: d, debounce: 0 }), { initialProps: { t: T(), d: fast as RasterDeps } })
    await waitFor(() => expect(result.current.maskId).toBeDefined())
    const first = result.current.maskId
    rerender({ t: T({ content: 'B' }), d: slow })
    await waitFor(() => expect(result.current.busy).toBe(true))
    expect(result.current.maskId).toBe(first)
    await act(async () => { release() })
    await waitFor(() => expect(result.current.maskId).not.toBe(first))
    expect(result.current.busy).toBe(false)
  })
  it('потерянный пользовательский шрифт попадает в fontLost', async () => {
    const { result } = renderHook(() => useTextRaster(T({ font: { id: 'user:x', bold: false, italic: false } }), { client: client(), deps: deps(true), debounce: 0 }))
    await waitFor(() => expect(result.current.maskId).toBeDefined())
    expect(result.current.fontLost).toBe(true)
  })
  it('выключение надписи сбрасывает состояние', async () => {
    const c = client()
    const { result, rerender } = renderHook(({ t }) => useTextRaster(t, { client: c, deps: deps(), debounce: 0 }), { initialProps: { t: T() } })
    await waitFor(() => expect(result.current.maskId).toBeDefined())
    rerender({ t: T({ enabled: false }) })
    expect(result.current).toBe(noTextRaster)
  })
})
