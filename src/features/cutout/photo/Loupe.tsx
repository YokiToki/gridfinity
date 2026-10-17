import { useEffect, useRef } from 'react'
import type { ColorImage } from '../../keychain/decodeImage'
import type { Pt } from '../../../geometry/photo/homography'

export const LOUPE_SIZE = 120
export const LOUPE_ZOOM = 4

/**
 * Лупа: окружность LOUPE_SIZE пикселей с увеличением LOUPE_ZOOM вокруг угла листа. Берёт пиксели снимка в полном разрешении
 * (не со сжатого холста), рисует перекрестие в углу и стороны листа. Без 2D-контекста (тесты) ничего не рисует.
 */
export function Loupe({ image, center, corners, place, style }: { image: ColorImage; center: Pt; corners: Pt[]; /** Угол видимой части редактора, где стоит лупа. */ place: string; /** Положение на экране (fixed): left и top в пикселях. */ style: { left: number; top: number } }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const buffer = useRef<ImageData | null>(null)
  useEffect(() => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    // буфер переиспользуется между кадрами; пиксель пишется одним 32-битным словом (порядок байт little-endian: A B G R)
    const out = buffer.current ?? (buffer.current = ctx.createImageData(LOUPE_SIZE, LOUPE_SIZE))
    const px = new Uint32Array(out.data.buffer)
    const half = LOUPE_SIZE / 2, w = image.width, h = image.height, rgb = image.rgb
    const x0 = Math.round(center[0]), y0 = Math.round(center[1])
    const OUT = 0xff1a1614
    for (let j = 0; j < LOUPE_SIZE; j++) {
      const sy = y0 + Math.round((j - half) / LOUPE_ZOOM)
      const row = j * LOUPE_SIZE
      if (sy < 0 || sy >= h) { px.fill(OUT, row, row + LOUPE_SIZE); continue }
      for (let i = 0; i < LOUPE_SIZE; i++) {
        const sx = x0 + Math.round((i - half) / LOUPE_ZOOM)
        if (sx < 0 || sx >= w) { px[row + i] = OUT; continue }
        const s = (sy * w + sx) * 3
        px[row + i] = 0xff000000 | (rgb[s + 2] << 16) | (rgb[s + 1] << 8) | rgb[s]
      }
    }
    ctx.putImageData(out, 0, 0)
    // стороны листа в координатах лупы и перекрестие в углу
    ctx.strokeStyle = 'rgba(124,156,255,0.9)'; ctx.lineWidth = 1.5
    ctx.beginPath()
    corners.forEach(([x, y], i) => { const px = half + (x - center[0]) * LOUPE_ZOOM, py = half + (y - center[1]) * LOUPE_ZOOM; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) })
    ctx.closePath(); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(half - 12, half); ctx.lineTo(half + 12, half); ctx.moveTo(half, half - 12); ctx.lineTo(half, half + 12); ctx.stroke()
  }, [image, center, corners])
  return (
    <canvas ref={canvas} data-testid="loupe" data-place={place} aria-hidden width={LOUPE_SIZE} height={LOUPE_SIZE}
      className="pointer-events-none fixed z-[60] rounded-full border-2 border-accent bg-bg shadow-float" style={{ width: LOUPE_SIZE, height: LOUPE_SIZE, left: style.left, top: style.top }} />
  )
}
