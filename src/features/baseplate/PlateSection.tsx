import { useTranslation } from 'react-i18next'
import { baseplateLayout, type BaseplateGeometry, type BaseplatePreview } from '../../geometry/baseplate'
import { Section } from '../../ui/Section'
import { LengthField } from '../../ui/LengthField'
import { Toggle } from '../../ui/Toggle'
import { Select } from '../../ui/Select'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'
import { BED_PRESETS, fitsBed, presetFor } from './bedPresets'

const CUSTOM = 'custom'

/** Стол принтера в превью: показ, размеры, пресеты и предупреждение, если плита не помещается. */
export function PlateSection({ geometry: g, preview, onChange }: { geometry: BaseplateGeometry; preview: BaseplatePreview; onChange: (p: BaseplatePreview) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const { sizeX: sx, sizeY: sy } = baseplateLayout(g)
  const fmt = (x: number, y: number) => `${formatLength(x, unit)} × ${formatLength(y, unit)} ${t(`units.${unit}`)}`
  const fits = fitsBed(sx, sy, preview.plateX, preview.plateY)
  const preset = presetFor(preview.plateX, preview.plateY)?.id ?? CUSTOM
  const options = [...BED_PRESETS.map((p) => ({ value: p.id, label: `${p.x} × ${p.y} mm` })), { value: CUSTOM, label: t('baseplate.plate.custom') }]

  return (
    <Section title={t('baseplate.plate.title')} defaultOpen={preview.showPlate} summary={preview.showPlate ? fmt(preview.plateX, preview.plateY) : undefined}
      onReset={() => onChange({ showPlate: false, plateX: 256, plateY: 256 })}>
      <Toggle label={t('baseplate.plate.show')} checked={preview.showPlate} onChange={(v) => onChange({ ...preview, showPlate: v })} />
      {preview.showPlate && (
        <>
          <Select label={t('baseplate.plate.preset')} value={preset} options={options} onChange={(id) => {
            const p = BED_PRESETS.find((b) => b.id === id)
            if (p) onChange({ ...preview, plateX: p.x, plateY: p.y })
          }} />
          <div className="grid grid-cols-2 gap-2">
            <LengthField label={t('baseplate.plate.x')} value={preview.plateX} min={50} max={1000} onChange={(v) => onChange({ ...preview, plateX: v })} />
            <LengthField label={t('baseplate.plate.y')} value={preview.plateY} min={50} max={1000} onChange={(v) => onChange({ ...preview, plateY: v })} />
          </div>
          {fits
            ? <span className="text-xs text-success-text">{t('baseplate.plate.fits')}</span>
            : <Banner kind="warn">{t('baseplate.plate.oversize', { size: fmt(sx, sy), plate: fmt(preview.plateX, preview.plateY) })}</Banner>}
        </>
      )}
    </Section>
  )
}
