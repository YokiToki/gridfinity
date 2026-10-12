import { MAX_TEXT_CHARS, MAX_TEXT_LINES, TEXT_PX_PER_MM, type TextAlign, type TextParams, type TextRaster } from '../../geometry/text'
import { ensureFont, fontShorthand } from './fonts'
import type { FontStore } from './fontStore'

// ---------- чистая раскладка ----------

/** Строки надписи: перевод строки разделяет, пустые края обрезаются, число строк и символов ограничено. */
export function splitLines(content: string): string[] {
  const lines = content.replace(/\r\n?/g, '\n').slice(0, MAX_TEXT_CHARS).split('\n').slice(0, MAX_TEXT_LINES)
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
  while (lines.length && lines[0].trim() === '') lines.shift()
  return lines
}

export interface LineMetrics { width: number; ascent: number; descent: number }
export interface Layout {
  /** Размер коробки растра, пиксели. */
  width: number
  height: number
  /** Начало каждой строки (левый край текста) и её базовая линия в коробке. */
  lines: { x: number; baseline: number }[]
}

/**
 * Раскладка строк в коробку: ширина — самая длинная строка, высота — от верха самой высокой строки до низа самой низкой
 * (с учётом выносных элементов), выравнивание по левому краю, центру или правому краю, межстрочный шаг lineHeight.
 */
export function layoutLines(metrics: LineMetrics[], o: { lineHeight: number; pad: number; align: TextAlign }): Layout {
  const n = metrics.length
  if (n === 0) return { width: 0, height: 0, lines: [] }
  const content = Math.max(...metrics.map((m) => m.width))
  const ascent = Math.max(...metrics.map((m) => m.ascent)), descent = Math.max(...metrics.map((m) => m.descent))
  const width = Math.ceil(content + 2 * o.pad), height = Math.ceil((n - 1) * o.lineHeight + ascent + descent + 2 * o.pad)
  const lines = metrics.map((m, i) => ({
    x: o.align === 'left' ? o.pad : o.align === 'right' ? width - o.pad - m.width : (width - m.width) / 2,
    baseline: o.pad + ascent + i * o.lineHeight,
  }))
  return { width, height, lines }
}

// ---------- canvas ----------

export interface Ctx2D {
  font: string
  letterSpacing?: string
  textBaseline: string
  textAlign: string
  fillStyle: string
  measureText(s: string): { width: number; actualBoundingBoxAscent: number; actualBoundingBoxDescent: number }
  fillText(s: string, x: number, y: number): void
  getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray | number[] }
}
export interface CanvasLike { width: number; height: number; getContext(kind: '2d'): Ctx2D | null }
export interface RasterDeps {
  createCanvas(w: number, h: number): CanvasLike
  /** Готовит шрифт (регистрирует и загружает нужные символы); false — пользовательский шрифт потерян. */
  loadFont(font: TextParams['font'], content: string): Promise<boolean>
}

/** Размер растра не больше стороны в пикселях: длинные надписи уменьшают разрешение, а не память. */
export const MAX_RASTER_SIDE = 4096
const PAD = 2

const domCanvas = (w: number, h: number): CanvasLike => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h) as unknown as CanvasLike
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c as unknown as CanvasLike
}
export const domDeps = (store?: FontStore | null): RasterDeps => ({ createCanvas: domCanvas, loadFont: (f, text) => ensureFont(f, text, store) })

export interface RasterResult { raster: TextRaster; fontLost: boolean }

/** Ширина строки с учётом добавки между буквами: встроенный letterSpacing canvas, иначе по символам. */
function lineMetrics(ctx: Ctx2D, s: string, spacingPx: number, native: boolean): LineMetrics {
  if (native || spacingPx === 0) {
    const m = ctx.measureText(s)
    return { width: m.width, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent }
  }
  let width = 0, ascent = 0, descent = 0
  for (const ch of s) {
    const m = ctx.measureText(ch)
    width += m.width + spacingPx
    ascent = Math.max(ascent, m.actualBoundingBoxAscent); descent = Math.max(descent, m.actualBoundingBoxDescent)
  }
  return { width: Math.max(0, width - spacingPx), ascent, descent }
}

/**
 * Рисует надпись шрифтом и возвращает альфа-маску на 12 px/мм (меньше, если коробка больше MAX_RASTER_SIDE). Размер — высота
 * заглавных букв: пиксельный кегль подбирается по измеренной высоте «H». Положение и поворот сюда не входят.
 */
export async function rasterizeText(t: TextParams, deps: RasterDeps = domDeps()): Promise<RasterResult | null> {
  const lines = splitLines(t.content)
  if (!lines.length || !(t.size > 0)) return null
  const fontOk = await deps.loadFont(t.font, lines.join('\n'))
  let pxPerMm = TEXT_PX_PER_MM
  for (let attempt = 0; attempt < 3; attempt++) {
    const probe = deps.createCanvas(8, 8).getContext('2d')
    if (!probe) return null
    probe.textBaseline = 'alphabetic'
    // кегль по высоте заглавных: измеряем «H» на 100 px
    probe.font = fontShorthand(t.font, 100)
    const capRatio = probe.measureText('H').actualBoundingBoxAscent / 100 || 0.7
    const fontPx = (t.size * pxPerMm) / capRatio
    const spacingPx = t.letterSpacing * pxPerMm
    probe.font = fontShorthand(t.font, fontPx)
    const native = 'letterSpacing' in probe
    if (native) probe.letterSpacing = `${spacingPx}px`
    const metrics = lines.map((s) => lineMetrics(probe, s, spacingPx, native))
    const layout = layoutLines(metrics, { lineHeight: fontPx * 1.2 * t.lineSpacing, pad: PAD, align: t.align })
    const side = Math.max(layout.width, layout.height)
    if (side > MAX_RASTER_SIDE && attempt < 2) { pxPerMm *= (MAX_RASTER_SIDE - 2 * PAD) / side; continue }
    const w = Math.max(1, Math.min(MAX_RASTER_SIDE, layout.width)), h = Math.max(1, Math.min(MAX_RASTER_SIDE, layout.height))
    const canvas = deps.createCanvas(w, h)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillStyle = '#000'
    ctx.font = fontShorthand(t.font, fontPx)
    if (native) ctx.letterSpacing = `${spacingPx}px`
    lines.forEach((s, i) => {
      const { x, baseline } = layout.lines[i]
      if (native || spacingPx === 0) ctx.fillText(s, x, baseline)
      else { let cx = x; for (const ch of s) { ctx.fillText(ch, cx, baseline); cx += ctx.measureText(ch).width + spacingPx } }
    })
    const data = ctx.getImageData(0, 0, w, h).data
    const mask = new Uint8Array(w * h)
    for (let k = 0; k < mask.length; k++) mask[k] = data[k * 4 + 3]
    return { raster: { mask, width: w, height: h, pxPerMm }, fontLost: !fontOk }
  }
  return null
}
