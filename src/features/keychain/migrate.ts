import { defaultKeychain } from '../../geometry/keychain'
import { PATTERN_KINDS } from '../../geometry/patterns/fields'
import { PROFILE_KINDS } from '../../geometry/patterns/profile'

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** Состояние режима: параметры геометрии и подпись изображения (сами пиксели лежат в IndexedDB). */
export interface KeychainState { imageName: string; [k: string]: unknown }

/** Донаполняет сохранённое: вложенные объекты сливаются с умолчаниями (старые записи без источника, деталей и узора получают значения по умолчанию), список открытых дырок, порог и перечисления приводятся к допустимому виду. */
export function migrateKeychain(raw: Record<string, unknown>): Record<string, unknown> {
  const sil = { ...defaultKeychain.silhouette, ...obj(raw.silhouette) }
  if (!Array.isArray(sil.keepOpen)) sil.keepOpen = []
  else sil.keepOpen = (sil.keepOpen as unknown[]).filter((n): n is number => Number.isInteger(n))
  if (sil.threshold !== 'auto' && !(typeof sil.threshold === 'number' && Number.isFinite(sil.threshold))) sil.threshold = 'auto'
  const relief = { ...defaultKeychain.relief, ...obj(raw.relief) }
  if (!PROFILE_KINDS.includes(relief.profile)) relief.profile = defaultKeychain.relief.profile
  const source = { ...defaultKeychain.source, ...obj(raw.source) }
  if (source.kind !== 'distance' && source.kind !== 'brightness') source.kind = 'distance'
  // сглаживание: старые записи без полей остаются на 0 (модель не меняется), мусор приводится к 0
  const num0 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  source.smooth = num0(source.smooth)
  source.despeckle = source.despeckle === true
  relief.smooth = num0(relief.smooth)
  const pattern = { ...defaultKeychain.pattern, ...obj(raw.pattern) }
  if (!PATTERN_KINDS.includes(pattern.kind)) pattern.kind = 'none'
  if (pattern.scope !== 'relief' && pattern.scope !== 'plateau' && pattern.scope !== 'base') pattern.scope = 'relief'
  const mount = { ...defaultKeychain.mount, ...obj(raw.mount) }
  if (!['none', 'hole', 'eyelet', 'channel'].includes(mount.style)) mount.style = 'none'
  const split = { ...defaultKeychain.split, ...obj(raw.split) }
  // положения штифтов: массив точек с конечными x и y, иначе автоматически
  split.pinPositions = Array.isArray(split.pinPositions) && (split.pinPositions as unknown[]).every((q) => { const o = obj(q); return Number.isFinite(o.x) && Number.isFinite(o.y) })
    ? (split.pinPositions as { x: number; y: number }[]) : null
  return {
    ...raw,
    origin: { kind: 'image' }, // режим «Изображение»: фигура живёт в своём состоянии (keychain.shape)
    imageId: typeof raw.imageId === 'string' ? raw.imageId : '',
    imageName: typeof raw.imageName === 'string' ? raw.imageName : '',
    silhouette: sil,
    size: { ...defaultKeychain.size, ...obj(raw.size) },
    source,
    relief,
    detail: { ...defaultKeychain.detail, ...obj(raw.detail) },
    pattern,
    mount,
    split,
    base: { ...defaultKeychain.base, ...obj(raw.base) },
    quality: { ...defaultKeychain.quality, ...obj(raw.quality) },
  }
}
