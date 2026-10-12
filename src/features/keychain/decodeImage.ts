import type { GrayImage } from '../../geometry/raster/threshold'

export type ImageErrorCode = 'unsupported' | 'decode' | 'empty'
export class ImageError extends Error {
  constructor(public code: ImageErrorCode, message: string) { super(message) }
}

/** Рабочий предел длинной стороны, пиксели: больше — уменьшаем перед обработкой. */
export const MAX_SIDE = 4096
/** Целевая длинная сторона для векторной картинки (SVG), пиксели. */
export const SVG_SIDE = 1024

export interface DecodedImage {
  image: GrayImage
  /** Исходные размеры файла. */
  original: { width: number; height: number }
  /** Картинка уменьшена до предела. */
  downscaled: boolean
}

/** Источник пикселей: исходные размеры и RGBA нужного размера (в браузере — через canvas, в тестах подменяется). */
export interface RasterSource { width: number; height: number; rgba(width: number, height: number): Uint8ClampedArray }
export interface DecodeBackend { load(file: Blob, svg: boolean): Promise<RasterSource> }

const RASTER = /^image\/(png|jpeg|webp)$/
const isSvg = (f: Blob & { name?: string }) => f.type === 'image/svg+xml' || (!f.type && /\.svg$/i.test(f.name ?? ''))

/** RGBA → яркость (Rec. 601) и прозрачность. Прозрачность не отдаётся, если все пиксели непрозрачны. */
export function toGrayImage(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const n = width * height
  const gray = new Uint8Array(n), alpha = new Uint8Array(n)
  let any = false
  for (let i = 0; i < n; i++) {
    const a = rgba[i * 4 + 3]
    gray[i] = Math.round(0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2])
    alpha[i] = a
    if (a < 250) any = true
  }
  return { width, height, gray, alpha: any ? alpha : null }
}

/**
 * Файл → изображение для обработки. Растровые (PNG, JPEG, WebP) и SVG; локально, ничего не отправляется.
 * Неподдерживаемый тип и недекодируемый файл дают ImageError; слишком большая картинка уменьшается до MAX_SIDE.
 */
export async function decodeImage(file: Blob & { name?: string }, backend: DecodeBackend = browserBackend): Promise<DecodedImage> {
  const svg = isSvg(file)
  if (!svg && !RASTER.test(file.type)) throw new ImageError('unsupported', `Unsupported image type: ${file.type || 'unknown'}`)
  let src: RasterSource
  try { src = await backend.load(file, svg) } catch (e) { throw new ImageError('decode', e instanceof Error ? e.message : String(e)) }
  if (!(src.width > 0 && src.height > 0)) throw new ImageError('empty', 'The image has no pixels')
  const target = svg ? SVG_SIDE : MAX_SIDE
  const long = Math.max(src.width, src.height)
  // SVG растеризуется до рабочего размера; растровый уменьшается только при превышении предела
  const k = svg ? target / long : Math.min(1, target / long)
  const width = Math.max(1, Math.round(src.width * k)), height = Math.max(1, Math.round(src.height * k))
  const rgba = src.rgba(width, height)
  return { image: toGrayImage(rgba, width, height), original: { width: src.width, height: src.height }, downscaled: !svg && k < 1 }
}

// ---------- браузерная реализация ----------

function makeCanvas(w: number, h: number): { ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h })
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D is not available')
  return { ctx: ctx as CanvasRenderingContext2D }
}

export const browserBackend: DecodeBackend = {
  async load(file, svg) {
    let drawable: CanvasImageSource & { width: number; height: number }
    let release = () => {}
    if (svg) {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.src = url
      await img.decode()
      drawable = Object.assign(img, { width: img.naturalWidth || 300, height: img.naturalHeight || 150 }) as unknown as typeof drawable
      release = () => URL.revokeObjectURL(url)
    } else {
      const bmp = await createImageBitmap(file)
      drawable = bmp
      release = () => bmp.close()
    }
    const width = drawable.width, height = drawable.height
    return {
      width, height,
      rgba(w, h) {
        try {
          const { ctx } = makeCanvas(w, h)
          ctx.drawImage(drawable, 0, 0, w, h)
          return ctx.getImageData(0, 0, w, h).data
        } finally { release() }
      },
    }
  },
}
