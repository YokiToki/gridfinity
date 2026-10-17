// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadPersisted } from '../../app/usePersistedState'
import { defaultRackCase, type RackCaseParams } from '../../geometry/rack/case'
import { generate } from '../../geometry/model'
import { migrateRackCase } from './migrateCase'

const load = () => loadPersisted('rack.case', defaultRackCase, migrateRackCase)

describe('rack.case: сохранение', () => {
  beforeEach(() => localStorage.clear())
  it('круг «сохранить — загрузить» возвращает те же параметры', () => {
    const p: RackCaseParams = { ...defaultRackCase, device: { width: 90, depth: 120, height: 60 }, units: { auto: false, value: 4 }, keystones: { count: 2, side: 'left' }, cable: { count: 2, diameter: 6 }, vents: { enabled: true, width: 10, wall: 2, margin: 8 }, window: { enabled: false, lip: 5 } }
    localStorage.setItem('rack.case', JSON.stringify(p))
    expect(load()).toEqual(p)
  })
  it('пустое хранилище и битый JSON дают умолчания', () => {
    expect(load()).toEqual(defaultRackCase)
    localStorage.setItem('rack.case', '{bad')
    expect(load()).toEqual(defaultRackCase)
  })
  it('частичные и испорченные данные нормализуются', () => {
    localStorage.setItem('rack.case', JSON.stringify({ device: { width: 'x', depth: 100 }, keystones: { side: 'zzz', count: 2.4 }, ears: { positions: 'none' }, vents: null, units: [] }))
    const p = load()
    expect(p.device).toEqual({ ...defaultRackCase.device, depth: 100 }); expect(p.keystones).toEqual({ count: 2, side: 'right' })
    expect(p.ears.positions).toBe('edges'); expect(p.vents).toEqual(defaultRackCase.vents); expect(p.units).toEqual(defaultRackCase.units)
  })
})

describe('generate("rackCase")', () => {
  it('одна часть case: габарит по пластине и оболочке', async () => {
    const r = await generate('rackCase', defaultRackCase)
    expect(r.parts.map((p) => p.label)).toEqual(['case'])
    const m = r.parts[0].mesh
    expect(m.max[2]).toBeCloseTo(3, 6); expect(m.min[2]).toBeCloseTo(-160.4, 6); expect(r.rack).toEqual({ warnings: [] })
  })
  it('слишком широкое: частей нет, ошибка и превышение', async () => {
    const r = await generate('rackCase', { ...defaultRackCase, device: { ...defaultRackCase.device, width: 230 } })
    expect(r.parts).toEqual([]); expect(r.rack?.error).toBe('rack.error.tooWide'); expect(r.rack?.excess).toBeCloseTo(12.55, 6)
  })
  it('предупреждение о тесноте проходит в rack.warnings', async () => {
    const r = await generate('rackCase', { ...defaultRackCase, keystones: { count: 6, side: 'right' } })
    expect(r.rack?.warnings).toEqual([{ key: 'rack.warning.fit', setting: 'keystones' }])
  })
})
