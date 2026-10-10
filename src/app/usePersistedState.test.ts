// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadPersisted } from './usePersistedState'

const defaults = { a: 1, b: 'x' }

describe('loadPersisted', () => {
  beforeEach(() => localStorage.clear())

  it('валидный JSON накладывается на defaults', () => {
    localStorage.setItem('k', JSON.stringify({ a: 5 }))
    expect(loadPersisted('k', defaults)).toEqual({ a: 5, b: 'x' })
  })
  it('отсутствующий ключ даёт defaults', () => {
    expect(loadPersisted('k', defaults)).toEqual(defaults)
  })
  it('битый JSON даёт defaults', () => {
    localStorage.setItem('k', '{oops')
    expect(loadPersisted('k', defaults)).toEqual(defaults)
  })
  it('не объект даёт defaults', () => {
    localStorage.setItem('k', '42')
    expect(loadPersisted('k', defaults)).toEqual(defaults)
  })
})
