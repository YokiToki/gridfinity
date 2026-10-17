import { useTranslation } from 'react-i18next'
import { PANEL_LIMITS, type EarParams } from '../../geometry/rack/panel'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { Banner } from '../../ui/Banner'

/** Отверстия в ушах: положения, форма и размер. Общая для панели и корпуса: работает с EarParams, а не с параметрами режима. */
export function EarsSection({ ears: e, defaults, errors, onChange }: { ears: EarParams; defaults: EarParams; errors: string[]; onChange: (e: EarParams) => void }) {
  const { t } = useTranslation()
  const set = (patch: Partial<EarParams>) => onChange({ ...e, ...patch })
  const err = (key: string) => (errors.includes(key) ? t(key) : undefined)
  const summary = t('rack.ears.summary', { shape: t(`rack.ears.${e.shape}`), positions: t(`rack.ears.${e.positions}`) })
  return (
    <Section title={t('rack.ears.title')} summary={summary} modified={isChanged(e, defaults)} onReset={() => onChange(defaults)}>
      <SegmentedControl fill ariaLabel={t('rack.ears.positions')} value={e.positions} onChange={(v) => set({ positions: v })}
        options={(['all', 'outer', 'edges'] as const).map((v) => ({ value: v, label: t(`rack.ears.${v}`) }))} />
      <SegmentedControl fill ariaLabel={t('rack.ears.shape')} value={e.shape} onChange={(v) => set({ shape: v })}
        options={(['round', 'slot'] as const).map((v) => ({ value: v, label: t(`rack.ears.${v}`) }))} />
      <div className="grid grid-cols-2 gap-2">
        <LengthField label={e.shape === 'round' ? t('rack.ears.diameter') : t('rack.ears.width')} value={e.size} min={PANEL_LIMITS.earSize[0]} max={PANEL_LIMITS.earSize[1]} step={0.1} error={err('rack.error.earSize')} onChange={(v) => set({ size: v })} />
        {e.shape === 'slot' && <LengthField label={t('rack.ears.slotLength')} value={e.slotLength} min={PANEL_LIMITS.earSize[0]} max={30} step={0.5} error={err('rack.error.slotLength')} onChange={(v) => set({ slotLength: v })} />}
      </div>
      <Banner>{t('rack.ears.help')}</Banner>
    </Section>
  )
}
