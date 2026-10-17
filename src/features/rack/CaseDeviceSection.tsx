import { useTranslation } from 'react-i18next'
import { CASE_LIMITS, type RackCaseParams } from '../../geometry/rack/case'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'
import type { CasePatch } from './CasePanel'

const pick = (p: RackCaseParams) => ({ device: p.device, gap: p.gap })

/** Устройство: ширина, глубина, высота и зазор до оболочки; ошибка «слишком широко» называет превышение. */
export function CaseDeviceSection({ params: p, defaults, errors, excess, update }: { params: RackCaseParams; defaults: RackCaseParams; errors: string[]; excess: number; update: CasePatch }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const fmt = (mm: number) => formatLength(mm, unit)
  const setDev = (k: keyof RackCaseParams['device'], v: number) => update((o) => ({ ...o, device: { ...o.device, [k]: v } }))
  const wide = errors.includes('rack.error.tooWide') ? t('rack.case.error.tooWide', { excess: `${fmt(excess)} ${t(`units.${unit}`)}` }) : undefined
  const bad = errors.includes('rack.error.device') ? t('rack.case.error.device') : undefined
  return (
    <Section title={t('rack.case.device.title')} summary={t('rack.case.device.summary', { w: fmt(p.device.width), d: fmt(p.device.depth), h: fmt(p.device.height) })}
      modified={isChanged(pick(p), pick(defaults))} onReset={() => update((o) => ({ ...o, ...pick(defaults) }))}>
      <div className="grid grid-cols-2 gap-2">
        <LengthField label={t('rack.case.device.width')} value={p.device.width} min={CASE_LIMITS.width[0]} max={CASE_LIMITS.width[1]} step={1} error={wide ?? bad} onChange={(v) => setDev('width', v)} />
        <LengthField label={t('rack.case.device.depth')} value={p.device.depth} min={CASE_LIMITS.depth[0]} max={CASE_LIMITS.depth[1]} step={1} error={bad} onChange={(v) => setDev('depth', v)} />
        <LengthField label={t('rack.case.device.height')} value={p.device.height} min={CASE_LIMITS.height[0]} max={CASE_LIMITS.height[1]} step={1} error={bad} onChange={(v) => setDev('height', v)} />
        <LengthField label={t('rack.case.device.gap')} value={p.gap} min={CASE_LIMITS.gap[0]} max={CASE_LIMITS.gap[1]} step={0.1} error={errors.includes('rack.error.gap') ? t('rack.case.error.gap') : undefined} onChange={(v) => update((o) => ({ ...o, gap: v }))} />
      </div>
      {errors.includes('rack.error.tooTall') && <Banner kind="warn">{t('rack.case.error.tooTall')}</Banner>}
      <Banner>{t('rack.case.device.help')}</Banner>
    </Section>
  )
}
