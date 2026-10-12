import { useTranslation } from 'react-i18next'
import { defaultKeychain, type DetailParams } from '../../geometry/keychain'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { formatLength, useUnit } from '../../ui/units'

/** Хребет вдоль срединной оси и канавка у кромки; размеры в миллиметрах. */
export function DetailSection({ value: d, error, onChange }: { value: DetailParams; error: (field: string) => string | undefined; onChange: (p: Partial<DetailParams>) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const on = d.spineAmp > 0 || d.grooveDepth > 0
  const summary = on ? t('keychain.detail.summary', { s: formatLength(d.spineAmp, unit), g: formatLength(d.grooveDepth, unit), u: t(`units.${unit}`) }) : t('keychain.detail.off')
  return (
    <Section title={t('keychain.detail.title')} summary={summary} modified={isChanged(d, defaultKeychain.detail)} onReset={() => onChange({ ...defaultKeychain.detail })}>
      <LengthField label={t('keychain.detail.spineAmp')} value={d.spineAmp} min={0} max={5} step={0.05} error={error('detail.spineAmp')} onChange={(v) => onChange({ spineAmp: v })} />
      {d.spineAmp > 0 && <LengthField label={t('keychain.detail.spineWidth')} value={d.spineWidth} min={0.1} max={5} step={0.05} error={error('detail.spineWidth')} onChange={(v) => onChange({ spineWidth: v })} />}
      <LengthField label={t('keychain.detail.grooveDepth')} value={d.grooveDepth} min={0} max={5} step={0.05} error={error('detail.grooveDepth')} onChange={(v) => onChange({ grooveDepth: v })} />
      {d.grooveDepth > 0 && (
        <>
          <LengthField label={t('keychain.detail.grooveWidth')} value={d.grooveWidth} min={0.1} max={5} step={0.05} error={error('detail.grooveWidth')} onChange={(v) => onChange({ grooveWidth: v })} />
          <LengthField label={t('keychain.detail.grooveOffset')} value={d.grooveOffset} min={0} max={20} step={0.1} onChange={(v) => onChange({ grooveOffset: v })} />
        </>
      )}
    </Section>
  )
}
