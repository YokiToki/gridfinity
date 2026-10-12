import { describe, expect, it } from 'vitest'
import { migrateKeychain } from './migrate'
import { defaultKeychain } from '../../geometry/keychain'

describe('migrateKeychain', () => {
  it('пустое сохранённое дополняется умолчаниями', () => {
    const m = migrateKeychain({})
    expect(m).toMatchObject({ imageId: '', imageName: '', silhouette: defaultKeychain.silhouette, size: defaultKeychain.size, relief: defaultKeychain.relief, base: defaultKeychain.base, quality: defaultKeychain.quality })
  })
  it('частичные вложенные объекты сливаются, битые заменяются', () => {
    const m = migrateKeychain({ silhouette: { close: 9, keepOpen: 'x', threshold: 'abc' }, relief: null, base: 'zzz', size: { mode: 'box' } })
    expect((m.silhouette as { close: number; keepOpen: number[]; threshold: unknown })).toMatchObject({ close: 9, keepOpen: [], threshold: 'auto' })
    expect(m.relief).toEqual(defaultKeychain.relief)
    expect(m.base).toEqual(defaultKeychain.base)
    expect((m.size as { mode: string; longest: number })).toMatchObject({ mode: 'box', longest: 70 })
  })
  it('keepOpen оставляет только целые числа; число в threshold сохраняется', () => {
    const m = migrateKeychain({ silhouette: { keepOpen: [1, 'a', 2.5, 3], threshold: 120 } })
    expect((m.silhouette as { keepOpen: number[]; threshold: number }).keepOpen).toEqual([1, 3])
    expect((m.silhouette as { threshold: number }).threshold).toBe(120)
  })
})
