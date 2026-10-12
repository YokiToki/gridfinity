import { useTranslation } from 'react-i18next'
import { defaultShape, effectiveRadius, SHAPE_KINDS, SHAPE_PRESETS, type ShapeKind, type ShapeParams } from '../../geometry/shapes'
import { Section } from '../../ui/Section'
import { Select } from '../../ui/Select'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { formatLength, useUnit } from '../../ui/units'

/** Значок вида фигуры (24 px) для переключателя. */
function KindIcon({ kind }: { kind: ShapeKind }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden className="flex-none">
      {kind === 'rect' && <rect x="3" y="6" width="18" height="12" rx="3" {...p} />}
      {kind === 'circle' && <circle cx="12" cy="12" r="8" {...p} />}
      {kind === 'ellipse' && <ellipse cx="12" cy="12" rx="9" ry="6" {...p} />}
      {kind === 'capsule' && <rect x="2.5" y="7.5" width="19" height="9" rx="4.5" {...p} />}
      {kind === 'polygon' && <path d="M12 3.5 19.4 7.75v8.5L12 20.5l-7.4-4.25v-8.5Z" {...p} />}
    </svg>
  )
}

/** Форма: вид фигуры (значки), размеры в мм, скругление с действующим значением, стороны и поворот многоугольника, готовые размеры. Макета нет: собрана из компонентов ui/. */
export function ShapeSection({ value: s, error, onChange }: { value: ShapeParams; error: (field: string) => string | undefined; onChange: (p: Partial<ShapeParams>) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const u = t(`units.${unit}`)
  const kindName = t(`keychain.shape.kinds.${s.kind}`)
  const round = s.kind === 'circle'
  const summary = round
    ? t('keychain.shape.summaryRound', { kind: kindName, d: formatLength(s.width, unit), u })
    : t('keychain.shape.summary', { kind: kindName, w: formatLength(s.width, unit), h: formatLength(s.kind === 'polygon' ? s.width : s.height, unit), u })
  const hasHeight = s.kind === 'rect' || s.kind === 'ellipse' || s.kind === 'capsule'
  const hasRadius = s.kind === 'rect' || s.kind === 'polygon'
  const eff = effectiveRadius(s)
  const clamped = hasRadius && s.radius > eff + 1e-9
  const widthLabel = round ? t('keychain.shape.diameter') : s.kind === 'polygon' ? t('keychain.shape.acrossCorners') : t('keychain.shape.width')
  return (
    <Section title={t('keychain.shape.title')} summary={summary} onReset={() => onChange({ ...defaultShape, rim: s.rim })}>
      <div role="radiogroup" aria-label={t('keychain.shape.kind')} className="grid grid-cols-5 gap-1">
        {SHAPE_KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={s.kind === k} aria-label={t(`keychain.shape.kinds.${k}`)} title={t(`keychain.shape.kinds.${k}`)} data-testid={`kind-${k}`}
            onClick={() => onChange({ kind: k })}
            className={`flex h-11 cursor-pointer items-center justify-center rounded-control border ${s.kind === k ? 'border-accent bg-accent-muted text-white' : 'border-border-strong bg-surface-2 text-text-muted hover:text-text'}`}>
            <KindIcon kind={k} />
          </button>
        ))}
      </div>
      <Select label={t('keychain.shape.preset')} value="" options={[{ value: '', label: t('keychain.shape.presetPick') }, ...SHAPE_PRESETS.map((x) => ({ value: x.id, label: t(`keychain.shape.presets.${x.id}`) }))]}
        onChange={(v) => { const pr = SHAPE_PRESETS.find((x) => x.id === v); if (pr) onChange(pr.shape) }} />
      <div className={hasHeight ? 'grid grid-cols-2 gap-2' : ''}>
        <LengthField label={widthLabel} value={s.width} min={2} max={300} step={1} error={error('shape.width')} onChange={(v) => onChange({ width: v })} />
        {hasHeight && <LengthField label={t('keychain.shape.height')} value={s.height} min={2} max={300} step={1} error={error('shape.height')} onChange={(v) => onChange({ height: v })} />}
      </div>
      {hasRadius && <LengthField label={t('keychain.shape.radius')} value={s.radius} min={0} max={150} step={0.5} error={error('shape.radius')} onChange={(v) => onChange({ radius: v })} />}
      {clamped && <span className="-mt-1 text-xs text-text-subtle" data-testid="effective-radius">{t('keychain.shape.effectiveRadius', { r: formatLength(eff, unit), u })}</span>}
      {s.kind === 'polygon' && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField label={t('keychain.shape.sides')} value={s.sides} min={3} max={12} step={1} digits={0} error={error('shape.sides')} onChange={(v) => onChange({ sides: v })} />
          <NumberField label={t('keychain.shape.rotation')} value={s.rotation} min={-360} max={360} step={5} digits={1} error={error('shape.rotation')} onChange={(v) => onChange({ rotation: v })} />
        </div>
      )}
    </Section>
  )
}
