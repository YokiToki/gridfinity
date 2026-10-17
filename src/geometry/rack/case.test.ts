import { describe, expect, it } from 'vitest'
import { caseLayout, defaultRackCase, validateRackCase, type RackCaseParams } from './case'
import { RACK_UNIT, RACK_WINDOW } from './spec'

const C = (o: Partial<RackCaseParams> = {}): RackCaseParams => ({ ...defaultRackCase, ...o })
const dev = (width: number, depth: number, height: number) => ({ width, depth, height })

describe('корпус: юниты и размеры', () => {
  it('устройство 120 мм высотой даёт 3 U: оболочка 124.8, пластина 3 × 44.45 − 0.45', () => {
    const l = caseLayout(C({ device: dev(100, 100, 120) }))
    expect(l.outerH).toBeCloseTo(124.8, 9); expect(l.autoUnits).toBe(3); expect(l.units).toBe(3)
    expect(l.plateH).toBeCloseTo(3 * RACK_UNIT - 0.45, 9)
    expect(l.outerW).toBeCloseTo(104.8, 9); expect(l.shellLen).toBeCloseTo(100.4, 9)
  })
  it.each([[40, 2], [38, 1], [41.6, 2], [83, 2], [84, 3], [170, 4]])('высота %i мм → %i U с допуском', (h, u) => {
    // 1 U вмещает оболочку до 44.45 − 0.45 = 44.0: устройство до 39.2
    expect(caseLayout(C({ device: dev(100, 100, h) })).autoUnits).toBe(u)
  })
  it('без допуска запас 0.45 мм не нужен', () => {
    expect(caseLayout(C({ device: dev(100, 100, 39.65), tolerance: false })).autoUnits).toBe(1)
    expect(caseLayout(C({ device: dev(100, 100, 39.65), tolerance: true })).autoUnits).toBe(2)
  })
  it('заданное число юнитов больше нужного принимается, меньше — поднимается до нужного с пометкой', () => {
    const base = C({ device: dev(100, 100, 40) })
    expect(caseLayout({ ...base, units: { auto: false, value: 4 } })).toMatchObject({ units: 4, raised: false })
    expect(caseLayout({ ...base, units: { auto: false, value: 1 } })).toMatchObject({ units: 2, raised: true })
    expect(caseLayout({ ...base, units: { auto: true, value: 5 } })).toMatchObject({ units: 2, raised: false })
  })
  it('оболочка стоит по центру пластины', () => {
    const l = caseLayout(C({ device: dev(100, 100, 40), units: { auto: false, value: 4 } }))
    expect(l.centreY).toBeCloseTo(l.plateH / 2, 9)
  })
})

describe('корпус: проверка', () => {
  it('умолчания допустимы', () => expect(validateRackCase(defaultRackCase).errors).toEqual([]))
  it('слишком широкое устройство: ошибка несёт превышение в мм', () => {
    const v = validateRackCase(C({ device: dev(220, 100, 40) }))
    expect(v.errors).toEqual(['rack.error.tooWide'])
    expect(v.excess).toBeCloseTo(220 + 4.8 - RACK_WINDOW, 9)
    expect(validateRackCase(C({ device: dev(217.45, 100, 40) })).errors).toEqual([])
  })
  it('слишком высокое: больше 10 U', () => expect(validateRackCase(C({ device: dev(100, 100, 440) })).errors).toEqual(['rack.error.tooTall']))
  it('окно равно устройству минус удвоенная кайма', () => {
    expect(caseLayout(C({ device: dev(120, 100, 40), window: { enabled: true, lip: 3 } })).window).toEqual({ width: 114, height: 34 })
  })
  it('кайма больше половины размера недопустима', () => {
    expect(validateRackCase(C({ device: dev(120, 100, 40), window: { enabled: true, lip: 18.1 } })).errors).toEqual(['rack.error.lip'])
    expect(validateRackCase(C({ device: dev(120, 100, 40), window: { enabled: true, lip: 18 } })).errors).toEqual([])
    expect(validateRackCase(C({ device: dev(120, 100, 40), window: { enabled: false, lip: 99 } })).errors).toEqual([])
  })
  it('значения вне диапазона отвергаются', () => {
    expect(validateRackCase(C({ device: dev(5, 100, 40) })).errors).toContain('rack.error.device')
    expect(validateRackCase(C({ wall: 0.2 })).errors).toContain('rack.error.wall')
    expect(validateRackCase(C({ plateThickness: 20 })).errors).toContain('rack.error.thickness')
    expect(validateRackCase(C({ gap: 9 })).errors).toContain('rack.error.gap')
  })
})
