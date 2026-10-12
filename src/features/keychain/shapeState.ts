import { defaultKeychain, defaultSource, type KeychainParams } from '../../geometry/keychain'
import { defaultRim, defaultShape, SHAPE_KINDS, shapeBounds, type ShapeParams } from '../../geometry/shapes'
import { migrateKeychain } from './migrate'
import type { SharedParams } from './SharedSections'

/** Состояние режима «Форма» (ключ keychain.shape): общая часть параметров; полей изображения здесь нет вовсе. */
export type ShapeState = SharedParams & { shape: ShapeParams }

/** Умолчания формы: плоский профиль, тонкий рельеф, подложка 1.6 мм по контуру фигуры. */
export const defaultShapeState: ShapeState = {
  shape: defaultShape,
  source: defaultSource,
  relief: { ...defaultKeychain.relief, hmax: 1, heightFloor: 0.06, profile: 'flat' },
  detail: defaultKeychain.detail,
  pattern: defaultKeychain.pattern,
  base: { ...defaultKeychain.base, thickness: 1.6 },
  mount: defaultKeychain.mount,
  split: defaultKeychain.split,
  quality: defaultKeychain.quality,
}

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const KEYS = (Object.keys(defaultShapeState) as (keyof ShapeState)[]).filter((k) => k !== 'shape')

/** Фигура из сохранённого: вложенный бортик сливается с умолчаниями, вид и число сторон приводятся к допустимому. */
export function normalizeShape(raw: unknown): ShapeParams {
  const r = obj(raw)
  const s = { ...defaultShape, ...r, rim: { ...defaultRim, ...obj(r.rim) } } as ShapeParams
  if (!SHAPE_KINDS.includes(s.kind)) s.kind = defaultShape.kind
  // числа обязаны быть числами: строка или null в сохранённом не должны дойти до полей и геометрии
  const num = <T extends Record<string, unknown>>(o: T, d: T): T => {
    const out: Record<string, unknown> = { ...o }
    for (const k of Object.keys(d)) if (typeof d[k] === 'number' && !(typeof out[k] === 'number' && Number.isFinite(out[k]))) out[k] = d[k]
    return out as T
  }
  const fixed = num(s as unknown as Record<string, unknown>, defaultShape as unknown as Record<string, unknown>) as unknown as ShapeParams
  fixed.rim = { ...num(s.rim as unknown as Record<string, unknown>, defaultRim as unknown as Record<string, unknown>) as unknown as typeof s.rim, enabled: s.rim.enabled === true }
  return fixed
}

/** Донаполняет сохранённое теми же правилами, что и Изображение (вложенные объекты, перечисления), и оставляет только поля формы. */
export function migrateShape(raw: Record<string, unknown>): Record<string, unknown> {
  // вложенные объекты сначала сливаются с умолчаниями формы (а не изображения), потом общие правила приводят перечисления к допустимым
  const seed: Record<string, unknown> = {}
  for (const k of KEYS) {
    const v = raw[k]
    seed[k] = { ...defaultShapeState[k], ...(v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}) }
  }
  const merged = migrateKeychain(seed)
  const out: Record<string, unknown> = { shape: normalizeShape(raw.shape) }
  for (const k of KEYS) out[k] = merged[k]
  out.source = { ...defaultSource } // яркость нужна только изображению
  return out
}

/** Полные параметры геометрии из состояния формы (поля изображения — значения по умолчанию, режим их не читает). */
export function shapeParams(s: ShapeState): KeychainParams {
  const { shape, ...shared } = s
  const b = shapeBounds(shape)
  // размер задаёт сама фигура: поле size только отражает его для остального конвейера
  return { ...defaultKeychain, ...shared, origin: { kind: 'shape', shape }, size: { mode: 'box', longest: Math.max(b.w, b.h), width: b.w, height: b.h } }
}
