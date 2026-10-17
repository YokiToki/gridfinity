import type { GrayImage } from '../../../geometry/raster/threshold'

/** Размер, до которого уменьшается показываемый снимок (по длинной стороне): холст не должен нести 4096 × 4096 пикселей. */
export const DISPLAY_MAX = 1400

/** Рисует яркость на холсте (при необходимости уменьшая выборкой по ближайшему). Без 2D-контекста (тесты) молча ничего не делает. */
export function drawGray(canvas: HTMLCanvasElement | null, img: GrayImage, maxSide = DISPLAY_MAX, tint?: (x: number, y: number, v: number) => [number, number, number]) {
  if (!canvas) return
  const k = Math.min(1, maxSide / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k))
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const out = ctx.createImageData(w, h)
  if (!tint) {
    // быстрый путь без подкраски (превью при перетаскивании углов): одно 32-битное слово на пиксель
    const px = new Uint32Array(out.data.buffer)
    for (let j = 0; j < h; j++) {
      const row = Math.min(img.height - 1, Math.floor(j / k)) * img.width
      for (let i = 0; i < w; i++) {
        const v = img.gray[row + Math.min(img.width - 1, Math.floor(i / k))]
        px[j * w + i] = 0xff000000 | (v << 16) | (v << 8) | v
      }
    }
    ctx.putImageData(out, 0, 0)
    return
  }
  for (let j = 0; j < h; j++) {
    const sy = Math.min(img.height - 1, Math.floor(j / k))
    for (let i = 0; i < w; i++) {
      const sx = Math.min(img.width - 1, Math.floor(i / k))
      const v = img.gray[sy * img.width + sx]
      const [r, g, b] = tint(sx, sy, v)
      const o = (j * w + i) * 4
      out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = b; out.data[o + 3] = 255
    }
  }
  ctx.putImageData(out, 0, 0)
}

/** Рисует цветной снимок на холсте (с уменьшением до maxSide выборкой по ближайшему). Без 2D-контекста молча ничего не делает. */
export function drawColor(canvas: HTMLCanvasElement | null, img: { width: number; height: number; rgb: Uint8Array }, maxSide = DISPLAY_MAX) {
  if (!canvas) return
  const k = Math.min(1, maxSide / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k))
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const out = ctx.createImageData(w, h)
  const px = new Uint32Array(out.data.buffer)
  for (let j = 0; j < h; j++) {
    const row = Math.min(img.height - 1, Math.floor(j / k)) * img.width
    for (let i = 0; i < w; i++) {
      const s = (row + Math.min(img.width - 1, Math.floor(i / k))) * 3
      px[j * w + i] = 0xff000000 | (img.rgb[s + 2] << 16) | (img.rgb[s + 1] << 8) | img.rgb[s]
    }
  }
  ctx.putImageData(out, 0, 0)
}
