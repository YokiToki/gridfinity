// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { readSession, recordSession } from './lastSession'

describe('lastSession', () => {
  beforeEach(() => localStorage.clear())
  it('старая запись без product читается как Gridfinity', () => {
    localStorage.setItem('gridfinity.last', JSON.stringify({ mode: 'box', size: '2 × 2', savedAt: 5 }))
    expect(readSession()).toEqual({ product: 'gridfinity', mode: 'box', size: '2 × 2', savedAt: 5 })
  })
  it('новая запись: продукт и режим сохраняются, у продукта без режима режима нет', () => {
    recordSession('cutout', '3')
    expect(readSession()).toMatchObject({ product: 'gridfinity', mode: 'cutout', size: '3' })
    recordSession(null, '1 emblem', 'keychain')
    const s = readSession()!
    expect(s).toMatchObject({ product: 'keychain', size: '1 emblem' })
    expect(s.mode).toBeUndefined()
  })
  it('Rack: запись с продуктом и режимом читается, неизвестный продукт считается Gridfinity', () => {
    recordSession('panel', '2 U', 'rack')
    expect(readSession()).toMatchObject({ product: 'rack', mode: 'panel', size: '2 U' })
    localStorage.setItem('gridfinity.last', JSON.stringify({ product: 'zzz', mode: 'box', size: '1', savedAt: 1 }))
    expect(readSession()).toMatchObject({ product: 'gridfinity', mode: 'box' })
  })
  it.each(['not json', '{"size":1}', '{"product":"gridfinity","size":"x","savedAt":1}', 'null'])('битая запись %s даёт null', (raw) => {
    localStorage.setItem('gridfinity.last', raw)
    expect(readSession()).toBeNull()
  })
})
