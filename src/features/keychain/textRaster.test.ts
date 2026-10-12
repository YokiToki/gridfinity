import { describe, expect, it, vi } from 'vitest'
import { defaultText, TEXT_PX_PER_MM, type TextParams } from '../../geometry/text'
import { layoutLines, MAX_RASTER_SIDE, rasterizeText, splitLines, type CanvasLike, type Ctx2D, type RasterDeps } from './textRaster'

const T = (over: Partial<TextParams> = {}): TextParams => ({ ...defaultText, enabled: true, content: 'ANNA', ...over })

/** Фальшивый canvas: каждая «буква» шириной 10·(кегль/100) px, высота заглавных 70 % кегля, выносные 20 %. Все вызовы записываются. */
function fake(opts: { native?: boolean; capRatio?: number } = {}) {
  const calls: { fillText: [string, number, number][]; fonts: string[]; spacing: string[]; sizes: [number, number][] } = { fillText: [], fonts: [], spacing: [], sizes: [] }
  const cap = opts.capRatio ?? 0.7
  const mkCtx = (w: number, h: number): Ctx2D => {
    let font = '100px x'
    const px = () => Number(/(\d+(\.\d+)?)px/.exec(font)?.[1] ?? 100)
    const ctx: Ctx2D & { letterSpacing?: string } = {
      get font() { return font }, set font(v: string) { font = v; calls.fonts.push(v) },
      textBaseline: 'alphabetic', textAlign: 'left', fillStyle: '#000',
      measureText: (s: string) => {
        const ls = ctx.letterSpacing ? Number(ctx.letterSpacing.replace('px', '')) : 0
        return { width: [...s].length * 0.1 * px() + [...s].length * ls, actualBoundingBoxAscent: s === 'H' ? cap * px() : cap * px(), actualBoundingBoxDescent: /[джpgqy]/.test(s) ? 0.2 * px() : 0 }
      },
      fillText: (s: string, x: number, y: number) => { calls.fillText.push([s, x, y]) },
      getImageData: (_x: number, _y: number, ww: number, hh: number) => {
        const data = new Uint8ClampedArray(ww * hh * 4)
        for (let k = 0; k < ww * hh; k++) data[k * 4 + 3] = k % 2 ? 255 : 0
        return { data }
      },
    }
    if (opts.native !== false) Object.defineProperty(ctx, 'letterSpacing', { value: '0px', writable: true, enumerable: true })
    else delete ctx.letterSpacing
    void w; void h
    return ctx
  }
  const deps: RasterDeps = {
    createCanvas: (w, h): CanvasLike => { calls.sizes.push([w, h]); return { width: w, height: h, getContext: () => mkCtx(w, h) } },
    loadFont: vi.fn(async () => true),
  }
  return { deps, calls }
}

describe('splitLines', () => {
  it('разбивает по переводу строки, обрезает пустые края, не больше 12 строк', () => {
    expect(splitLines('ANNA')).toEqual(['ANNA'])
    expect(splitLines('\n\nA\nB\n\n')).toEqual(['A', 'B'])
    expect(splitLines('A\r\nB\rC')).toEqual(['A', 'B', 'C'])
    expect(splitLines('a\n\nb')).toEqual(['a', '', 'b'])
    expect(splitLines(Array.from({ length: 30 }, (_, i) => `l${i}`).join('\n'))).toHaveLength(12)
    expect(splitLines('')).toEqual([])
    expect(splitLines('   \n  ')).toEqual([])
  })
})

describe('layoutLines', () => {
  const m = [{ width: 100, ascent: 30, descent: 5 }, { width: 60, ascent: 28, descent: 10 }]
  it('размер коробки: самая длинная строка, шаг строк, выносные снизу', () => {
    const l = layoutLines(m, { lineHeight: 50, pad: 2, align: 'left' })
    expect(l.width).toBe(104)
    expect(l.height).toBe(Math.ceil(50 + 30 + 10 + 4))
    expect(l.lines.map((x) => x.baseline)).toEqual([2 + 30, 2 + 30 + 50])
  })
  it.each([['left', 2, 2], ['center', 2, 22], ['right', 2, 42]] as const)('выравнивание %s', (align, x0, x1) => {
    const l = layoutLines(m, { lineHeight: 50, pad: 2, align })
    expect(l.lines[0].x).toBeCloseTo(x0, 6)
    expect(l.lines[1].x).toBeCloseTo(x1, 6)
  })
  it('выносы чернил: левый свес (как у «я» в Lobster) расширяет коробку и сдвигает начало строки вправо, текст не обрезается', () => {
    const l = layoutLines([{ width: 100, ascent: 30, descent: 5, left: 12, right: 100 }], { lineHeight: 50, pad: 2, align: 'left' })
    expect(l.width).toBe(Math.ceil(12 + 100 + 4))
    expect(l.lines[0].x).toBe(2 + 12) // чернила начинаются ровно с отступа pad
  })
  it('правый свес шире advance расширяет коробку справа; без выносов размер прежний', () => {
    const wide = layoutLines([{ width: 100, ascent: 30, descent: 5, left: 0, right: 109 }], { lineHeight: 50, pad: 2, align: 'left' })
    expect(wide.width).toBe(Math.ceil(109 + 4))
    const plain = layoutLines([{ width: 100, ascent: 30, descent: 5 }], { lineHeight: 50, pad: 2, align: 'left' })
    expect(plain.width).toBe(104)
  })
  it('выравнивание по центру с выносами: все чернила внутри коробки', () => {
    const m = [{ width: 100, ascent: 30, descent: 5, left: 8, right: 104 }, { width: 40, ascent: 30, descent: 5, left: 0, right: 40 }]
    const l = layoutLines(m, { lineHeight: 50, pad: 2, align: 'center' })
    m.forEach((q, i) => {
      expect(l.lines[i].x - (q.left ?? 0)).toBeGreaterThanOrEqual(2 - 1e-9)
      expect(l.lines[i].x + (q.right ?? q.width)).toBeLessThanOrEqual(l.width - 2 + 1e-9)
    })
  })
  it('без строк — пустая коробка', () => {
    expect(layoutLines([], { lineHeight: 10, pad: 2, align: 'left' })).toEqual({ width: 0, height: 0, lines: [] })
  })
})

describe('rasterizeText', () => {
  it('кегль подбирается по высоте заглавных: размер 8 мм → заглавные 8·12 px', async () => {
    const { deps, calls } = fake({ capRatio: 0.7 })
    await rasterizeText(T({ size: 8 }), deps)
    // кегль = 8 мм · 12 px/мм / 0.7
    const px = (8 * TEXT_PX_PER_MM) / 0.7
    expect(calls.fonts.some((f) => f.includes(`${px}px`))).toBe(true)
    expect(calls.fonts.some((f) => f.includes('100px'))).toBe(true) // замер «H»
  })
  it('шрифт готовится до рисования, с содержимым надписи; в CSS-записи семейство, вес и курсив', async () => {
    const { deps, calls } = fake()
    await rasterizeText(T({ content: 'Анна', font: { id: 'lobster', bold: true, italic: true } }), deps)
    expect(deps.loadFont).toHaveBeenCalledWith({ id: 'lobster', bold: true, italic: true }, 'Анна')
    expect(calls.fonts.at(-1)).toMatch(/^italic 700 [\d.]+px "Lobster", sans-serif$/)
  })
  it('маска — альфа-канал canvas, размер коробки в пикселях, 12 px/мм', async () => {
    const { deps, calls } = fake()
    const r = (await rasterizeText(T(), deps))!
    expect(r.raster.pxPerMm).toBe(12)
    expect(r.raster.mask).toHaveLength(r.raster.width * r.raster.height)
    expect(calls.sizes.at(-1)).toEqual([r.raster.width, r.raster.height])
    expect(Array.from(r.raster.mask.slice(0, 4))).toEqual([0, 255, 0, 255])
    expect(r.fontLost).toBe(false)
  })
  it('несколько строк: каждая рисуется на своей базовой линии, шаг растёт с межстрочным множителем', async () => {
    const a = fake(), b = fake()
    await rasterizeText(T({ content: 'AB\nCD', lineSpacing: 1 }), a.deps)
    await rasterizeText(T({ content: 'AB\nCD', lineSpacing: 2 }), b.deps)
    expect(a.calls.fillText.map((c) => c[0])).toEqual(['AB', 'CD'])
    const step1 = a.calls.fillText[1][2] - a.calls.fillText[0][2], step2 = b.calls.fillText[1][2] - b.calls.fillText[0][2]
    expect(step2).toBeCloseTo(step1 * 2, 6)
    const rA = (await rasterizeText(T({ content: 'AB\nCD' }), fake().deps))!, rB = (await rasterizeText(T({ content: 'AB' }), fake().deps))!
    expect(rA.raster.height).toBeGreaterThan(rB.raster.height)
    expect(rA.raster.width).toBe(rB.raster.width)
  })
  it('выравнивание: короткая строка смещается к центру или к правому краю', async () => {
    const x = async (align: 'left' | 'center' | 'right') => { const f = fake(); await rasterizeText(T({ content: 'ABCDEFGH\nAB', align }), f.deps); return f.calls.fillText[1][1] }
    expect(await x('left')).toBeLessThan(await x('center'))
    expect(await x('center')).toBeLessThan(await x('right'))
  })
  it('добавка между буквами: встроенный letterSpacing или рисование по символам', async () => {
    const native = fake({ native: true })
    await rasterizeText(T({ letterSpacing: 1, content: 'AB' }), native.deps)
    expect(native.calls.fillText.map((c) => c[0])).toEqual(['AB'])
    const manual = fake({ native: false })
    await rasterizeText(T({ letterSpacing: 1, content: 'AB' }), manual.deps)
    expect(manual.calls.fillText.map((c) => c[0])).toEqual(['A', 'B'])
    expect(manual.calls.fillText[1][1]).toBeGreaterThan(manual.calls.fillText[0][1])
  })
  it('шире растр при большей добавке', async () => {
    const w = async (ls: number) => (await rasterizeText(T({ letterSpacing: ls, content: 'ABCD' }), fake().deps))!.raster.width
    expect(await w(2)).toBeGreaterThan(await w(0))
  })
  it('пустая надпись или нулевой размер — null, шрифт не готовится', async () => {
    const f = fake()
    expect(await rasterizeText(T({ content: '  \n ' }), f.deps)).toBeNull()
    expect(await rasterizeText(T({ size: 0 }), f.deps)).toBeNull()
    expect(f.deps.loadFont).not.toHaveBeenCalled()
  })
  it('потерянный пользовательский шрифт: fontLost, надпись всё равно рисуется', async () => {
    const f = fake()
    f.deps.loadFont = vi.fn(async () => false)
    const r = (await rasterizeText(T({ font: { id: 'user:x', bold: false, italic: false } }), f.deps))!
    expect(r.fontLost).toBe(true)
    expect(r.raster.mask.length).toBeGreaterThan(0)
  })
  it('очень длинная надпись уменьшает разрешение, а не размер холста', async () => {
    const f = fake()
    const r = (await rasterizeText(T({ size: 40, content: 'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW' }), f.deps))!
    expect(Math.max(r.raster.width, r.raster.height)).toBeLessThanOrEqual(MAX_RASTER_SIDE)
    expect(r.raster.pxPerMm).toBeLessThan(12)
  })
  it('левый свес шрифта (actualBoundingBoxLeft) попадает в раскладку: начало строки сдвинуто, коробка шире', async () => {
    const plain = fake(), over = fake()
    const orig = over.deps.createCanvas
    over.deps.createCanvas = (w, h) => {
      const c = orig(w, h), ctx = c.getContext('2d')!
      const m = ctx.measureText.bind(ctx)
      return { width: c.width, height: c.height, getContext: () => Object.assign(ctx, { measureText: (s: string) => ({ ...m(s), actualBoundingBoxLeft: 9, actualBoundingBoxRight: m(s).width + 5 }) }) }
    }
    const a = (await rasterizeText(T({ content: 'яXXXX', align: 'left' }), plain.deps))!, b = (await rasterizeText(T({ content: 'яXXXX', align: 'left' }), over.deps))!
    expect(b.raster.width).toBeGreaterThan(a.raster.width + 8)
    expect(over.calls.fillText[0][1]).toBeGreaterThan(plain.calls.fillText[0][1] + 8)
  })
  it('нет 2D-контекста — null', async () => {
    const deps: RasterDeps = { createCanvas: (w, h) => ({ width: w, height: h, getContext: () => null }), loadFont: async () => true }
    expect(await rasterizeText(T(), deps)).toBeNull()
  })
})
