import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { defaultParams, type BaseplateParams } from '../../geometry/baseplate'
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
  const { mesh, busy, pending } = useModel('baseplate', p)

  useEffect(() => {
    recordSession('baseplate', p.customSize ? `${p.sizeX} × ${p.sizeY} ${t('units.mm')}` : `${p.x} × ${p.y}`)
  }, [p, t])

  return (
    <Workspace
      model={mesh} busy={busy}
      plate={p.showPlate ? { x: p.plateX, y: p.plateY } : null}
      panel={<BaseplatePanel params={p} onChange={setP} />}
      footer={<ExportBlock model={mesh} busy={pending} name={`baseplate_${p.x}x${p.y}`} />}
    />
  )
}
