import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Pt } from '../../../geometry/photo/homography'
import type { GrayImage } from '../../../geometry/raster/threshold'
import { drawGray } from './drawGray'

const CORNER_KEYS = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const

/**
 * Снимок с четырьмя перетаскиваемыми углами листа. Углы хранятся в пикселях снимка; перетаскивание мышью или пальцем,
 * стрелки двигают выбранный угол на 1 пиксель (Shift — на 10). Порядок: левый верхний, правый верхний, правый нижний, левый нижний.
 */
export function CornerEditor({ image, corners, onChange }: { image: GrayImage; corners: Pt[]; onChange: (c: Pt[]) => void }) {
  const { t } = useTranslation()
  const canvas = useRef<HTMLCanvasElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const W = image.width, H = image.height
  const r = Math.max(W, H) / 70 // радиус метки в пикселях снимка: одинаков на экране при любом размере снимка

  useEffect(() => { drawGray(canvas.current, image) }, [image])

  const move = (i: number, p: Pt) => onChange(corners.map((c, k) => (k === i ? [Math.min(W, Math.max(0, p[0])), Math.min(H, Math.max(0, p[1]))] as Pt : c)))
  const toPhoto = (e: { clientX: number; clientY: number }): Pt => {
    const b = svg.current!.getBoundingClientRect()
    return [((e.clientX - b.left) / b.width) * W, ((e.clientY - b.top) / b.height) * H]
  }
  const onMove = (e: PointerEvent<SVGSVGElement>) => { if (drag !== null) move(drag, toPhoto(e)) }
  const onKey = (i: number) => (e: KeyboardEvent) => {
    const d = e.shiftKey ? 10 : 1
    const delta: Record<string, Pt> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }
    const dv = delta[e.key]
    if (!dv) return
    e.preventDefault()
    move(i, [corners[i][0] + dv[0], corners[i][1] + dv[1]])
  }

  return (
    <div className="relative w-full select-none overflow-hidden rounded-card border border-border bg-bg" style={{ aspectRatio: `${W} / ${H}` }}>
      <canvas ref={canvas} data-testid="photo-canvas" aria-hidden className="absolute inset-0 h-full w-full" />
      <svg ref={svg} data-testid="corner-svg" viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full touch-none" onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
        {corners.length === 4 && <polygon points={corners.map((c) => c.join(',')).join(' ')} fill="var(--color-accent)" fillOpacity={0.12} stroke="var(--color-accent)" strokeWidth={r / 6} pointerEvents="none" />}
        {corners.map(([x, y], i) => (
          <g key={i} role="button" tabIndex={0} data-testid={`corner-${i + 1}`} data-x={x} data-y={y}
            aria-label={t('cutout.photo.corner', { n: i + 1, where: t(`cutout.photo.where.${CORNER_KEYS[i]}`) })}
            className="cursor-grab outline-none focus-visible:[&>circle]:stroke-white"
            onPointerDown={(e) => { e.preventDefault(); try { (e.currentTarget as unknown as Element).setPointerCapture?.(e.pointerId) } catch { /* без захвата тоже работает */ } setDrag(i) }}
            onKeyDown={onKey(i)}>
            <circle cx={x} cy={y} r={r} fill="var(--color-accent)" fillOpacity={0.85} stroke="var(--color-accent-on)" strokeWidth={r / 6} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={r * 1.1} fontWeight={700} fill="var(--color-accent-on)" pointerEvents="none">{i + 1}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
