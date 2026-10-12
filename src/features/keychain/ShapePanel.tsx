import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { validateKeychain, type KeychainInfo, type KeychainParams } from '../../geometry/keychain'
import type { ShapeParams } from '../../geometry/shapes'
import { Banner } from '../../ui/Banner'
import { SharedSections } from './SharedSections'
import { ShapeSection } from './ShapeSection'
import { RimSection } from './RimSection'
import { defaultShapeState, type ShapeState } from './shapeState'

/** Панель режима «Форма»: фигура, бортик, затем общие секции (рельеф … разрешение). Секций изображения нет. */
export function ShapePanel({ state, params, info, onChange }: { state: ShapeState; params: KeychainParams; info: KeychainInfo | null; onChange: Dispatch<SetStateAction<ShapeState>> }) {
  const { t } = useTranslation()
  const { errors } = validateKeychain(params)
  const err = (field: string) => { const e = errors.find((x) => x.field === field); return e ? t(e.key) : undefined }
  const patchShape = (v: Partial<ShapeParams>) => onChange((o) => ({ ...o, shape: { ...o.shape, ...v } }))
  const patchRim = (v: Partial<ShapeParams['rim']>) => onChange((o) => ({ ...o, shape: { ...o.shape, rim: { ...o.shape.rim, ...v } } }))
  const otherError = info?.error && info.error !== 'keychain.error.plateTooSmall' ? info.error : null
  return (
    <>
      {otherError && <div className="px-4 pt-3"><Banner kind="warn">{t(otherError)}</Banner></div>}
      <ShapeSection value={state.shape} error={err} onChange={patchShape} />
      <RimSection value={state.shape.rim} error={err} onChange={patchRim} />
      <SharedSections params={params} info={info} onChange={onChange} imageOnly={false} defaults={defaultShapeState} />
    </>
  )
}
