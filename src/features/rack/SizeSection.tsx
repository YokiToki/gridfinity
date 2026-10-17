import { useTranslation } from 'react-i18next'
import { HEIGHT_TOLERANCE, MAX_UNITS, MIN_UNITS, RACK_UNIT, RACK_WIDTH } from '../../geometry/rack/spec'
import { PANEL_LIMITS, type RackPanelParams } from '../../geometry/rack/panel'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { Toggle } from '../../ui/Toggle'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'
import type { PanelPatch } from './RackPanel'

type Slice = Pick<RackPanelParams, 'units' | 'thickness' | 'cornerRadius' | 'tolerance'>
const pick = (p: RackPanelParams): Slice => ({ units: p.units, thickness: p.thickness, cornerRadius: p.cornerRadius, tolerance: p.tolerance })

/** Размер панели: юниты, толщина, скругление и допуск по высоте. */
export function SizeSection({ params: p, defaults, errors, update }: { params: RackPanelParams; defaults: RackPanelParams; errors: string[]; update: PanelPatch }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const fmt = (mm: number) => formatLength(mm, unit)
  const height = p.units * RACK_UNIT - (p.tolerance ? HEIGHT_TOLERANCE : 0)
  const err = (key: string) => (errors.includes(key) ? t(key) : undefined)
  return (
    <Section title={t('rack.size.title')} summary={t('rack.size.summary', { u: p.units, w: fmt(RACK_WIDTH), h: fmt(height) })}
      modified={isChanged(pick(p), pick(defaults))} onReset={() => update((o) => ({ ...o, ...pick(defaults) }))}>
      <NumberField label={t('rack.size.units')} value={p.units} min={MIN_UNITS} max={MAX_UNITS} digits={0} error={err('rack.error.units')} onChange={(v) => update((o) => ({ ...o, units: Math.round(v) }))} />
      <div className="grid grid-cols-2 gap-2">
        <LengthField label={t('rack.size.thickness')} value={p.thickness} min={PANEL_LIMITS.thickness[0]} max={PANEL_LIMITS.thickness[1]} step={0.1} error={err('rack.error.thickness')} onChange={(v) => update((o) => ({ ...o, thickness: v }))} />
        <LengthField label={t('rack.size.cornerRadius')} value={p.cornerRadius} min={PANEL_LIMITS.cornerRadius[0]} max={PANEL_LIMITS.cornerRadius[1]} step={0.5} error={err('rack.error.cornerRadius')} onChange={(v) => update((o) => ({ ...o, cornerRadius: v }))} />
      </div>
      <Toggle label={t('rack.size.tolerance')} checked={p.tolerance} onChange={(v) => update((o) => ({ ...o, tolerance: v }))} />
      <Banner>{t('rack.size.toleranceHelp')}</Banner>
    </Section>
  )
}
