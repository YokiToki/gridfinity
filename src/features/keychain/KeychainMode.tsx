import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { usePersistedState } from '../../app/usePersistedState'
import { recordSession } from '../../app/lastSession'
import { Workspace } from '../../app/Workspace'
import { defaultKeychain, type KeychainParams } from '../../geometry/keychain'
import type { GrayImage } from '../../geometry/raster/threshold'
import { ExportPanel } from '../export/ExportPanel'
import { formatLength, useUnit } from '../../ui/units'
import { decodeImage, ImageError } from './decodeImage'
import { openImageStore, type ImageStore } from './imageStore'
import { migrateKeychain } from './migrate'
import { KeychainPanel } from './KeychainPanel'
import { MaskPreview } from './MaskPreview'
import type { ImageNotice } from './ImageSection'
import { useKeychainModel } from './useKeychainModel'

const KEY = 'keychain.relief'
type State = KeychainParams & { imageName: string }
const defaults: State = { ...defaultKeychain, imageName: '' }

let counter = 0
const newImageId = () => `img${Date.now().toString(36)}${(counter++).toString(36)}`

/** Keychain Master: изображение → силуэт → рельеф с подложкой. Параметры под ключом keychain.relief, пиксели изображения в IndexedDB. */
export function KeychainMode() {
  const { t } = useTranslation()
  const [state, setState] = usePersistedState<State>(KEY, defaults, migrateKeychain)
  const { imageName, ...rest } = state
  const key = JSON.stringify(rest)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const params = useMemo<KeychainParams>(() => rest, [key])
  const [image, setImage] = useState<GrayImage | null>(null)
  const [notice, setNotice] = useState<ImageNotice | null>(null)
  const store = useRef<ImageStore | null>(null)

  // при открытии: хранилище и сохранённое изображение
  useEffect(() => {
    let cancelled = false
    void (async () => {
      store.current = await openImageStore()
      if (!params.imageId) return
      const saved = await store.current.load(params.imageId)
      if (cancelled) return
      if (saved) setImage(saved)
      else { setNotice({ kind: 'warn', text: t('keychain.image.lost') }); setState((o) => ({ ...o, imageId: '', imageName: '' })) }
    })()
    return () => { cancelled = true }
    // только при открытии режима
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFile = useCallback(async (file: File) => {
    setNotice({ kind: 'info', text: t('keychain.image.loading', { name: file.name }) })
    try {
      const decoded = await decodeImage(file)
      const id = newImageId()
      const old = params.imageId
      await store.current?.save(id, decoded.image)
      if (old) void store.current?.remove(old)
      setImage(decoded.image)
      setState((o) => ({ ...o, imageId: id, imageName: file.name, silhouette: { ...o.silhouette, keepOpen: [] } }))
      const warns: string[] = []
      if (decoded.downscaled) warns.push(t('keychain.image.downscaled', { w: decoded.original.width, h: decoded.original.height, nw: decoded.image.width, nh: decoded.image.height }))
      if (store.current && !store.current.persistent) warns.push(t('keychain.image.notPersisted'))
      setNotice(warns.length ? { kind: 'warn', text: warns.join(' ') } : null)
    } catch (e) {
      const code = e instanceof ImageError ? e.code : 'decode'
      setNotice({ kind: 'error', text: t(`keychain.image.${code}`) })
    }
  }, [params.imageId, setState, t])

  const { model, info, busy, pending } = useKeychainModel(params, image)
  const size = info?.size

  useEffect(() => { if (size) recordSession(null, `${size[0].toFixed(0)} × ${size[1].toFixed(0)} ${t('units.mm')}`, 'keychain') }, [size, t])

  const onDrop = (e: DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void onFile(f) }
  const name = size ? `keychain_${Math.round(size[0])}x${Math.round(size[1])}` : 'keychain'
  return (
    <div className="flex min-h-0 flex-1" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <Workspace
        model={model} busy={busy}
        overlay={image ? <MaskPreview preview={info?.preview ?? null} /> : null}
        panel={<KeychainPanel params={params} onChange={setState} imageName={imageName} hasImage={!!image} info={info} notice={notice} onFile={(f) => void onFile(f)} />}
        footer={<><ExportPanel model={model} busy={pending} name={name} /><SheetSize sheet={info?.mountInfo?.sheet} /></>}
      />
    </div>
  )
}

/** Размер листа печати (две половины и штифты) под кнопками экспорта. */
function SheetSize({ sheet }: { sheet?: { w: number; h: number } }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  if (!sheet) return null
  return <span className="mt-2 block text-xs text-text-muted" data-testid="sheet-size">{t('keychain.split.sheet', { w: formatLength(sheet.w, unit), h: formatLength(sheet.h, unit), u: t(`units.${unit}`) })}</span>
}
