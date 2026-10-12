import { defaultKeychain } from '../../geometry/keychain'

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** Состояние режима: параметры геометрии и подпись изображения (сами пиксели лежат в IndexedDB). */
export interface KeychainState { imageName: string; [k: string]: unknown }

/** Донаполняет сохранённое: вложенные объекты сливаются с умолчаниями, список открытых дырок и порог приводятся к допустимому виду. */
export function migrateKeychain(raw: Record<string, unknown>): Record<string, unknown> {
  const sil = { ...defaultKeychain.silhouette, ...obj(raw.silhouette) }
  if (!Array.isArray(sil.keepOpen)) sil.keepOpen = []
  else sil.keepOpen = (sil.keepOpen as unknown[]).filter((n): n is number => Number.isInteger(n))
  if (sil.threshold !== 'auto' && !(typeof sil.threshold === 'number' && Number.isFinite(sil.threshold))) sil.threshold = 'auto'
  return {
    ...raw,
    imageId: typeof raw.imageId === 'string' ? raw.imageId : '',
    imageName: typeof raw.imageName === 'string' ? raw.imageName : '',
    silhouette: sil,
    size: { ...defaultKeychain.size, ...obj(raw.size) },
    relief: { ...defaultKeychain.relief, ...obj(raw.relief) },
    base: { ...defaultKeychain.base, ...obj(raw.base) },
    quality: { ...defaultKeychain.quality, ...obj(raw.quality) },
  }
}
