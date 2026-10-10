import { useEffect, useState } from 'react'
import type { Manifold } from 'manifold-3d'
import wasmUrl from 'manifold-3d/manifold.wasm?url'
import { useTranslation } from 'react-i18next'
import { buildBaseplate, defaultParams, type BaseplateParams } from '../../geometry/baseplate'
import { usePersistedState } from '../../app/usePersistedState'
import { recordSession } from '../../app/lastSession'
import { Workspace } from '../../app/Workspace'
import { BaseplatePanel } from './BaseplatePanel'
import { ExportBlock } from './ExportBlock'

const PARAMS_KEY = 'gridfinity.baseplate'

export function BaseplateMode() {
  const { t } = useTranslation()
  const [p, setP] = usePersistedState<BaseplateParams>(PARAMS_KEY, defaultParams)
  const [model, setModel] = useState<Manifold | null>(null)
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    recordSession('baseplate', p.customSize ? `${p.sizeX} × ${p.sizeY} ${t('units.mm')}` : `${p.x} × ${p.y}`)
    let cancelled = false
    setBusy(true)
    const timer = setTimeout(() => {
      buildBaseplate(p, wasmUrl).then((m) => { if (!cancelled) { setModel(m); setBusy(false) } })
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [p, t])

  return (
    <Workspace
      model={model} busy={busy}
      plate={p.showPlate ? { x: p.plateX, y: p.plateY } : null}
      panel={<BaseplatePanel params={p} onChange={setP} />}
      footer={<ExportBlock model={model} busy={busy} name={`baseplate_${p.x}x${p.y}`} />}
    />
  )
}
