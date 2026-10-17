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
    const tint = segmentation
      ? (x: number, y: number, v: number): [number, number, number] => {
          const id = segmentation.labels[y * w + x]
          if (!id) return [v, v, v]
          return selected?.includes(id) ? [Math.round(v * 0.4 + 124 * 0.6), Math.round(v * 0.4 + 156 * 0.6), Math.round(v * 0.4 + 255 * 0.6)] : [Math.round(v * 0.5 + 60), Math.round(v * 0.5 + 60), Math.round(v * 0.5 + 60)]
        }
      : undefined
    drawGray(canvas.current, rectified.image, 1400, tint)
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
