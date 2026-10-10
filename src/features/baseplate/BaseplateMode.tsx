import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { axisMm, baseplateLayout, defaultParams, toGeometry, validateBaseplate, type BaseplateParams } from '../../geometry/baseplate'
import { defaultSplit } from '../../geometry/split'
import { usePersistedState } from '../../app/usePersistedState'
import { useModel } from '../../app/useModel'
import { recordSession } from '../../app/lastSession'
import { Workspace } from '../../app/Workspace'
import { migrateBaseplate } from './migrate'
import { BaseplatePanel } from './BaseplatePanel'
import { ExportBlock } from '../../app/ExportBlock'

const PARAMS_KEY = 'gridfinity.baseplate'

export function BaseplateMode() {
  const { t } = useTranslation()
  const [p, setP] = usePersistedState<BaseplateParams>(PARAMS_KEY, defaultParams, migrateBaseplate)
  // перестраиваем модель только при изменении геометрии: стол, разнесённый вид и зазор её не трогают
  const raw = toGeometry(p)
  const candidate = raw.split.enabled ? raw : { ...raw, split: defaultSplit }
  const key = JSON.stringify(candidate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => candidate, [key])
  const valid = validateBaseplate(geometry).ok
  const { model, busy, pending } = useModel('baseplate', geometry, { enabled: valid })
  const { sizeX, sizeY } = baseplateLayout(geometry)

  useEffect(() => {
    const units = p.x.mode === 'units' && p.y.mode === 'units'
    recordSession('baseplate', units ? `${p.x.value} × ${p.y.value}` : `${axisMm(p.x, p.pitch)} × ${axisMm(p.y, p.pitch)} ${t('units.mm')}`)
  }, [p.x, p.y, p.pitch, t])

  return (
    <Workspace
      model={model} busy={busy}
      gap={p.split.enabled && p.split.exploded ? p.split.gap : 0}
      plate={p.preview.showPlate ? { x: p.preview.plateX, y: p.preview.plateY } : null}
      panel={<BaseplatePanel params={p} onChange={setP} />}
      footer={<ExportBlock model={model} busy={pending} name={`baseplate_${Math.round(sizeX)}x${Math.round(sizeY)}`} />}
    />
  )
}
