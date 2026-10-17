import { useTranslation } from 'react-i18next'
import { PANEL_LIMITS, type RackPanelParams } from '../../geometry/rack/panel'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { Toggle } from '../../ui/Toggle'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'
import type { PanelPatch } from './RackPanel'

/** Задняя стенка: отдельная тонкая деталь за панелью. */
export function BackSection({ params: p, defaults, errors, update }: { params: RackPanelParams; defaults: RackPanelParams; errors: string[]; update: PanelPatch }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const summary = p.back.enabled ? t('rack.back.summaryOn', { t: `${formatLength(p.back.thickness, unit)} ${t(`units.${unit}`)}` }) : t('rack.back.summaryOff')
  return (
    <Section title={t('rack.back.title')} summary={summary} modified={isChanged(p.back, defaults.back)} onReset={() => update((o) => ({ ...o, back: defaults.back }))}>
      <Toggle label={t('rack.back.enabled')} checked={p.back.enabled} onChange={(v) => update((o) => ({ ...o, back: { ...o.back, enabled: v } }))} />
      {p.back.enabled && <LengthField label={t('rack.back.thickness')} value={p.back.thickness} min={PANEL_LIMITS.backThickness[0]} max={PANEL_LIMITS.backThickness[1]} step={0.1}
        error={errors.includes('rack.error.backThickness') ? t('rack.error.backThickness') : undefined} onChange={(v) => update((o) => ({ ...o, back: { ...o.back, thickness: v } }))} />}
      <Banner>{t('rack.back.help')}</Banner>
    </Section>
  )
}
