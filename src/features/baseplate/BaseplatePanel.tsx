import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { defaultParams, type BaseplateParams } from '../../geometry/baseplate'
import { Section } from '../../ui/Section'
import { NumberField } from '../../ui/NumberField'
import { LengthField } from '../../ui/LengthField'
import { Toggle } from '../../ui/Toggle'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'

const FLOOR_MM = 4

export function BaseplatePanel({ params: p, onChange }: { params: BaseplateParams; onChange: Dispatch<SetStateAction<BaseplateParams>> }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const set = <K extends keyof BaseplateParams>(k: K, v: BaseplateParams[K]) => onChange((o) => ({ ...o, [k]: v }))
  const reset = (...keys: (keyof BaseplateParams)[]) => onChange((o) => ({ ...o, ...Object.fromEntries(keys.map((k) => [k, defaultParams[k]])) }))
  const fasteners = p.magnets && p.screws ? 'both' : p.magnets ? 'magnets' : p.screws ? 'screws' : 'none'

  return (
    <>
      <Section title={t('baseplate.size.title')} summary={p.customSize ? undefined : `${p.x} × ${p.y} ${t('units.cells')}`}
        onReset={() => reset('unit', 'x', 'y', 'customSize', 'sizeX', 'sizeY')}>
        <LengthField label={t('baseplate.size.unit')} value={p.unit} min={20} max={60} onChange={(v) => set('unit', v)} />
        {!p.customSize && (
          <div className="grid grid-cols-2 gap-2">
            <NumberField stepper label={t('baseplate.size.x')} unit={t('units.cells')} value={p.x} min={1} max={20} digits={0} onChange={(v) => set('x', v)} />
            <NumberField stepper label={t('baseplate.size.y')} unit={t('units.cells')} value={p.y} min={1} max={20} digits={0} onChange={(v) => set('y', v)} />
          </div>
        )}
        <Toggle label={t('baseplate.size.custom')} checked={p.customSize} onChange={(v) => set('customSize', v)} />
        {p.customSize && (
          <div className="grid grid-cols-2 gap-2">
            <LengthField label={t('baseplate.size.width')} value={p.sizeX} min={p.unit} max={600} onChange={(v) => set('sizeX', v)} />
            <LengthField label={t('baseplate.size.depth')} value={p.sizeY} min={p.unit} max={600} onChange={(v) => set('sizeY', v)} />
          </div>
        )}
      </Section>
      <Section title={t('baseplate.fasteners.title')} summary={t(`baseplate.fasteners.summary.${fasteners}`)} onReset={() => reset('magnets', 'screws')}>
        <Toggle label={t('baseplate.fasteners.magnets')} checked={p.magnets} onChange={(v) => set('magnets', v)} />
        <Toggle label={t('baseplate.fasteners.screws')} checked={p.screws} onChange={(v) => set('screws', v)} />
        {fasteners !== 'none' && <Banner>{t('baseplate.fasteners.floorNote', { value: `${formatLength(FLOOR_MM, unit)} ${t(`units.${unit}`)}` })}</Banner>}
      </Section>
      <Section title={t('baseplate.plate.title')} defaultOpen={p.showPlate} onReset={() => reset('showPlate', 'plateX', 'plateY')}>
        <Toggle label={t('baseplate.plate.show')} checked={p.showPlate} onChange={(v) => set('showPlate', v)} />
        {p.showPlate && (
          <div className="grid grid-cols-2 gap-2">
            <LengthField label={t('baseplate.plate.x')} value={p.plateX} min={50} max={1000} onChange={(v) => set('plateX', v)} />
            <LengthField label={t('baseplate.plate.y')} value={p.plateY} min={50} max={1000} onChange={(v) => set('plateY', v)} />
          </div>
        )}
      </Section>
    </>
  )
}
