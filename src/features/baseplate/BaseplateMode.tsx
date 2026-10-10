import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { axisMm, baseplateLayout, defaultParams, validateBaseplate, type BaseplateGeometry, type BaseplateParams } from '../../geometry/baseplate'
import { usePersistedState } from '../../app/usePersistedState'
import { useModel } from '../../app/useModel'
import { recordSession } from '../../app/lastSession'
import { Workspace } from '../../app/Workspace'
import { migrateBaseplate } from './migrate'
import { BaseplatePanel } from './BaseplatePanel'
import { ExportBlock } from './ExportBlock'

const PARAMS_KEY = 'gridfinity.baseplate'

export function BaseplateMode() {
  const { t } = useTranslation()
  const [p, setP] = usePersistedState<BaseplateParams>(PARAMS_KEY, defaultParams, migrateBaseplate)
  // перестраиваем модель только при изменении геометрии: стол в превью её не трогает
  const geometry = useMemo<BaseplateGeometry>(() => ({ pitch: p.pitch, x: p.x, y: p.y, thickness: p.thickness, fasteners: p.fasteners }), [p.pitch, p.x, p.y, p.thickness, p.fasteners])
  const valid = validateBaseplate(geometry).ok
  const { mesh, busy, pending } = useModel('baseplate', geometry, { enabled: valid })
  const { sizeX, sizeY } = baseplateLayout(geometry)

  useEffect(() => {
    const units = p.x.mode === 'units' && p.y.mode === 'units'
    recordSession('baseplate', units ? `${p.x.value} × ${p.y.value}` : `${axisMm(p.x, p.pitch)} × ${axisMm(p.y, p.pitch)} ${t('units.mm')}`)
  }, [p.x, p.y, p.pitch, t])

  return (
    <Workspace
      model={mesh} busy={busy}
      plate={p.preview.showPlate ? { x: p.preview.plateX, y: p.preview.plateY } : null}
      panel={<BaseplatePanel params={p} onChange={setP} />}
      footer={<ExportBlock model={mesh} busy={pending} name={`baseplate_${Math.round(sizeX)}x${Math.round(sizeY)}`} />}
    />
  )
}
