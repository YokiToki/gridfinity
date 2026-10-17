import { useEffect, useRef, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Rectified } from '../../../geometry/photo/homography'
import type { Segmentation } from '../../../geometry/photo/segment'
import { drawGray } from './drawGray'

/**
 * Выпрямленный лист. С силуэтами: выбранные подкрашены акцентным цветом, снятые с выбора — серым; щелчок по силуэту
 * переключает его. Без силуэтов — просто превью выравнивания. Размер холста не больше растра листа.
 */
export function RectifiedView({ rectified, segmentation, selected, onToggle }: { rectified: Rectified; segmentation?: Segmentation | null; selected?: number[]; onToggle?: (id: number) => void }) {
  const { t } = useTranslation()
  const canvas = useRef<HTMLCanvasElement>(null)
  const { width: w, height: h } = rectified.image

  useEffect(() => {
    // цвет, если он есть (так лист выглядит как на фото), иначе яркость; силуэты подкрашиваются: выбранные акцентом, снятые серым
    const labels = segmentation?.labels
    const tintOf = (x: number, y: number, r: number, g: number, b: number): [number, number, number] => {
      const id = labels ? labels[y * w + x] : 0
      if (!id) return [r, g, b]
      return selected?.includes(id)
        ? [Math.round(r * 0.45 + 124 * 0.55), Math.round(g * 0.45 + 156 * 0.55), Math.round(b * 0.45 + 255 * 0.55)]
        : [Math.round((r + g + b) / 6 + 60), Math.round((r + g + b) / 6 + 60), Math.round((r + g + b) / 6 + 60)]
    }
    const rgb = rectified.rgb
    drawGray(canvas.current, rectified.image, 1400, labels
      ? (x, y, v) => { const k = (y * w + x) * 3; return rgb ? tintOf(x, y, rgb[k], rgb[k + 1], rgb[k + 2]) : tintOf(x, y, v, v, v) }
      : rgb ? (x, y) => { const k = (y * w + x) * 3; return [rgb[k], rgb[k + 1], rgb[k + 2]] } : undefined)
  }, [rectified, segmentation, selected, w])

  const onClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!segmentation || !onToggle) return
    const b = e.currentTarget.getBoundingClientRect()
    const x = Math.floor(((e.clientX - b.left) / b.width) * w), y = Math.floor(((e.clientY - b.top) / b.height) * h)
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const id = segmentation.labels[y * w + x]
    if (id) onToggle(id)
  }

  return (
    <canvas ref={canvas} data-testid="rectified-canvas" role={segmentation ? 'img' : undefined} aria-label={t('cutout.photo.rectifiedLabel')} onClick={onClick}
      className={`block w-full rounded-card border border-border bg-bg ${segmentation && onToggle ? 'cursor-pointer' : ''}`} style={{ aspectRatio: `${w} / ${h}` }} />
  )
}
