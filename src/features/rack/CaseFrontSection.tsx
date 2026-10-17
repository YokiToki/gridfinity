import { useTranslation } from 'react-i18next'
import { CASE_LIMITS, type RackCaseParams } from '../../geometry/rack/case'
import type { Issue } from '../../geometry/rack/patterns/types'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { Toggle } from '../../ui/Toggle'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'
import type { CasePatch } from './CasePanel'

const pick = (p: RackCaseParams) => ({ window: p.window, keystones: p.keystones, cable: p.cable })

/** Передняя панель: окно с каймой, keystone и кабельные отверстия; что не помещается, сообщается и не режется. */
export function CaseFrontSection({ params: p, defaults, errors, warnings, update }: { params: RackCaseParams; defaults: RackCaseParams; errors: string[]; warnings: Issue[]; update: CasePatch }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const fmt = (mm: number) => `${formatLength(mm, unit)} ${t(`units.${unit}`)}`
  const summary = t('rack.case.front.summary', { window: p.window.enabled ? t('rack.case.front.windowOn', { lip: fmt(p.window.lip) }) : t('rack.case.front.windowOff') })
  return (
    <Section title={t('rack.case.front.title')} summary={summary} modified={isChanged(pick(p), pick(defaults))} onReset={() => update((o) => ({ ...o, ...pick(defaults) }))}>
      <Toggle label={t('rack.case.front.window')} checked={p.window.enabled} onChange={(v) => update((o) => ({ ...o, window: { ...o.window, enabled: v } }))} />
      {p.window.enabled && <LengthField label={t('rack.case.front.lip')} value={p.window.lip} min={CASE_LIMITS.lip[0]} max={CASE_LIMITS.lip[1]} step={0.5} error={errors.includes('rack.error.lip') ? t('rack.case.error.lip') : undefined} onChange={(v) => update((o) => ({ ...o, window: { ...o.window, lip: v } }))} />}
      <NumberField label={t('rack.case.front.keystones')} value={p.keystones.count} min={CASE_LIMITS.keystones[0]} max={CASE_LIMITS.keystones[1]} digits={0} onChange={(v) => update((o) => ({ ...o, keystones: { ...o.keystones, count: Math.round(v) } }))} />
      {p.keystones.count > 0 && (
        <SegmentedControl fill ariaLabel={t('rack.case.front.side')} value={p.keystones.side} onChange={(side) => update((o) => ({ ...o, keystones: { ...o.keystones, side } }))}
          options={(['left', 'right', 'below'] as const).map((v) => ({ value: v, label: t(`rack.case.front.${v}`) }))} />
      )}
      <SegmentedControl fill ariaLabel={t('rack.case.front.cable')} value={String(p.cable.count) as '0' | '1' | '2'} onChange={(v) => update((o) => ({ ...o, cable: { ...o.cable, count: Number(v) } }))}
        options={(['0', '1', '2'] as const).map((v) => ({ value: v, label: t(`rack.case.front.cable${v}`) }))} />
      {p.cable.count > 0 && <LengthField label={t('rack.case.front.diameter')} value={p.cable.diameter} min={CASE_LIMITS.cable[0]} max={CASE_LIMITS.cable[1]} step={0.5} error={errors.includes('rack.error.cable') ? t('rack.case.error.cable') : undefined} onChange={(v) => update((o) => ({ ...o, cable: { ...o.cable, diameter: v } }))} />}
      <Banner>{t('rack.case.front.help')}</Banner>
      {warnings.filter((w) => w.key === 'rack.warning.fit').map((w) => <Banner key={w.setting} kind="warn">{t('rack.warning.fit', { setting: t(`rack.field.${w.setting}`) })}</Banner>)}
    </Section>
  )
}
