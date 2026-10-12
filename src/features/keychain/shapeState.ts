import { defaultKeychain, defaultSource, type KeychainParams } from '../../geometry/keychain'
import { migrateKeychain } from './migrate'
import type { SharedParams } from './SharedSections'

/** Состояние режима «Форма» (ключ keychain.shape): общая часть параметров; полей изображения здесь нет вовсе. */
export type ShapeState = SharedParams

/** Умолчания формы: плоский профиль, тонкий рельеф, подложка 1.6 мм по контуру фигуры. */
export const defaultShapeState: ShapeState = {
  source: defaultSource,
  relief: { ...defaultKeychain.relief, hmax: 1, heightFloor: 0.06, profile: 'flat' },
  detail: defaultKeychain.detail,
  pattern: defaultKeychain.pattern,
  base: { ...defaultKeychain.base, thickness: 1.6 },
  mount: defaultKeychain.mount,
  split: defaultKeychain.split,
  quality: defaultKeychain.quality,
}

const KEYS = Object.keys(defaultShapeState) as (keyof ShapeState)[]

/** Донаполняет сохранённое теми же правилами, что и Изображение (вложенные объекты, перечисления), и оставляет только поля формы. */
export function migrateShape(raw: Record<string, unknown>): Record<string, unknown> {
  // вложенные объекты сначала сливаются с умолчаниями формы (а не изображения), потом общие правила приводят перечисления к допустимым
  const seed: Record<string, unknown> = {}
  for (const k of KEYS) {
    const v = raw[k]
    seed[k] = { ...defaultShapeState[k], ...(v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}) }
  }
  const merged = migrateKeychain(seed)
  const out: Record<string, unknown> = {}
  for (const k of KEYS) out[k] = merged[k]
  out.source = { ...defaultSource } // яркость нужна только изображению
  return out
}

/** Полные параметры геометрии из состояния формы (поля изображения — значения по умолчанию, режим их не читает). */
export function shapeParams(s: ShapeState): KeychainParams {
  return { ...defaultKeychain, ...s }
}
