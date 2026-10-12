import { useTranslation } from 'react-i18next'
import { defaultKeychain, type QualityParams } from '../../geometry/keychain'
import { Section } from '../../ui/Section'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'

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
