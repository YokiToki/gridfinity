// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadPersisted } from '../../app/usePersistedState'
import { defaultParams } from '../../geometry/baseplate'
import { migrateBaseplate } from './migrate'

const load = () => loadPersisted('gridfinity.baseplate', defaultParams, migrateBaseplate)
const store = (v: unknown) => localStorage.setItem('gridfinity.baseplate', JSON.stringify(v))

describe('миграция сохранённых параметров baseplate', () => {
  beforeEach(() => localStorage.clear())

  it('старый JSON с magnets/screws: true загружается как Full', () => {
    store({ unit: 42, x: 3, y: 2, magnets: true, screws: true })
    const p = load()
    expect(p.x).toBe(3)
    expect(p.fasteners.magnets).toEqual({ mode: 'full', slots: [] })
    expect(p.fasteners.screws).toEqual({ mode: 'full', slots: [] })
    expect('magnets' in p).toBe(false)
  })
  it('false → none, смешанный случай', () => {
    store({ magnets: true, screws: false })
    const p = load()
    expect(p.fasteners.magnets.mode).toBe('full')
    expect(p.fasteners.screws.mode).toBe('none')
  })
  it('manual-координаты: точные и близкие точки становятся слотами, дубли сливаются, далёкие отбрасываются', () => {
    store({
      x: 2, y: 2, unit: 42,
      fasteners: { magnets: { mode: 'manual', manual: [{ x: -34, y: -34 }, { x: -33, y: -35 }, { x: 0, y: 0 }, { x: 34, y: 34 }, { x: 36.9, y: 34 }] }, screws: { mode: 'none', manual: [] } },
    })
    const p = load()
    expect(p.fasteners.magnets.mode).toBe('manual')
    expect(p.fasteners.magnets.slots).toEqual([
      { i: 0, j: 0, sx: -1, sy: -1 },
      { i: 1, j: 1, sx: 1, sy: 1 },
    ])
    expect(p.fasteners.screws).toEqual({ mode: 'none', slots: [] })
    expect(JSON.stringify(p)).not.toContain('"manual":[')
  })
  it('manual-координаты при нестандартной сетке привязываются к сохранённой сетке', () => {
    store({ x: 3, y: 1, unit: 42, fasteners: { magnets: { mode: 'manual', manual: [{ x: 55, y: 13 }] } } })
    expect(load().fasteners.magnets.slots).toEqual([{ i: 2, j: 0, sx: 1, sy: 1 }])
  })
  it('новый формат со слотами не меняется', () => {
    const slots = [{ i: 1, j: 0, sx: 1, sy: -1 }]
    store({ fasteners: { magnets: { mode: 'manual', slots } } })
    expect(load().fasteners.magnets).toEqual({ mode: 'manual', slots })
  })
  it('пустое хранилище и битый JSON дают значения по умолчанию', () => {
    expect(load()).toEqual(defaultParams)
    localStorage.setItem('gridfinity.baseplate', '{bad')
    expect(load()).toEqual(defaultParams)
  })
})
