import { useTranslation } from 'react-i18next'
import { defaultKeychain, type QualityParams, type ReliefParams } from '../../geometry/keychain'
import { Section } from '../../ui/Section'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'

/** Профиль рельефа: плато, скос, показатель, минимальная высота у кромки. */
export function ReliefSection({ value: r, error, onChange }: { value: ReliefParams; error: (field: string) => string | undefined; onChange: (p: Partial<ReliefParams>) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const summary = t('keychain.relief.summary', { h: formatLength(r.hmax, unit), e: formatLength(r.edgeWidth, unit), u: t(`units.${unit}`) })
  return (
    <Section title={t('keychain.relief.title')} summary={summary} defaultOpen={false} onReset={() => onChange({ ...defaultKeychain.relief })}>
      <LengthField label={t('keychain.relief.hmax')} value={r.hmax} min={0.2} max={20} step={0.1} error={error('relief.hmax')} onChange={(v) => onChange({ hmax: v })} />
      <LengthField label={t('keychain.relief.edgeWidth')} value={r.edgeWidth} min={0.2} max={40} step={0.5} error={error('relief.edgeWidth')} onChange={(v) => onChange({ edgeWidth: v })} />
      <NumberField label={t('keychain.relief.pow')} value={r.pow} min={0.1} max={3} step={0.05} digits={2} error={error('relief.pow')} onChange={(v) => onChange({ pow: v })} />
      <LengthField label={t('keychain.relief.heightFloor')} value={r.heightFloor} min={0} max={20} step={0.02} error={error('relief.heightFloor')} onChange={(v) => onChange({ heightFloor: v })} />
    </Section>
  )
}

/** Разрешение: шаг сетки и бюджет треугольников; при превышении бюджета шаг увеличен, и об этом сообщается. */
export function QualitySection({ value: q, effective, reduced, error, onChange }: { value: QualityParams; effective: number | null; reduced: boolean; error: (field: string) => string | undefined; onChange: (p: Partial<QualityParams>) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  return (
    <Section title={t('keychain.quality.title')} summary={effective ? `${formatLength(effective, unit)} ${t(`units.${unit}`)}` : undefined} defaultOpen={false} onReset={() => onChange({ ...defaultKeychain.quality })}>
      <LengthField label={t('keychain.quality.cell')} value={q.cell} min={0.05} max={2} step={0.05} error={error('quality.cell')} onChange={(v) => onChange({ cell: v })} />
      <NumberField label={t('keychain.quality.budget')} value={q.maxTriangles} min={20000} max={2000000} step={50000} digits={0} error={error('quality.maxTriangles')} onChange={(v) => onChange({ maxTriangles: v })} />
      {reduced && effective && <Banner kind="warn">{t('keychain.quality.reduced', { cell: formatLength(effective, unit), u: t(`units.${unit}`) })}</Banner>}
    </Section>
  )
}
