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
    expect(p.pitch).toBe(42)
    expect(p.x).toEqual({ mode: 'units', value: 3, align: 'center' })
    expect(p.y).toEqual({ mode: 'units', value: 2, align: 'center' })
    expect(p.fasteners.magnets).toEqual({ mode: 'full', slots: [] })
    expect(p.fasteners.screws).toEqual({ mode: 'full', slots: [] })
    expect('magnets' in p).toBe(false)
  })
  it('прототип: customSize превращается в размер в мм, стол — в preview', () => {
    store({ unit: 40, x: 2, y: 2, customSize: true, sizeX: 300, sizeY: 200, showPlate: true, plateX: 220, plateY: 220 })
    const p = load()
    expect(p.pitch).toBe(40)
    expect(p.x).toEqual({ mode: 'mm', value: 300, align: 'center' })
    expect(p.y).toEqual({ mode: 'mm', value: 200, align: 'center' })
    expect(p.preview).toEqual({ showPlate: true, plateX: 220, plateY: 220 })
    expect(p.thickness).toEqual(defaultParams.thickness)
    expect('customSize' in p).toBe(false)
  })
  it('прототип: customSize меньше блока ячеек не уменьшает плиту', () => {
    store({ unit: 42, x: 3, y: 1, customSize: true, sizeX: 50, sizeY: 50 })
    expect(load().x).toEqual({ mode: 'mm', value: 126, align: 'center' })
  })
  it('частичные вложенные объекты донаполняются по умолчанию', () => {
    store({ thickness: { floor: 1.2 }, preview: { showPlate: true } })
    const p = load()
    expect(p.thickness).toEqual({ ...defaultParams.thickness, floor: 1.2 })
    expect(p.preview).toEqual({ ...defaultParams.preview, showPlate: true })
  })
  it('настройки разделения донаполняются, включая вложенный connector', () => {
    store({ split: { enabled: true, connector: { type: 'holes', count: 3 } } })
    const p = load()
    expect(p.split.enabled).toBe(true)
    expect(p.split.margin).toBe(5)
    expect(p.split.connector).toMatchObject({ type: 'holes', count: 3, diameter: 1.9, dovetailHeight: 2, overrides: {} })
    expect(p.split.exploded).toBe(true)
  })
  it('убранные пресеты M3 и 6×2 читаются как «свой», размеры и остальное сохраняются', () => {
    store({ split: { connector: { type: 'holes', preset: 'm3', diameter: 3.2, depth: 6, dovetailDepth: 1.3 } } })
    expect(load().split.connector).toMatchObject({ preset: 'custom', diameter: 3.2, depth: 6, dovetailDepth: 1.3, dovetailHeight: 2 })
    store({ split: { connector: { preset: 'm6x2', diameter: 6.1 } } })
    expect(load().split.connector).toMatchObject({ preset: 'custom', diameter: 6.1 })
  })
  it('известный пресет и отсутствующий dovetailHeight', () => {
    store({ split: { connector: { preset: 'pin3', diameter: 3.1 } } })
    expect(load().split.connector).toMatchObject({ preset: 'pin3', dovetailHeight: 2 })
  })
  it('старое состояние без split получает разделение по умолчанию (выключено)', () => {
    store({ unit: 42, x: 3, y: 2 })
    expect(load().split).toEqual(defaultParams.split)
  })
  it('частично сохранённый крепёж (одного вида нет) не ломает загрузку', () => {
    store({ fasteners: { magnets: { mode: 'full' } } })
    const p = load()
    expect(p.fasteners.magnets).toEqual({ mode: 'full', slots: [] })
    expect(p.fasteners.screws).toEqual({ mode: 'none', slots: [] })
    expect(p.fasteners.magnetD).toBe(6.5)
    store({ fasteners: { magnets: { mode: 'weird', slots: 'x' }, screws: null } })
    expect(load().fasteners.magnets).toEqual({ mode: 'none', slots: [] })
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
