import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { validateKeychain, type KeychainInfo, type KeychainParams } from '../../geometry/keychain'
import { Banner } from '../../ui/Banner'
import { ImageSection, type ImageNotice } from './ImageSection'
import { SilhouetteSection } from './SilhouetteSection'
import { SizeSection } from './SizeSection'
import { ReliefSection, QualitySection } from './ReliefSection'
import { BaseSection } from './BaseSection'

export interface KeychainPanelProps {
  params: KeychainParams
  onChange: Dispatch<SetStateAction<KeychainParams & { imageName: string }>>
  imageName: string
  hasImage: boolean
  info: KeychainInfo | null
  notice: ImageNotice | null
  onFile: (f: File) => void
}

/** Панель Keychain: изображение, силуэт, размер, рельеф, подложка, разрешение. Макета нет: собрана из компонентов ui/. */
export function KeychainPanel({ params: p, onChange, imageName, hasImage, info, notice, onFile }: KeychainPanelProps) {
  const { t } = useTranslation()
  const { errors } = validateKeychain(p)
  const err = (field: string) => { const e = errors.find((x) => x.field === field); return e ? t(e.key) : undefined }
  const patch = <K extends 'silhouette' | 'size' | 'relief' | 'base' | 'quality'>(k: K) => (v: Partial<KeychainParams[K]>) => onChange((o) => ({ ...o, [k]: { ...o[k], ...v } }))
  const plateError = info?.error === 'keychain.error.plateTooSmall' ? info.error : null
  const otherError = info?.error && info.error !== 'keychain.error.plateTooSmall' && info.error !== 'keychain.error.noImage' ? info.error : null

  return (
    <>
      <ImageSection name={imageName} notice={notice} onFile={onFile} photoLike={!!info?.photoLike} />
      {!hasImage ? (
        <div className="p-4"><Banner>{t('keychain.empty')}</Banner></div>
      ) : (
        <>
          {otherError && <div className="px-4 pt-3"><Banner kind="warn">{t(otherError)}</Banner></div>}
          <SilhouetteSection value={p.silhouette} threshold={info?.threshold ?? null} preview={info?.preview ?? null} onChange={patch('silhouette')} />
          <SizeSection value={p.size} resolved={info?.size ?? null} error={err} onChange={patch('size')} />
          <ReliefSection value={p.relief} error={err} onChange={patch('relief')} />
          <BaseSection value={p.base} error={err} plateError={plateError} onChange={patch('base')} />
          <QualitySection value={p.quality} effective={info?.cell ?? null} reduced={!!info?.reduced} error={err} onChange={patch('quality')} />
        </>
      )}
    </>
  )
}
