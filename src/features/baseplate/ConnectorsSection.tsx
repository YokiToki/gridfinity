import { useTranslation } from 'react-i18next'
import { planSplit, toGeometry, type BaseplateParams } from '../../geometry/baseplate'
import { cutKey, CONNECTOR_TYPES, CUSTOM, defaultConnector, HOLE_PRESETS, withHolePreset, type ConnectorConfig, type ConnectorType } from '../../geometry/connectors'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { Select } from '../../ui/Select'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { formatLength, useUnit } from '../../ui/units'
import { Banner } from '../../ui/Banner'

/** Соединители между частями: тип, размеры, зазор, тип отдельных разрезов и предупреждения. */
export function ConnectorsSection({ params: p, onChange }: { params: BaseplateParams; onChange: (c: ConnectorConfig) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const c = p.split.connector
  const set = (patch: Partial<ConnectorConfig>) => onChange({ ...c, ...patch })
  const { parts, plans } = planSplit(toGeometry(p))
  const issues = plans.flatMap((x) => x.issues)
  // реальная глубина отверстий: минимум по торцам с отверстиями (ограничена длиной части)
  const holePlans = plans.filter((x) => x.type === 'holes' && x.depthA > 0)
  const effective = holePlans.length ? Math.min(...holePlans.map((x) => Math.min(x.depthA, x.depthB))) : c.depth
  const clamped = effective < c.depth - 1e-9
  if (!p.split.enabled || parts.length <= 1) return null
  const summary = c.type === 'none' ? t('connector.summary.none') : t(`connector.summary.${c.type}`, { n: c.count })
  const typeOptions = CONNECTOR_TYPES.map((v) => ({ value: v, label: t(`connector.${v}`) }))
  const overrideOptions = [{ value: '', label: t('connector.useDefault') }, ...typeOptions]

  return (
    <Section title={t('connector.title')} summary={summary} modified={isChanged(c, defaultConnector)} onReset={() => onChange(defaultConnector)}>
      <SegmentedControl fill ariaLabel={t('connector.type')} value={c.type} onChange={(v) => set({ type: v })} options={typeOptions} />
      {c.type === 'holes' && (
        <>
          <Select label={t('connector.preset')} value={c.preset} onChange={(id) => onChange(withHolePreset(c, id))}
            options={[...HOLE_PRESETS.map((h) => ({ value: h.id, label: t(`connector.presets.${h.id}`) })), { value: CUSTOM, label: t('connector.presets.custom') }]} />
          <div className="grid grid-cols-2 gap-2">
            <LengthField label={t('connector.diameter')} value={c.diameter} min={0.5} max={12} step={0.05} onChange={(v) => set({ diameter: v, preset: CUSTOM })} />
            <LengthField label={t('connector.depth')} value={c.depth} min={0.3} max={50} step={0.1} onChange={(v) => set({ depth: v, preset: CUSTOM })} />
          </div>
          <span className="font-mono text-xs text-text-subtle">
            {t(clamped ? 'connector.effectiveDepthClamped' : 'connector.effectiveDepth', { value: `${formatLength(effective, unit)} ${t(`units.${unit}`)}` })}
          </span>
          <span className="text-xs text-text-subtle">{t('connector.holesHelp')}</span>
        </>
      )}
      {c.type === 'dovetail' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <LengthField label={t('connector.neck')} value={c.neck} min={1} max={20} step={0.5} onChange={(v) => set({ neck: v })} />
            <LengthField label={t('connector.tip')} value={c.tip} min={1} max={30} step={0.5} onChange={(v) => set({ tip: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <LengthField label={t('connector.dovetailDepth')} value={c.dovetailDepth} min={0.3} max={5} step={0.1} onChange={(v) => set({ dovetailDepth: v })} />
            <LengthField label={t('connector.dovetailHeight')} value={c.dovetailHeight} min={0.5} max={5} step={0.1} onChange={(v) => set({ dovetailHeight: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <LengthField label={t('connector.clearance')} value={c.clearance} min={0} max={1} step={0.05} onChange={(v) => set({ clearance: v })} />
          </div>
        </>
      )}
      {c.type !== 'none' && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField stepper label={t('connector.count')} value={c.count} min={1} max={8} digits={0} onChange={(v) => set({ count: v })} />
          <LengthField label={t('connector.inset')} value={c.inset} min={0} max={100} step={1} onChange={(v) => set({ inset: v })} />
        </div>
      )}
      {plans.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-text-muted">{t('connector.perCut')}</span>
          {plans.map((pl) => {
            const key = cutKey(pl.face.axis, pl.face.cut)
            return (
              <Select key={key} label={t('connector.cutLabel', { axis: pl.face.axis.toUpperCase(), n: pl.face.cut, parts: `${pl.face.a.label}–${pl.face.b.label}` })}
                value={c.overrides[key] ?? ''}
                onChange={(v) => {
                  const next = { ...c.overrides }
                  if (v === '') delete next[key]
                  else next[key] = v as ConnectorType
                  set({ overrides: next })
                }} options={overrideOptions} />
            )
          })}
        </div>
      )}
      {issues.length > 0 && (
        <div className="flex flex-col gap-2" role="group" aria-label={t('connector.issuesTitle')}>
          {issues.map((i, k) => <Banner key={k} kind="warn">{t(i.key, { cut: i.cut.replace(':', ' '), parts: i.parts })}</Banner>)}
        </div>
      )}
    </Section>
  )
}
