import { useTranslation } from 'react-i18next'
import { PANEL_LIMITS, type EarParams, type RackPanelParams } from '../../geometry/rack/panel'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { Banner } from '../../ui/Banner'
import type { PanelPatch } from './RackPanel'

/** Отверстия в ушах: положения, форма и размер. */
export function EarsSection({ params: p, defaults, errors, update }: { params: RackPanelParams; defaults: RackPanelParams; errors: string[]; update: PanelPatch }) {
  const { t } = useTranslation()
  const e = p.ears
  const set = (patch: Partial<EarParams>) => update((o) => ({ ...o, ears: { ...o.ears, ...patch } }))
  const err = (key: string) => (errors.includes(key) ? t(key) : undefined)
  const summary = e.positions === 'none' ? t('rack.ears.none') : t('rack.ears.summary', { shape: t(`rack.ears.${e.shape}`), positions: t(`rack.ears.${e.positions}`) })
  return (
    <Section title={t('rack.ears.title')} summary={summary} modified={isChanged(e, defaults.ears)} onReset={() => update((o) => ({ ...o, ears: defaults.ears }))}>
      <SegmentedControl fill ariaLabel={t('rack.ears.positions')} value={e.positions} onChange={(v) => set({ positions: v })}
        options={(['all', 'outer', 'none'] as const).map((v) => ({ value: v, label: t(`rack.ears.${v}`) }))} />
      {e.positions !== 'none' && (
        <>
          <SegmentedControl fill ariaLabel={t('rack.ears.shape')} value={e.shape} onChange={(v) => set({ shape: v })}
            options={(['round', 'slot'] as const).map((v) => ({ value: v, label: t(`rack.ears.${v}`) }))} />
          <div className="grid grid-cols-2 gap-2">
            <LengthField label={e.shape === 'round' ? t('rack.ears.diameter') : t('rack.ears.width')} value={e.size} min={PANEL_LIMITS.earSize[0]} max={PANEL_LIMITS.earSize[1]} step={0.1} error={err('rack.error.earSize')} onChange={(v) => set({ size: v })} />
            {e.shape === 'slot' && <LengthField label={t('rack.ears.slotLength')} value={e.slotLength} min={PANEL_LIMITS.earSize[0]} max={30} step={0.5} error={err('rack.error.slotLength')} onChange={(v) => set({ slotLength: v })} />}
          </div>
        </>
      )}
      <Banner>{t('rack.ears.help')}</Banner>
    </Section>
  )
}
