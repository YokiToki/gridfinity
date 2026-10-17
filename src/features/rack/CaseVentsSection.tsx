import { useTranslation } from 'react-i18next'
import { CASE_LIMITS, type RackCaseParams } from '../../geometry/rack/case'
import type { Issue } from '../../geometry/rack/patterns/types'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { Toggle } from '../../ui/Toggle'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'
import type { CasePatch } from './CasePanel'

/** Вентиляция: соты в верхней и боковых стенках; тонкая стенка сот предупреждает. */
export function CaseVentsSection({ params: p, defaults, errors, warnings, update }: { params: RackCaseParams; defaults: RackCaseParams; errors: string[]; warnings: Issue[]; update: CasePatch }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const v = p.vents
  const set = (patch: Partial<RackCaseParams['vents']>) => update((o) => ({ ...o, vents: { ...o.vents, ...patch } }))
  const err = errors.includes('rack.error.vents') ? t('rack.case.error.vents') : undefined
  return (
    <Section title={t('rack.case.vents.title')} summary={v.enabled ? t('rack.case.vents.summaryOn', { w: `${formatLength(v.width, unit)} ${t(`units.${unit}`)}` }) : t('rack.case.vents.summaryOff')}
      modified={isChanged(v, defaults.vents)} onReset={() => update((o) => ({ ...o, vents: defaults.vents }))}>
      <Toggle label={t('rack.case.vents.enabled')} checked={v.enabled} onChange={(on) => set({ enabled: on })} />
      {v.enabled && (
        <div className="grid grid-cols-2 gap-2">
          <LengthField label={t('rack.case.vents.width')} value={v.width} min={CASE_LIMITS.vent[0]} max={CASE_LIMITS.vent[1]} step={0.5} error={err} onChange={(x) => set({ width: x })} />
          <LengthField label={t('rack.case.vents.wall')} value={v.wall} min={CASE_LIMITS.ventWall[0]} max={CASE_LIMITS.ventWall[1]} step={0.1} error={err} onChange={(x) => set({ wall: x })} />
          <LengthField label={t('rack.case.vents.margin')} value={v.margin} min={CASE_LIMITS.ventMargin[0]} max={CASE_LIMITS.ventMargin[1]} step={0.5} error={err} onChange={(x) => set({ margin: x })} />
        </div>
      )}
      {v.enabled && warnings.filter((w) => w.key === 'rack.warning.thin').map((w) => <Banner key={w.setting} kind="warn">{t('rack.warning.thin', { setting: t(`rack.field.${w.setting}`) })}</Banner>)}
      <Banner>{t('rack.case.vents.help')}</Banner>
    </Section>
  )
}
