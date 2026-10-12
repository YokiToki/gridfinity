import { IconGridDots, IconKey, type Icon } from '@tabler/icons-react'
import { GRIDFINITY_PATH, KEYCHAIN_MODES, KEYCHAIN_PATH, MODES, type ProductMode } from './modes'

export type ProductId = 'gridfinity' | 'keychain'

/** Раздел сайта: свои маршруты, название, описание (ключи i18n products.<id>.*) и состояние. Новый продукт — одна запись здесь плюс маршруты. */
export interface Product {
  id: ProductId
  path: string
  Icon: Icon
  /** Режимы продукта; у продуктов без режимов переключатель режимов скрыт. */
  modes?: ProductMode[]
}

export const PRODUCTS: Product[] = [
  { id: 'gridfinity', path: GRIDFINITY_PATH, Icon: IconGridDots, modes: MODES },
  { id: 'keychain', path: KEYCHAIN_PATH, Icon: IconKey, modes: KEYCHAIN_MODES },
]

/** Продукт по пути: совпадает сам путь или его подпуть (граница по «/»). */
export function productOf(pathname: string): Product | undefined {
  return PRODUCTS.find((p) => pathname === p.path || pathname.startsWith(`${p.path}/`))
}

export const productById = (id: string) => PRODUCTS.find((p) => p.id === id)
