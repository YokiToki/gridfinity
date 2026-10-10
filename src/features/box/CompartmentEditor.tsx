import { useRef, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { boxLayout, compartmentSizes, equalDividers, type BoxParams, type Compartments } from '../../geometry/box'
import { formatLength, useUnit } from '../../ui/units'

const MIN_GAP = 4 // минимальный зазор между перегородками (мм), чтобы отсек не схлопнулся
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * 2D-раскладка отсеков (вид сверху). Участок перегородки по клику убирается или возвращается (слияние/разделение отсеков),
 * ручка перегородки двигается перетаскиванием между соседними перегородками. Плоскость: X вправо, Y вверх (front внизу).
 */
export function CompartmentEditor({ params: p, onChange }: { params: BoxParams; onChange: (c: Compartments) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const l = boxLayout(p)
  const c = p.compartments
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ axis: 'x' | 'y'; k: number } | null>(null)
  const W = l.cavityX, H = l.cavityY
  const t_ = p.thickness.innerWall
  const sizes = compartmentSizes(p)

  const edges = (cuts: number[], len: number) => [0, ...cuts.map((f) => f * len), len]
  const xe = edges(c.xDividers, W), ye = edges(c.yDividers, H)
  const toggle = (key: string) => onChange({ ...c, removed: c.removed.includes(key) ? c.removed.filter((k) => k !== key) : [...c.removed, key] })

  const toFraction = (e: PointerEvent, axis: 'x' | 'y') => {
    const el = svg.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return null
    return axis === 'x' ? (e.clientX - r.left) / r.width : 1 - (e.clientY - r.top) / r.height
  }
  const onMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const f = toFraction(e, d.axis)
    if (f === null) return
    const len = d.axis === 'x' ? W : H
    const cuts = d.axis === 'x' ? c.xDividers : c.yDividers
    const lo = (d.k === 0 ? 0 : cuts[d.k - 1]) + (MIN_GAP + t_) / len
    const hi = (d.k === cuts.length - 1 ? 1 : cuts[d.k + 1]) - (MIN_GAP + t_) / len
    const next = cuts.map((v, i) => (i === d.k ? clamp(f, Math.min(lo, hi), Math.max(lo, hi)) : v))
    onChange(d.axis === 'x' ? { ...c, xDividers: next } : { ...c, yDividers: next })
  }
  const stop = () => { drag.current = null }

  const stroke = 'var(--color-accent)'
  const px = (mm: number) => mm // 1 мм = 1 единица viewBox
  const dividerW = Math.max(t_, 1.2)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-text-subtle">{t('box.compartments.hint')}</span>
      <svg ref={svg} role="group" aria-label={t('box.compartments.editor')} data-testid="compartment-svg" viewBox={`-4 -4 ${W + 8} ${H + 8}`}
        className="w-full touch-none rounded-control border border-border-strong bg-bg" onPointerMove={onMove} onPointerUp={stop} onPointerLeave={stop}>
        <rect x={0} y={0} width={W} height={H} rx={3} fill="var(--color-surface-1)" stroke="var(--color-border-strong)" strokeWidth={0.8} />
        {/* вертикальные перегородки (между столбцами), по участкам строк */}
        {c.xDividers.map((f, k) => ye.slice(0, -1).map((_, j) => {
          const key = `x:${k}:${j}`
          const gone = c.removed.includes(key)
          const y0 = H - ye[j + 1], h = ye[j + 1] - ye[j]
          return (
            <rect key={key} data-testid="segment" data-key={key} data-removed={gone || undefined} role="button" tabIndex={0}
              aria-label={t('box.compartments.divider', { axis: 'X', k: k + 1, part: j + 1 })} aria-pressed={!gone}
              x={px(f * W - dividerW / 2)} y={px(y0)} width={dividerW} height={px(h)} fill={gone ? 'transparent' : stroke} fillOpacity={gone ? 0 : 0.85}
              stroke={gone ? 'var(--color-text-subtle)' : 'none'} strokeDasharray={gone ? '1.5 1.5' : undefined} strokeWidth={0.4} className="cursor-pointer outline-none focus-visible:[stroke:var(--color-text)] focus-visible:[stroke-width:0.8px]"
              onClick={() => toggle(key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(key) } }} />
          )
        }))}
        {c.yDividers.map((f, k) => xe.slice(0, -1).map((_, i) => {
          const key = `y:${k}:${i}`
          const gone = c.removed.includes(key)
          const x0 = xe[i], w = xe[i + 1] - xe[i]
          return (
            <rect key={key} data-testid="segment" data-key={key} data-removed={gone || undefined} role="button" tabIndex={0}
              aria-label={t('box.compartments.divider', { axis: 'Y', k: k + 1, part: i + 1 })} aria-pressed={!gone}
              x={px(x0)} y={px(H - f * H - dividerW / 2)} width={px(w)} height={dividerW} fill={gone ? 'transparent' : stroke} fillOpacity={gone ? 0 : 0.85}
              stroke={gone ? 'var(--color-text-subtle)' : 'none'} strokeDasharray={gone ? '1.5 1.5' : undefined} strokeWidth={0.4} className="cursor-pointer outline-none focus-visible:[stroke:var(--color-text)] focus-visible:[stroke-width:0.8px]"
              onClick={() => toggle(key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(key) } }} />
          )
        }))}
        {/* ручки: за них двигаем перегородки */}
        {c.xDividers.map((f, k) => (
          <circle key={`hx${k}`} data-testid="handle-x" role="slider" tabIndex={0} aria-label={t('box.compartments.dragDivider', { axis: 'X', k: k + 1 })}
            aria-valuenow={Math.round(f * 1000) / 10} aria-valuemin={0} aria-valuemax={100} cx={f * W} cy={-1.8} r={2.6} fill="var(--color-surface-3)" stroke={stroke} strokeWidth={0.6} className="cursor-ew-resize outline-none focus-visible:[stroke-width:1.4px]"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); drag.current = { axis: 'x', k } }}
            onKeyDown={(e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const d = (e.key === 'ArrowRight' ? 1 : -1) * 1 / W; onChange({ ...c, xDividers: c.xDividers.map((v, i) => (i === k ? clamp(v + d, 0.02, 0.98) : v)) }) } }} />
        ))}
        {c.yDividers.map((f, k) => (
          <circle key={`hy${k}`} data-testid="handle-y" role="slider" tabIndex={0} aria-label={t('box.compartments.dragDivider', { axis: 'Y', k: k + 1 })}
            aria-valuenow={Math.round(f * 1000) / 10} aria-valuemin={0} aria-valuemax={100} cx={-1.8} cy={H - f * H} r={2.6} fill="var(--color-surface-3)" stroke={stroke} strokeWidth={0.6} className="cursor-ns-resize outline-none focus-visible:[stroke-width:1.4px]"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); drag.current = { axis: 'y', k } }}
            onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const d = (e.key === 'ArrowUp' ? 1 : -1) * 1 / H; onChange({ ...c, yDividers: c.yDividers.map((v, i) => (i === k ? clamp(v + d, 0.02, 0.98) : v)) }) } }} />
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-text-subtle">
        <span>X: {sizes.widths.map((w) => formatLength(w, unit)).join(' · ')}</span>
        <span>Y: {sizes.depths.map((w) => formatLength(w, unit)).join(' · ')}</span>
        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-accent underline" onClick={() => onChange({ ...c, xDividers: equalDividers(c.cols, W, t_), yDividers: equalDividers(c.rows, H, t_), removed: [] })}>
          {t('box.compartments.reset')}
        </button>
      </div>
    </div>
  )
}
