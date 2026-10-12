import { useTranslation } from 'react-i18next'
import { defaultKeychain, type SizeMode, type SizeParams } from '../../geometry/keychain'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { LengthField } from '../../ui/LengthField'
import { formatLength, useUnit } from '../../ui/units'

/** Размер в мм: по длинной стороне, по ширине или высоте (пропорции сохраняются) или точно «ширина × высота». */
export function SizeSection({ value: s, resolved, error, onChange }: { value: SizeParams; resolved: [number, number] | null; error: (field: string) => string | undefined; onChange: (p: Partial<SizeParams>) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const summary = resolved ? `${formatLength(resolved[0], unit)} × ${formatLength(resolved[1], unit)} ${t(`units.${unit}`)}` : undefined
  const modes: SizeMode[] = ['longest', 'width', 'height', 'box']
  return (
    <Section title={t('keychain.size.title')} summary={summary} modified={isChanged(s, defaultKeychain.size)} onReset={() => onChange({ ...defaultKeychain.size })}>
      <SegmentedControl fill ariaLabel={t('keychain.size.mode')} value={s.mode} onChange={(v: SizeMode) => onChange({ mode: v })}
        options={modes.map((m) => ({ value: m, label: t(`keychain.size.modes.${m}`) }))} />
      {s.mode === 'longest' && <LengthField label={t('keychain.size.longest')} value={s.longest} min={5} max={400} step={1} error={error('size.longest')} onChange={(v) => onChange({ longest: v })} />}
      {(s.mode === 'width' || s.mode === 'box') && <LengthField label={t('keychain.size.width')} value={s.width} min={5} max={400} step={1} error={error('size.width')} onChange={(v) => onChange({ width: v })} />}
      {(s.mode === 'height' || s.mode === 'box') && <LengthField label={t('keychain.size.height')} value={s.height} min={5} max={400} step={1} error={error('size.height')} onChange={(v) => onChange({ height: v })} />}
      <span className="text-xs text-text-subtle">{t(s.mode === 'box' ? 'keychain.size.hintBox' : 'keychain.size.hint')}</span>
    </Section>
  )
}
