import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { allSlots, sameSlot, slotPosition, toggleSlot, type FastenerConfig, type Slot } from '../../geometry/fasteners'
import type { Footprint } from '../../geometry/footprint'
import { SegmentedControl } from '../../ui/SegmentedControl'

type Kind = 'magnets' | 'screws'

const cornerKey = (s: Slot) => `${s.sy > 0 ? 'top' : 'bottom'}${s.sx > 0 ? 'Right' : 'Left'}`

/**
 * Выбор позиций вручную: все стандартные позиции показаны переключателями, включённые получают отверстие и ухо.
 * Произвольных координат нет. Позиции доступны с клавиатуры (Tab, Enter, пробел).
 */
export function PlacementEditor({ config, onChange, footprint: fp }: { config: FastenerConfig; onChange: (c: FastenerConfig) => void; footprint: Footprint }) {
  const { t } = useTranslation()
  const available = (['magnets', 'screws'] as const).filter((k) => config[k].mode === 'manual')
  const [picked, setPicked] = useState<Kind>('magnets')
  const kind: Kind = available.includes(picked) ? picked : available[0]
  const selected = config[kind].slots
  const setSlots = (slots: Slot[]) => onChange({ ...config, [kind]: { ...config[kind], slots } })

  const pad = 6
  const radius = Math.max((kind === 'magnets' ? config.magnetD : config.screwD) / 2, 2.2)
  const color = kind === 'magnets' ? 'var(--color-accent)' : 'var(--color-warn)'
  // SVG: X вправо, Y вниз, начало — угол габарита; в модели Y вверх
  const toSvg = (s: Slot) => {
    const p = slotPosition(fp, s)
    return { x: p.x + fp.sizeX / 2, y: fp.sizeY / 2 - p.y }
  }
  const onKey = (e: KeyboardEvent, s: Slot) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSlots(toggleSlot(selected, s)) }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1 text-xs text-text-muted">{t('fastener.editor.title')} <span className="text-text-subtle">· {t('fastener.editor.hint')}</span></span>
      {available.length > 1 && (
        <SegmentedControl fill ariaLabel={t('fastener.editor.edit')} value={kind} onChange={setPicked}
          options={available.map((k) => ({ value: k, label: t(`fastener.${k}`) }))} />
      )}
      <svg
        role="group" aria-label={t('fastener.editor.label')} data-testid="placement-svg"
        viewBox={`${-pad} ${-pad} ${fp.sizeX + 2 * pad} ${fp.sizeY + 2 * pad}`}
        className="w-full rounded-control border border-border-strong bg-bg"
      >
        <rect x={0} y={0} width={fp.sizeX} height={fp.sizeY} fill="none" stroke="var(--color-border-strong)" strokeWidth={0.6} />
        {Array.from({ length: fp.nx * fp.ny }, (_, n) => {
          const i = Math.floor(n / fp.ny), j = n % fp.ny
          return <rect key={n} x={fp.offsetX + i * fp.pitch} y={fp.sizeY - fp.offsetY - (j + 1) * fp.pitch} width={fp.pitch} height={fp.pitch} fill="none" stroke="var(--color-border)" strokeWidth={0.4} />
        })}
        {allSlots(fp).map((s) => {
          const on = selected.some((q) => sameSlot(q, s))
          const c = toSvg(s)
          return (
            <circle
              key={`${s.i}-${s.j}-${s.sx}-${s.sy}`} data-testid={on ? 'hole' : 'snap'} role="switch" aria-checked={on} tabIndex={0}
              aria-label={t('fastener.editor.slot', { i: s.i + 1, j: s.j + 1, corner: t(`fastener.editor.corner.${cornerKey(s)}`) })}
              cx={c.x} cy={c.y} r={on ? radius : 2.2}
              fill={on ? color : 'var(--color-surface-3)'} fillOpacity={on ? 0.85 : 1} stroke={on ? '#fff' : 'var(--color-text-subtle)'} strokeWidth={0.4}
              className="cursor-pointer outline-none focus-visible:[stroke:var(--color-accent)] focus-visible:[stroke-width:1.2px]"
              onClick={() => setSlots(toggleSlot(selected, s))} onKeyDown={(e) => onKey(e, s)}
            />
          )
        })}
      </svg>
      {selected.length === 0 && <span className="text-xs text-text-subtle">{t('fastener.editor.empty')}</span>}
    </div>
  )
}
