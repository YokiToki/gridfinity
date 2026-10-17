import { useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { baseOutline, cutoutBounds, cutoutLayout, type Cutout, type CutoutParams } from '../../geometry/cutout'
import { snapMove } from '../../geometry/cutout-placement'

/**
 * Вид сверху: полость коробки, сетка шага, контуры вырезов. Вырез двигается перетаскиванием с привязкой к центру, сетке,
 * стенкам и краям других вырезов (Alt или переключатель отключают привязку); модель пересчитывается при отпускании.
 * Плоскость: X вправо, Y вверх (front внизу).
 */
export function TopView({ params: p, selectedId, snap, onSelect, onDrag, onCommit }: {
  params: CutoutParams
  selectedId: string | null
  snap: boolean
  onSelect: (id: string) => void
  /** Положение во время перетаскивания (не фиксируется в параметрах). */
  onDrag: (id: string, x: number, y: number) => void
  /** Перетаскивание закончено: итоговое положение. */
  onCommit: (id: string, x: number, y: number) => void
}) {
  const { t } = useTranslation()
  const l = cutoutLayout(p)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; px: number; py: number; x: number; y: number } | null>(null)
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })
  const pad = 6
  const W = l.cavityX, H = l.cavityY

  const toMm = (dx: number, dy: number) => {
    const el = svg.current
    const r = el?.getBoundingClientRect()
    if (!r || !r.width || !r.height) return null
    return { dx: (dx / r.width) * (W + 2 * pad), dy: -(dy / r.height) * (H + 2 * pad) }
  }

  const down = (e: PointerEvent, c: Cutout) => {
    onSelect(c.id)
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    drag.current = { id: c.id, startX: c.x, startY: c.y, px: e.clientX, py: e.clientY, x: c.x, y: c.y }
  }
  const move = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const delta = toMm(e.clientX - d.px, e.clientY - d.py)
    if (!delta) return
    const cur = p.cutouts.find((c) => c.id === d.id)
    if (!cur) return
    const proposed = { ...cur, x: d.startX + delta.dx, y: d.startY + delta.dy }
    const r = snapMove(proposed, p.cutouts.filter((c) => c.visible && c.id !== d.id), { x: W, y: H }, p.pitch, 1.5, snap && !e.altKey)
    d.x = r.x; d.y = r.y
    setGuides({ x: r.guideX, y: r.guideY })
    onDrag(d.id, r.x, r.y)
  }
  const up = () => {
    const d = drag.current
    drag.current = null
    setGuides({ x: null, y: null })
    if (d) onCommit(d.id, d.x, d.y)
  }

  // линии сетки: границы ячеек от центра полости (шаг pitch)
  const gridX: number[] = [], gridY: number[] = []
  for (let k = 1; k * p.pitch < W; k++) gridX.push(...(k * p.pitch < W / 2 ? [k * p.pitch, -k * p.pitch] : []))
  for (let k = 1; k * p.pitch < H; k++) gridY.push(...(k * p.pitch < H / 2 ? [k * p.pitch, -k * p.pitch] : []))

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-text-subtle">{t('cutout.view.hint')}</span>
      <svg ref={svg} role="group" aria-label={t('cutout.view.label')} data-testid="top-view" viewBox={`${-W / 2 - pad} ${-H / 2 - pad} ${W + 2 * pad} ${H + 2 * pad}`}
        className="w-full touch-none select-none rounded-control border border-border-strong bg-bg" onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
        <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={2.8} fill="var(--color-surface-1)" stroke="var(--color-border-strong)" strokeWidth={0.5} />
        {gridX.map((x) => <line key={`gx${x}`} x1={x} y1={-H / 2} x2={x} y2={H / 2} stroke="var(--color-border)" strokeWidth={0.3} />)}
        {gridY.map((y) => <line key={`gy${y}`} x1={-W / 2} y1={-y} x2={W / 2} y2={-y} stroke="var(--color-border)" strokeWidth={0.3} />)}
        <line x1={0} y1={-H / 2} x2={0} y2={H / 2} stroke="var(--color-border-strong)" strokeWidth={0.3} strokeDasharray="2 2" />
        <line x1={-W / 2} y1={0} x2={W / 2} y2={0} stroke="var(--color-border-strong)" strokeWidth={0.3} strokeDasharray="2 2" />
        {p.cutouts.filter((c) => c.visible).map((c) => {
          const sel = c.id === selectedId
          const common = { fill: sel ? 'var(--color-accent)' : 'var(--color-surface-3)', fillOpacity: sel ? 0.45 : 0.9, stroke: sel ? 'var(--color-accent)' : 'var(--color-text-subtle)', strokeWidth: sel ? 0.8 : 0.5, className: 'cursor-move' }
          const transform = `translate(${c.x} ${-c.y}) rotate(${-c.rotation})`
          if (c.source.kind === 'circle') {
            return <circle key={c.id} data-testid="cutout-shape" data-id={c.id} role="button" aria-label={c.name} transform={transform} r={c.source.diameter / 2 + c.clearance}
              {...common} onPointerDown={(e) => down(e, c)} />
          }
          return c.source.kind === 'rect'
            ? <rect key={c.id} data-testid="cutout-shape" data-id={c.id} role="button" aria-label={c.name} transform={transform} x={-(c.source.width + 2 * c.clearance) / 2} y={-(c.source.length + 2 * c.clearance) / 2}
                width={c.source.width + 2 * c.clearance} height={c.source.length + 2 * c.clearance} rx={c.source.radius + c.clearance} {...common} onPointerDown={(e) => down(e, c)} />
            : <polygon key={c.id} data-testid="cutout-shape" data-id={c.id} role="button" aria-label={c.name} transform={transform} points={baseOutline(c).map(([x, y]) => `${x},${-y}`).join(' ')} strokeLinejoin="round" {...common} onPointerDown={(e) => down(e, c)} />
        })}
        {guides.x !== null && <line data-testid="guide-x" x1={guides.x} y1={-H / 2} x2={guides.x} y2={H / 2} stroke="var(--color-warn)" strokeWidth={0.5} />}
        {guides.y !== null && <line data-testid="guide-y" x1={-W / 2} y1={-guides.y} x2={W / 2} y2={-guides.y} stroke="var(--color-warn)" strokeWidth={0.5} />}
        {selectedId && (() => { const c = p.cutouts.find((x) => x.id === selectedId && x.visible); if (!c) return null; const b = cutoutBounds(c); return <rect x={b.minX} y={-b.maxY} width={b.maxX - b.minX} height={b.maxY - b.minY} fill="none" stroke="var(--color-accent)" strokeWidth={0.3} strokeDasharray="1.5 1.5" pointerEvents="none" /> })()}
      </svg>
    </div>
  )
}
