import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Pt } from '../../../geometry/photo/homography'
import type { ColorImage } from '../../keychain/decodeImage'
import { dragCorner, intersect, pickCorner, placeLoupe, RING_PX } from './cornerGrab'
import { drawColor } from './drawGray'
import { Loupe, LOUPE_SIZE } from './Loupe'

const CORNER_KEYS = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const

/**
 * Снимок с четырьмя углами листа. Углы — большие прозрачные кольца (угол остаётся виден). Захват не за кольцо, а за область
 * рядом с углом внутри листа; угол смещается на столько же, на сколько указатель, поэтому палец его не закрывает. Пока угол
 * двигают, лупа показывает его окрестность в полном разрешении в самом далёком углу редактора. Стрелки двигают выбранный угол
 * на 1 пиксель снимка (Shift — на 10) и тоже включают лупу. Порядок: левый верхний, правый верхний, правый нижний, левый нижний.
 */
export function CornerEditor({ image, corners, onChange }: { image: ColorImage; corners: Pt[]; onChange: (c: Pt[]) => void }) {
  const { t } = useTranslation()
  const canvas = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const grab = useRef<{ i: number; start: Pt; origin: Pt; base: Pt[] } | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const [cw, setCw] = useState(400) // ширина редактора на экране, пикселей
  const [loupe, setLoupe] = useState<{ place: 'tl' | 'tr' | 'bl' | 'br'; left: number; top: number } | null>(null)
  const W = image.width, H = image.height
  const px = W / Math.max(1, cw) // экранный пиксель в координатах снимка
  const r = RING_PX * px

  useEffect(() => { drawColor(canvas.current, image) }, [image])
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const measure = () => { const b = el.getBoundingClientRect(); if (b.width > 0) setCw(b.width) }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const toPhoto = (e: { clientX: number; clientY: number }): Pt => {
    const b = svg.current!.getBoundingClientRect()
    return [((e.clientX - b.left) / b.width) * W, ((e.clientY - b.top) / b.height) * H]
  }
  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    const p = toPhoto(e)
    const b = svg.current!.getBoundingClientRect()
    const i = pickCorner(p, corners, W / Math.max(1, b.width))
    if (i === null) return
    e.preventDefault()
    try { svg.current?.setPointerCapture?.(e.pointerId) } catch { /* без захвата тоже работает */ }
    grab.current = { i, start: p, origin: corners[i], base: corners }
    setActive(i)
  }
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const g = grab.current
    if (!g) return
    const p = toPhoto(e)
    onChange(dragCorner(corners, g.i, g.origin, [p[0] - g.start[0], p[1] - g.start[1]], W, H))
  }
  const end = () => { grab.current = null; setActive(null) }
  const onKey = (i: number) => (e: KeyboardEvent) => {
    const d = e.shiftKey ? 10 : 1
    const delta: Record<string, Pt> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }
    const dv = delta[e.key]
    if (!dv) return
    e.preventDefault()
    onChange(corners.map((c, k) => (k === i ? ([Math.min(W, Math.max(0, c[0] + dv[0])), Math.min(H, Math.max(0, c[1] + dv[1]))] as Pt) : c)))
  }

  const showFor = active ?? focused
  // положение лупы: в видимой части редактора (с учётом прокрутки диалога), в самом далёком углу от активного угла
  useLayoutEffect(() => {
    if (showFor === null || !svg.current) { setLoupe(null); return }
    const b = svg.current.getBoundingClientRect()
    const scroller = svg.current.closest('[data-photo-scroll]')?.getBoundingClientRect()
    const view: { l: number; t: number; r: number; b: number } = scroller ? { l: scroller.left, t: scroller.top, r: scroller.right, b: scroller.bottom } : { l: 0, t: 0, r: window.innerWidth || b.right, b: window.innerHeight || b.bottom }
    const vis = intersect({ l: b.left, t: b.top, r: b.right, b: b.bottom }, view) ?? { l: b.left, t: b.top, r: b.right, b: b.bottom }
    const [x, y] = corners[showFor]
    setLoupe(placeLoupe([b.left + (x / W) * b.width, b.top + (y / H) * b.height], vis, LOUPE_SIZE))
  }, [showFor, corners, W, H])
  return (
    <div ref={box} className="relative w-full select-none overflow-hidden rounded-card border border-border bg-bg" style={{ aspectRatio: `${W} / ${H}` }}>
      <canvas ref={canvas} data-testid="photo-canvas" aria-hidden className="absolute inset-0 h-full w-full" />
      <svg ref={svg} data-testid="corner-svg" viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full touch-none cursor-crosshair" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={end} onPointerCancel={end}>
        {corners.length === 4 && <polygon points={corners.map((c) => c.join(',')).join(' ')} fill="none" stroke="var(--color-accent)" strokeWidth={2 * px} strokeLinejoin="round" pointerEvents="none" />}
        {corners.map(([x, y], i) => (
          <g key={i} role="button" tabIndex={0} data-testid={`corner-${i + 1}`} data-x={x} data-y={y} data-active={active === i || undefined}
            aria-label={t('cutout.photo.corner', { n: i + 1, where: t(`cutout.photo.where.${CORNER_KEYS[i]}`) })}
            className="outline-none" onKeyDown={onKey(i)} onFocus={() => setFocused(i)} onBlur={() => setFocused((f) => (f === i ? null : f))}>
            <circle cx={x} cy={y} r={active === i ? r * 1.15 : r} fill="none" stroke="var(--color-accent)" strokeOpacity={0.95} strokeWidth={2.5 * px} pointerEvents="none" />
            <circle cx={x} cy={y} r={2 * px} fill="var(--color-accent)" pointerEvents="none" />
          </g>
        ))}
      </svg>
      {loupe && showFor !== null && <Loupe image={image} center={corners[showFor]} corners={corners} place={loupe.place} style={{ left: loupe.left, top: loupe.top }} />}
    </div>
  )
}
