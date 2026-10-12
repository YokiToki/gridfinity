import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { defaultPattern, patternResolution, type KeychainParams } from '../../geometry/keychain'
import { coverage, PATTERN_KINDS, type PatternKind, type PatternParams, type PatternScope } from '../../geometry/patterns/fields'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { Toggle } from '../../ui/Toggle'
import { Button } from '../../ui/Button'
import { Banner } from '../../ui/Banner'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { formatLength, useUnit } from '../../ui/units'

/** Миниатюра узора: тот же coverage(), что и в геометрии, на сетке 32 × 32 с шагом, подобранным под клетку. */
function PatternThumb({ kind }: { kind: PatternKind }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return // jsdom без canvas
    const N = 32
    const img = ctx.createImageData(N, N)
    const p: PatternParams = { ...defaultPattern, kind, pitch: 8, width: 3, angle: 45, offset: 0, staggered: true }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const on = kind === 'none' ? 0 : coverage(p, i - N / 2 + 0.5, j - N / 2 + 0.5)
      img.data.set(on ? [20, 24, 32, 255] : [124, 156, 255, 255], (j * N + i) * 4)
    }
    ctx.putImageData(img, 0, 0)
  }, [kind])
  return <canvas ref={ref} width={32} height={32} aria-hidden className="block h-8 w-8 rounded-xs [image-rendering:pixelated]" />
}

/** Поверхностный узор: выбор по миниатюрам, параметры выбранного, область применения, «Сбросить до гладкого» и предупреждение о разрешении. */
export function PatternSection({ value: pat, quality, cell, minCell, error, onChange, onRaise }: {
  value: PatternParams
  quality: KeychainParams['quality']
  cell: number | null
  minCell: number | null
  error: (field: string) => string | undefined
  onChange: (p: Partial<PatternParams>) => void
  onRaise: (cell: number) => void
}) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const on = pat.kind !== 'none'
  const res = on && cell && minCell ? patternResolution(pat, cell, minCell) : null
  const widthLabel = pat.kind === 'dots' ? t('keychain.pattern.dotDiameter') : t('keychain.pattern.lineWidth')
  const hasAngle = pat.kind === 'lines' || pat.kind === 'crosshatch' || pat.kind === 'dots' || pat.kind === 'hex'
  const summary = on ? `${t(`keychain.pattern.kinds.${pat.kind}`)} · ${formatLength(pat.pitch, unit)} ${t(`units.${unit}`)}` : t('keychain.pattern.kinds.none')
  void quality
  return (
    <Section title={t('keychain.pattern.title')} summary={summary} modified={isChanged(pat, defaultPattern)} onReset={() => onChange({ ...defaultPattern })}>
      <div role="radiogroup" aria-label={t('keychain.pattern.kind')} className="grid grid-cols-3 gap-1.5">
        {PATTERN_KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={pat.kind === k} aria-label={t(`keychain.pattern.kinds.${k}`)} onClick={() => onChange({ kind: k })}
            className={`flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-control border px-1 py-1.5 text-[11px] leading-tight ${pat.kind === k ? 'border-accent bg-accent-muted text-white' : 'border-border-strong bg-surface-2 text-text-muted hover:text-text'}`}>
            <PatternThumb kind={k} /><span className="max-w-full truncate">{t(`keychain.pattern.kinds.${k}`)}</span>
          </button>
        ))}
      </div>
      {on && (
        <>
          <LengthField label={t('keychain.pattern.pitch')} value={pat.pitch} min={0.2} max={30} step={0.1} error={error('pattern.pitch')} onChange={(v) => onChange({ pitch: v })} />
          <LengthField label={widthLabel} value={pat.width} min={0.05} max={30} step={0.05} error={error('pattern.width')} onChange={(v) => onChange({ width: v })} />
          <LengthField label={t('keychain.pattern.depth')} value={pat.depth} min={0} max={5} step={0.05} error={error('pattern.depth')} onChange={(v) => onChange({ depth: v })} />
          {hasAngle && <NumberField label={t('keychain.pattern.angle')} value={pat.angle} min={-180} max={180} step={5} digits={0} unit="°" onChange={(v) => onChange({ angle: v })} />}
          <LengthField label={t('keychain.pattern.offset')} value={pat.offset} min={-30} max={30} step={0.1} onChange={(v) => onChange({ offset: v })} />
          {pat.kind === 'dots' && <Toggle label={t('keychain.pattern.staggered')} checked={pat.staggered} onChange={(v) => onChange({ staggered: v })} />}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-muted">{t('keychain.pattern.scope')}</span>
            <SegmentedControl fill ariaLabel={t('keychain.pattern.scope')} value={pat.scope} onChange={(v: PatternScope) => onChange({ scope: v })}
              options={(['relief', 'plateau', 'base'] as const).map((s) => ({ value: s, label: t(`keychain.pattern.scopes.${s}`) }))} />
            {error('pattern.scope') && <span className="text-xs text-error-text">{error('pattern.scope')}</span>}
          </div>
          {res?.tooFine && (
            <Banner kind="warn">{t('keychain.pattern.tooFine', { cell: formatLength(cell!, unit), min: formatLength(res.minPitch, unit), u: t(`units.${unit}`) })}</Banner>
          )}
          {res?.tooFine && res.canRaise && <Button onClick={() => onRaise(res.raiseTo)}>{t('keychain.pattern.raise', { cell: formatLength(res.raiseTo, unit), u: t(`units.${unit}`) })}</Button>}
          <Button onClick={() => onChange({ ...defaultPattern })}>{t('keychain.pattern.reset')}</Button>
        </>
      )}
    </Section>
  )
}
