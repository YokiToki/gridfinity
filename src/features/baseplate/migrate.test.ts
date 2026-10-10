// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadPersisted } from '../../app/usePersistedState'
import { defaultParams } from '../../geometry/baseplate'
import { migrateBaseplate } from './migrate'

const load = () => loadPersisted('gridfinity.baseplate', defaultParams, migrateBaseplate)

describe('миграция сохранённых параметров baseplate', () => {
  beforeEach(() => localStorage.clear())

  it('старый JSON с magnets/screws: true загружается как Full', () => {
    localStorage.setItem('gridfinity.baseplate', JSON.stringify({ unit: 42, x: 3, y: 2, magnets: true, screws: true }))
    const p = load()
    expect(p.x).toBe(3)
    expect(p.fasteners.magnets).toEqual({ mode: 'full', manual: [] })
    expect(p.fasteners.screws).toEqual({ mode: 'full', manual: [] })
    expect('magnets' in p).toBe(false)
  })
  it('false → none, смешанный случай', () => {
    localStorage.setItem('gridfinity.baseplate', JSON.stringify({ magnets: true, screws: false }))
    const p = load()
    expect(p.fasteners.magnets.mode).toBe('full')
    expect(p.fasteners.screws.mode).toBe('none')
  })
  it('новый формат не меняется', () => {
    const fasteners = { ...defaultParams.fasteners, magnets: { mode: 'manual', manual: [{ x: 1, y: 2 }] } }
    localStorage.setItem('gridfinity.baseplate', JSON.stringify({ fasteners }))
    expect(load().fasteners.magnets).toEqual({ mode: 'manual', manual: [{ x: 1, y: 2 }] })
  })
  it('пустое хранилище и битый JSON дают значения по умолчанию', () => {
    expect(load()).toEqual(defaultParams)
    localStorage.setItem('gridfinity.baseplate', '{bad')
    expect(load()).toEqual(defaultParams)
  })
})
