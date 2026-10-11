import { describe, expect, it } from 'vitest'
import { PRODUCTS, productOf } from './products'
import { MODES } from './modes'

describe('products', () => {
  it('пути и id продуктов уникальны', () => {
    expect(new Set(PRODUCTS.map((p) => p.path)).size).toBe(PRODUCTS.length)
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length)
  })
  it('каждый путь режима начинается с пути своего продукта', () => {
    for (const p of PRODUCTS) for (const m of p.modes ?? []) expect(m.path.startsWith(`${p.path}/`)).toBe(true)
    expect(PRODUCTS.find((p) => p.id === 'gridfinity')?.modes).toBe(MODES)
  })
  it('у Keychain режимов нет, у Gridfinity три', () => {
    expect(PRODUCTS.find((p) => p.id === 'keychain')?.modes).toBeUndefined()
    expect(PRODUCTS.find((p) => p.id === 'gridfinity')?.modes).toHaveLength(3)
  })
  it('productOf: сам путь и подпуть, граница по слэшу', () => {
    expect(productOf('/gridfinity')?.id).toBe('gridfinity')
    expect(productOf('/gridfinity/box')?.id).toBe('gridfinity')
    expect(productOf('/keychain')?.id).toBe('keychain')
    expect(productOf('/keychainer')).toBeUndefined()
    expect(productOf('/')).toBeUndefined()
  })
})
