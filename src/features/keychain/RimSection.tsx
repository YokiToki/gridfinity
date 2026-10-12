import { useTranslation } from 'react-i18next'
import { defaultRim, type RimParams } from '../../geometry/shapes'
import { Section } from '../../ui/Section'
import { Toggle } from '../../ui/Toggle'
import { LengthField } from '../../ui/LengthField'
import { formatLength, useUnit } from '../../ui/units'

/** Бортик: приподнятая кайма вдоль края фигуры (только режим «Форма»). Макета нет: собрана из компонентов ui/. */
export function RimSection({ value: r, error, onChange }: { value: RimParams; error: (field: string) => string | undefined; onChange: (p: Partial<RimParams>) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const summary = r.enabled ? t('keychain.rim.summary', { w: formatLength(r.width, unit), h: formatLength(r.height, unit), u: t(`units.${unit}`) }) : t('keychain.rim.off')
  return (
    <Section title={t('keychain.rim.title')} summary={summary} defaultOpen={false} onReset={() => onChange({ ...defaultRim })}>
      <Toggle label={t('keychain.rim.enabled')} checked={r.enabled} onChange={(v) => onChange({ enabled: v })} />
      {r.enabled && (
        <div className="grid grid-cols-2 gap-2">
          <LengthField label={t('keychain.rim.width')} value={r.width} min={0.2} max={20} step={0.2} error={error('shape.rim.width')} onChange={(v) => onChange({ width: v })} />
          <LengthField label={t('keychain.rim.height')} value={r.height} min={0} max={10} step={0.2} error={error('shape.rim.height')} onChange={(v) => onChange({ height: v })} />
        </div>
      )}
    </Section>
  )
}
