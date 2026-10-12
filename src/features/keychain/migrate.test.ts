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
  it('старая запись (до узоров) получает источник, детали, узор и профиль по умолчанию', () => {
    const m = migrateKeychain({ imageId: 'i', imageName: 'a.png', relief: { hmax: 3, edgeWidth: 4, pow: 0.7, heightFloor: 0.1 }, base: { thickness: 1 } })
    expect(m.source).toEqual(defaultKeychain.source)
    expect(m.detail).toEqual(defaultKeychain.detail)
    expect(m.pattern).toEqual(defaultKeychain.pattern)
    expect(m.relief).toMatchObject({ hmax: 3, edgeWidth: 4, profile: 'bevel', steps: 3 }) // сохранённое остаётся, новое — по умолчанию
  })
  it('битые перечисления заменяются: профиль, источник, узор, область', () => {
    const m = migrateKeychain({ relief: { profile: 'zzz' }, source: { kind: 'x' }, pattern: { kind: 'swirl', scope: 'nowhere', pitch: 2 } })
    expect((m.relief as { profile: string }).profile).toBe('bevel')
    expect((m.source as { kind: string }).kind).toBe('distance')
    expect(m.pattern).toMatchObject({ kind: 'none', scope: 'relief', pitch: 2 })
  })
  it('корректный узор сохраняется', () => {
    const m = migrateKeychain({ pattern: { kind: 'hex', scope: 'plateau', pitch: 3 }, relief: { profile: 'terrace', steps: 4 } })
    expect(m.pattern).toMatchObject({ kind: 'hex', scope: 'plateau', pitch: 3 })
    expect(m.relief).toMatchObject({ profile: 'terrace', steps: 4 })
  })
})
