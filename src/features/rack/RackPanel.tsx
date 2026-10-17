import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { defaultRackPanel, validateRackPanel, type RackPanelParams } from '../../geometry/rack/panel'
import { Banner } from '../../ui/Banner'
import { SizeSection } from './SizeSection'
import { EarsSection } from './EarsSection'
import { PatternSection } from './PatternSection'
import { BackSection } from './BackSection'

export type PanelPatch = (f: (o: RackPanelParams) => RackPanelParams) => void

/** Панель параметров режима «Панель» Rack Master: размер, уши, узор, задняя стенка. */
export function RackPanel({ params: p, onChange, buildError = null }: { params: RackPanelParams; onChange: Dispatch<SetStateAction<RackPanelParams>>; buildError?: string | null }) {
  const { t } = useTranslation()
  const { errors, warnings } = validateRackPanel(p)
  const d = defaultRackPanel
  return (
    <>
      <SizeSection params={p} defaults={d} errors={errors} update={onChange} />
      <EarsSection params={p} defaults={d} errors={errors} update={onChange} />
      <PatternSection params={p} defaults={d} errors={errors} warnings={warnings} buildError={buildError} update={onChange} />
      <BackSection params={p} defaults={d} errors={errors} update={onChange} />
      {errors.length > 0 && <Banner kind="warn">{t('rack.error.invalid')}</Banner>}
    </>
  )
}
