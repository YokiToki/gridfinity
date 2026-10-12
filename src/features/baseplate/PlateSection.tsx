import { useTranslation } from 'react-i18next'
import { baseplateLayout, type BaseplateCore, type BaseplatePreview } from '../../geometry/baseplate'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { Toggle } from '../../ui/Toggle'
import { PrinterFields } from '../export/PrinterFields'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'
import { fitsBed } from './bedPresets'
import { bedOf, useExportSettings } from '../../export/settings'

/** Стол принтера в превью: показ, выбор принтера (общий для режимов) и предупреждение, если плита не помещается. Размер стола приходит из настроек принтера. */
export function PlateSection({ geometry: g, preview, onChange }: { geometry: BaseplateCore; preview: BaseplatePreview; onChange: (p: BaseplatePreview) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const [ex] = useExportSettings()
  const bed = bedOf(ex)
  const { sizeX: sx, sizeY: sy } = baseplateLayout(g)
  const fmt = (x: number, y: number) => `${formatLength(x, unit)} × ${formatLength(y, unit)} ${t(`units.${unit}`)}`
  const fits = fitsBed(sx, sy, bed.x, bed.y)

  return (
    <Section title={t('baseplate.plate.title')} modified={isChanged(preview.showPlate, false)} summary={preview.showPlate ? fmt(bed.x, bed.y) : undefined}
      onReset={() => onChange({ ...preview, showPlate: false })}>
      <Toggle label={t('baseplate.plate.show')} checked={preview.showPlate} onChange={(v) => onChange({ ...preview, showPlate: v })} />
      {preview.showPlate && (
        <>
          <PrinterFields />
          {fits
            ? <span className="text-xs text-success-text">{t('baseplate.plate.fits')}</span>
            : <Banner kind="warn">{t('baseplate.plate.oversize', { size: fmt(sx, sy), plate: fmt(bed.x, bed.y) })}</Banner>}
        </>
      )}
    </Section>
  )
}
