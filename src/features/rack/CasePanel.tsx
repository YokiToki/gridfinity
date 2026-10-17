import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { defaultRackCase, validateRackCase, type RackCaseParams } from '../../geometry/rack/case'
import { Banner } from '../../ui/Banner'
import { CaseDeviceSection } from './CaseDeviceSection'
import { CaseShellSection } from './CaseShellSection'
import { CaseFrontSection } from './CaseFrontSection'
import { CaseVentsSection } from './CaseVentsSection'
import { EarsSection } from './EarsSection'

export type CasePatch = (f: (o: RackCaseParams) => RackCaseParams) => void

/** Панель параметров режима «Корпус» Rack Master: устройство, оболочка, передняя панель, уши, вентиляция. */
export function CasePanel({ params: p, onChange }: { params: RackCaseParams; onChange: Dispatch<SetStateAction<RackCaseParams>> }) {
  const { t } = useTranslation()
  const { errors, warnings, excess } = validateRackCase(p)
  const d = defaultRackCase
  return (
    <>
      <CaseDeviceSection params={p} defaults={d} errors={errors} excess={excess} update={onChange} />
      <CaseShellSection params={p} defaults={d} errors={errors} update={onChange} />
      <CaseFrontSection params={p} defaults={d} errors={errors} warnings={warnings} update={onChange} />
      <EarsSection ears={p.ears} defaults={d.ears} errors={errors} onChange={(ears) => onChange((o) => ({ ...o, ears }))} />
      <CaseVentsSection params={p} defaults={d} errors={errors} warnings={warnings} update={onChange} />
      {errors.length > 0 && <Banner kind="warn">{t('rack.case.error.invalid')}</Banner>}
    </>
  )
}
