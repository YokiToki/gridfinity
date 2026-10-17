import { useTranslation } from 'react-i18next'
import { CASE_LIMITS, caseLayout, type RackCaseParams } from '../../geometry/rack/case'
import { MAX_UNITS } from '../../geometry/rack/spec'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { Toggle } from '../../ui/Toggle'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'
import type { CasePatch } from './CasePanel'

const pick = (p: RackCaseParams) => ({ wall: p.wall, plateThickness: p.plateThickness, units: p.units, cornerRadius: p.cornerRadius, tolerance: p.tolerance })

/** Оболочка: стенка, толщина передней панели, юниты (автоматически или не меньше нужного), скругление и допуск. */
export function CaseShellSection({ params: p, defaults, errors, update }: { params: RackCaseParams; defaults: RackCaseParams; errors: string[]; update: CasePatch }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const fmt = (mm: number) => `${formatLength(mm, unit)} ${t(`units.${unit}`)}`
  const l = caseLayout(p)
  const err = (key: string, text: string) => (errors.includes(key) ? text : undefined)
  return (
    <Section title={t('rack.case.shell.title')} summary={t('rack.case.shell.summary', { u: l.units, w: fmt(p.wall) })}
      modified={isChanged(pick(p), pick(defaults))} onReset={() => update((o) => ({ ...o, ...pick(defaults) }))}>
      <Toggle label={t('rack.case.shell.unitsAuto')} checked={p.units.auto} onChange={(v) => update((o) => ({ ...o, units: { ...o.units, auto: v, value: v ? o.units.value : Math.max(o.units.value, caseLayout(o).autoUnits) } }))} />
      {!p.units.auto && <NumberField label={t('rack.case.shell.units')} value={p.units.value} min={1} max={MAX_UNITS} digits={0} onChange={(v) => update((o) => ({ ...o, units: { ...o.units, value: Math.round(v) } }))} />}
      <Banner>{t('rack.case.shell.info', { u: l.units, h: fmt(l.plateH) })}</Banner>
      {l.raised && <Banner kind="warn">{t('rack.case.shell.raised', { u: l.units })}</Banner>}
      <div className="grid grid-cols-2 gap-2">
        <LengthField label={t('rack.case.shell.wall')} value={p.wall} min={CASE_LIMITS.wall[0]} max={CASE_LIMITS.wall[1]} step={0.1} error={err('rack.error.wall', t('rack.case.error.wall'))} onChange={(v) => update((o) => ({ ...o, wall: v }))} />
        <LengthField label={t('rack.case.shell.plate')} value={p.plateThickness} min={CASE_LIMITS.plate[0]} max={CASE_LIMITS.plate[1]} step={0.1} error={err('rack.error.thickness', t('rack.error.thickness'))} onChange={(v) => update((o) => ({ ...o, plateThickness: v }))} />
        <LengthField label={t('rack.case.shell.cornerRadius')} value={p.cornerRadius} min={0} max={10} step={0.5} error={err('rack.error.cornerRadius', t('rack.error.cornerRadius'))} onChange={(v) => update((o) => ({ ...o, cornerRadius: v }))} />
      </div>
      <Toggle label={t('rack.case.shell.tolerance')} checked={p.tolerance} onChange={(v) => update((o) => ({ ...o, tolerance: v }))} />
      <Banner>{t('rack.case.shell.help')}</Banner>
    </Section>
  )
}
