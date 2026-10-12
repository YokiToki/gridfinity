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
    expect((m.silhouette as { close: number; areas: unknown; threshold: unknown })).toMatchObject({ close: 9, areas: {}, threshold: 'auto' })
    expect(m.relief).toEqual(defaultKeychain.relief)
    expect(m.base).toEqual(defaultKeychain.base)
    expect((m.size as { mode: string; longest: number })).toMatchObject({ mode: 'box', longest: 70 })
  })
  it('keepOpen превращается в открытые области (только целые числа); число в threshold сохраняется', () => {
    const m = migrateKeychain({ silhouette: { keepOpen: [1, 'a', 2.5, 3], threshold: 120 } })
    expect(Object.keys((m.silhouette as { areas: Record<string, unknown> }).areas)).toEqual(['1', '3'])
    expect((m.silhouette as { threshold: number }).threshold).toBe(120)
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
  it('сглаживание: старая запись с яркостью остаётся на 0 и без удаления пятен, мусор приводится к 0', () => {
    const old = migrateKeychain({ source: { kind: 'brightness', contrast: 1.5, gamma: 1, invert: false }, relief: { hmax: 3 } })
    expect(old.source).toMatchObject({ kind: 'brightness', contrast: 1.5, smooth: 0, despeckle: false })
    expect((old.relief as { smooth: number }).smooth).toBe(0)
    const junk = migrateKeychain({ source: { smooth: 'x', despeckle: 'yes' }, relief: { smooth: null } })
    expect(junk.source).toMatchObject({ smooth: 0, despeckle: false })
    expect((junk.relief as { smooth: number }).smooth).toBe(0)
  })
  it('сохранённое сглаживание сохраняется', () => {
    const m = migrateKeychain({ source: { kind: 'brightness', smooth: 0.8, despeckle: true }, relief: { smooth: 1.2 } })
    expect(m.source).toMatchObject({ smooth: 0.8, despeckle: true })
    expect((m.relief as { smooth: number }).smooth).toBe(1.2)
  })

  describe('области (из keepOpen)', () => {
    const areasOf = (sil: Record<string, unknown>) => (migrateKeychain({ silhouette: sil }).silhouette as { areas: Record<number, unknown>; keepOpen?: unknown }).areas
    it.each([
      ['нет ни того, ни другого', {}, {}],
      ['keepOpen [3] → открытая область 3', { keepOpen: [3] }, { 3: { mode: 'open', level: 0.6 } }],
      ['keepOpen [1, 4]', { keepOpen: [1, 4] }, { 1: { mode: 'open', level: 0.6 }, 4: { mode: 'open', level: 0.6 } }],
      ['мусор в keepOpen отбрасывается', { keepOpen: [2, 'x', -1, 1.5, null] }, { 2: { mode: 'open', level: 0.6 } }],
      ['новые areas сохраняются', { areas: { 2: { mode: 'level', level: 1.2 } } }, { 2: { mode: 'level', level: 1.2 } }],
      ['areas важнее keepOpen для того же номера', { keepOpen: [2], areas: { 2: { mode: 'level', level: 0.9 } } }, { 2: { mode: 'level', level: 0.9 } }],
      ['неизвестный режим и уровень приводятся', { areas: { 5: { mode: 'zzz', level: 'x' } } }, { 5: { mode: 'follow', level: 0.6 } }],
      ['плохие ключи отбрасываются', { areas: { a: { mode: 'open' }, 0: { mode: 'open' } } }, {}],
    ])('%s', (_n, sil, expected) => {
      expect(areasOf(sil)).toEqual(expected)
    })
    it('keepOpen из записи удаляется', () => {
      expect((migrateKeychain({ silhouette: { keepOpen: [1] } }).silhouette as { keepOpen?: unknown }).keepOpen).toBeUndefined()
    })
    it('мусор вместо areas не ломает загрузку', () => {
      expect(areasOf({ areas: 7 })).toEqual({})
      expect(areasOf({ areas: [1, 2] })).toEqual({})
    })
  })
})
