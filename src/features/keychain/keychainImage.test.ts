// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { decodeImage, ImageError, MAX_SIDE, SVG_SIDE, toGrayImage, type DecodeBackend } from './decodeImage'
import { openImageStore } from './imageStore'
import type { GrayImage } from '../../geometry/raster/threshold'

/** Подмена декодера: исходный размер, RGBA отдаётся для запрошенного размера. */
const fake = (width: number, height: number, fill: (w: number, h: number) => Uint8ClampedArray, asked: number[][] = []): DecodeBackend => ({
  async load() { return { width, height, rgba: (w, h) => { asked.push([w, h]); return fill(w, h) } } },
})
const solid = (r: number, g: number, b: number, a = 255) => (w: number, h: number) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) d.set([r, g, b, a], i * 4); return d }
const blob = (type: string, name = 'x') => Object.assign(new Blob(['x'], { type }), { name })

describe('decodeImage (3.1)', () => {
  it('крошечный PNG: яркость по Rec. 601, прозрачности нет, размеры совпадают', async () => {
    const d = await decodeImage(blob('image/png'), fake(2, 2, solid(255, 0, 0)))
    expect(d.image).toMatchObject({ width: 2, height: 2, alpha: null })
    expect(d.image.gray[0]).toBe(Math.round(0.299 * 255))
    expect(d.downscaled).toBe(false)
  })
  it('прозрачные пиксели дают альфа-канал', () => {
    const rgba = Uint8ClampedArray.from([0, 0, 0, 255, 0, 0, 0, 0])
    const g = toGrayImage(rgba, 2, 1)
    expect(Array.from(g.alpha!)).toEqual([255, 0])
  })
  it('JPEG и WebP принимаются, SVG определяется по типу и по расширению', async () => {
    for (const t of ['image/jpeg', 'image/webp']) await expect(decodeImage(blob(t), fake(4, 4, solid(0, 0, 0)))).resolves.toBeTruthy()
    const asked: number[][] = []
    const d = await decodeImage(blob('', 'logo.svg'), fake(100, 50, solid(0, 0, 0), asked))
    expect(asked[0]).toEqual([SVG_SIDE, SVG_SIDE / 2]) // SVG растеризуется до рабочего размера
    expect(d.downscaled).toBe(false)
  })
  it('слишком большая картинка уменьшается до 4096 по длинной стороне, пропорции сохраняются', async () => {
    const asked: number[][] = []
    const d = await decodeImage(blob('image/png'), fake(8192, 4096, solid(9, 9, 9), asked))
    expect(asked[0]).toEqual([MAX_SIDE, MAX_SIDE / 2])
    expect(d.downscaled).toBe(true)
    expect(d.original).toEqual({ width: 8192, height: 4096 })
    expect(d.image.width).toBe(MAX_SIDE)
  })
  it('картинка в пределах предела не масштабируется', async () => {
    const asked: number[][] = []
    await decodeImage(blob('image/png'), fake(300, 200, solid(0, 0, 0), asked))
    expect(asked[0]).toEqual([300, 200])
  })
  it('текстовый файл — ошибка «неподдерживаемый тип»', async () => {
    await expect(decodeImage(blob('text/plain', 'a.txt'), fake(1, 1, solid(0, 0, 0)))).rejects.toMatchObject({ name: 'Error', code: 'unsupported' })
  })
  it('повреждённый файл — ошибка декодирования, пустая картинка — «empty»', async () => {
    const broken: DecodeBackend = { async load() { throw new Error('bad data') } }
    await expect(decodeImage(blob('image/png'), broken)).rejects.toMatchObject({ code: 'decode' })
    await expect(decodeImage(blob('image/png'), fake(0, 0, solid(0, 0, 0)))).rejects.toBeInstanceOf(ImageError)
    await expect(decodeImage(blob('image/png'), fake(0, 0, solid(0, 0, 0)))).rejects.toMatchObject({ code: 'empty' })
  })
})

describe('imageStore (3.2)', () => {
  const img = (): GrayImage => ({ width: 2, height: 2, gray: Uint8Array.from([0, 1, 2, 3]), alpha: Uint8Array.from([255, 255, 0, 255]) })

  it('IndexedDB: запись и чтение переживают повторное открытие базы', async () => {
    const f = new IDBFactory()
    const a = await openImageStore(f)
    expect(a.persistent).toBe(true)
    await a.save('k', img())
    const b = await openImageStore(f)
    const got = await b.load('k')
    expect(got?.width).toBe(2)
    expect(Array.from(got!.gray)).toEqual([0, 1, 2, 3])
    expect(Array.from(got!.alpha!)).toEqual([255, 255, 0, 255])
    await b.remove('k')
    expect(await b.load('k')).toBeUndefined()
  })
  it('без IndexedDB — хранилище в памяти с признаком «не сохранится»', async () => {
    const s = await openImageStore(null)
    expect(s.persistent).toBe(false)
    await s.save('k', img())
    expect((await s.load('k'))?.height).toBe(2)
    await s.remove('k')
    expect(await s.load('k')).toBeUndefined()
  })
  it('база, которую не удалось открыть, даёт то же хранилище в памяти', async () => {
    const broken = { open() { throw new Error('denied') } } as unknown as IDBFactory
    const s = await openImageStore(broken)
    expect(s.persistent).toBe(false)
    await s.save('x', img())
    expect(await s.load('x')).toBeTruthy()
  })
})
