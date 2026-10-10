import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { baseplateLayout, validateBaseplate, type BaseplateGeometry, type BaseplateParams } from '../../geometry/baseplate'
import { allPositions, needsFloor } from '../../geometry/fasteners'
import { FastenerSection } from '../fasteners/FastenerSection'
import { Banner } from '../../ui/Banner'
import { FLOOR } from '../../geometry/spec'
import { formatLength, useUnit } from '../../ui/units'
import { SizeSection } from './SizeSection'
import { ThicknessSection } from './ThicknessSection'
import { PlateSection } from './PlateSection'

export function BaseplatePanel({ params: p, onChange }: { params: BaseplateParams; onChange: Dispatch<SetStateAction<BaseplateParams>> }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const update = (f: (g: BaseplateGeometry) => BaseplateGeometry) => onChange((o) => ({ ...o, ...f(o) }))
  const { errors } = validateBaseplate(p)
  const { fp } = baseplateLayout(p)

  return (
    <>
      <SizeSection geometry={p} errors={errors} update={update} />
      <ThicknessSection geometry={p} errors={errors} update={update} />
      <FastenerSection config={p.fasteners} footprint={fp} onChange={(f) => onChange((o) => ({ ...o, fasteners: f }))}>
        {needsFloor(allPositions(p.fasteners, fp)) && <Banner>{t('fastener.floorNote', { value: `${formatLength(FLOOR, unit)} ${t(`units.${unit}`)}` })}</Banner>}
      </FastenerSection>
      <PlateSection geometry={p} preview={p.preview} onChange={(preview) => onChange((o) => ({ ...o, preview }))} />
    </>
  )
}
