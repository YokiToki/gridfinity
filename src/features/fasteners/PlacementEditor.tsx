import { useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { standardPositions, type FastenerConfig } from '../../geometry/fasteners'
import type { Footprint, Point } from '../../geometry/footprint'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { LengthField } from '../../ui/LengthField'
import { clampToFootprint, fromCorner, indexAt, snapPoint, toCorner, togglePoint } from './placement'

type Kind = 'magnets' | 'screws'

/**
 * 2D-редактор ручной расстановки (SVG). Точки привязки — стандартные позиции; клик по точке или пустому месту
 * добавляет/убирает отверстие, перетаскивание двигает (с привязкой), список даёт точные координаты от угла.
 */
export function PlacementEditor({ config, onChange, footprint: fp }: { config: FastenerConfig; onChange: (c: FastenerConfig) => void; footprint: Footprint }) {
  const { t } = useTranslation()
  const available = (['magnets', 'screws'] as const).filter((k) => config[k].mode === 'manual')
  const [picked, setPicked] = useState<Kind>('magnets')
  const kind: Kind = available.includes(picked) ? picked : available[0]
  const points = config[kind].manual
  const snaps = standardPositions(fp)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ index: number; moved: boolean } | null>(null)

  const setPoints = (manual: Point[]) => onChange({ ...config, [kind]: { ...config[kind], manual } })
  const radius = kind === 'magnets' ? config.magnetD / 2 : config.screwD / 2

  // координаты SVG: X вправо в мм от угла, Y вниз; в модель переводим с переворотом Y
  const svgY = (c: Point) => fp.sizeY - c.y
  const pad = 6
  const toModel = (e: { clientX: number; clientY: number }): Point | null => {
    const el = svg.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return null
    const vb = { w: fp.sizeX + 2 * pad, h: fp.sizeY + 2 * pad }
    const cx = ((e.clientX - r.left) / r.width) * vb.w - pad
    const cy = ((e.clientY - r.top) / r.height) * vb.h - pad
    return fromCorner({ x: cx, y: fp.sizeY - cy }, fp)
  }

  const onBackground = (e: PointerEvent) => {
    if (e.target !== e.currentTarget) return
    const p = toModel(e)
    if (p) setPoints([...points, snapPoint(clampToFootprint(p, fp), snaps)])
  }
  const onHolePointerDown = (e: PointerEvent, index: number) => {
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    drag.current = { index, moved: false }
  }
  const onHolePointerMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = toModel(e)
    if (!p) return
    d.moved = true
    setPoints(points.map((q, i) => (i === d.index ? snapPoint(clampToFootprint(p, fp), snaps) : q)))
  }
  const onHolePointerUp = (e: PointerEvent, index: number) => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) setPoints(points.filter((_, i) => i !== index)) // клик по отверстию убирает его
    ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
  }

  const color = kind === 'magnets' ? 'var(--color-accent)' : 'var(--color-warn)'
  const cellRects: Point[] = []
  for (let i = 0; i < fp.nx; i++) for (let j = 0; j < fp.ny; j++) cellRects.push({ x: fp.offsetX + i * fp.pitch, y: fp.offsetY + j * fp.pitch })

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1 text-xs text-text-muted">{t('fastener.editor.title')} <span className="text-text-subtle">· {t('fastener.editor.hint')}</span></span>
      {available.length > 1 && (
        <SegmentedControl fill ariaLabel={t('fastener.editor.edit')} value={kind} onChange={setPicked}
          options={available.map((k) => ({ value: k, label: t(`fastener.${k}`) }))} />
      )}
      <svg
        ref={svg} role="img" aria-label={t('fastener.editor.label')} data-testid="placement-svg"
        viewBox={`${-pad} ${-pad} ${fp.sizeX + 2 * pad} ${fp.sizeY + 2 * pad}`}
        className="w-full touch-none rounded-control border border-border-strong bg-bg"
        onPointerDown={onBackground}
      >
        <rect x={0} y={0} width={fp.sizeX} height={fp.sizeY} fill="none" stroke="var(--color-border-strong)" strokeWidth={0.6} pointerEvents="none" />
        {cellRects.map((c, i) => (
          <rect key={i} x={c.x} y={fp.sizeY - c.y - fp.pitch} width={fp.pitch} height={fp.pitch} fill="none" stroke="var(--color-border)" strokeWidth={0.4} pointerEvents="none" />
        ))}
        {snaps.map((s, i) => {
          const c = toCorner(s, fp)
          const taken = indexAt(points, s) >= 0
          return taken ? null : (
            <circle key={i} data-testid="snap" cx={c.x} cy={svgY(c)} r={2.2} fill="var(--color-surface-3)" stroke="var(--color-text-subtle)" strokeWidth={0.4} className="cursor-pointer"
              onPointerDown={(e) => { e.stopPropagation(); setPoints(togglePoint(points, s)) }} />
          )
        })}
        {points.map((p, i) => {
          const c = toCorner(p, fp)
          return (
            <circle key={i} data-testid="hole" cx={c.x} cy={svgY(c)} r={Math.max(radius, 1.5)} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={0.4} className="cursor-grab"
              onPointerDown={(e) => onHolePointerDown(e, i)} onPointerMove={onHolePointerMove} onPointerUp={(e) => onHolePointerUp(e, i)} />
          )
        })}
      </svg>
      {points.length === 0 && <span className="text-xs text-text-subtle">{t('fastener.editor.empty')}</span>}
      <ul aria-label={t('fastener.editor.list')} className="m-0 flex list-none flex-col gap-2 p-0">
        {points.map((p, i) => {
          const c = toCorner(p, fp)
          const move = (patch: Partial<Point>) => setPoints(points.map((q, k) => (k === i ? clampToFootprint(fromCorner({ ...c, ...patch }, fp), fp) : q)))
          return (
            <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <LengthField label={`${t('fastener.editor.hole', { n: i + 1 })} ${t('fastener.editor.x')}`} value={c.x} min={0} max={fp.sizeX} step={0.5} onChange={(v) => move({ x: v })} />
              <LengthField label={`${t('fastener.editor.hole', { n: i + 1 })} ${t('fastener.editor.y')}`} value={c.y} min={0} max={fp.sizeY} step={0.5} onChange={(v) => move({ y: v })} />
              <button type="button" aria-label={t('fastener.editor.remove', { n: i + 1 })} onClick={() => setPoints(points.filter((_, k) => k !== i))}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-control border-0 bg-transparent text-text-muted hover:bg-surface-3 hover:text-text"><IconTrash size={16} stroke={1.75} /></button>
            </li>
          )
        })}
      </ul>
      <button type="button" onClick={() => setPoints([...points, { x: 0, y: 0 }])}
        className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-border-strong bg-surface-2 px-3 text-text hover:bg-surface-3">
        <IconPlus size={16} stroke={1.75} />{t('fastener.editor.add')}
      </button>
    </div>
  )
}
