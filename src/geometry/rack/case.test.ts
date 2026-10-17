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

import { buildRackCase } from './case'
import { expectValidSolid } from '../testing'

const area = (m: { slice(z: number): { area(): number; delete(): void } }, z: number) => { const s = m.slice(z); const a = s.area(); s.delete(); return a }
const build = async (p: RackCaseParams) => { const r = await buildRackCase(p); expect(r.error).toBeUndefined(); return r.solid! }

describe('корпус: пластина, оболочка, окно', () => {
  const p = C({ device: dev(100, 80, 120), window: { enabled: true, lip: 3 } })
  it('габарит: 254 в ширину, высота пластины, глубина = толщина + глубина устройства + зазор', async () => {
    const m = await build(p), l = caseLayout(p)
    expectValidSolid(m, { size: [254, l.plateH, 3 + 80 + 0.4], min: [-127, 0, -80.4], max: [127, l.plateH, 3] })
  })
  it('оболочка открыта сзади: сечение у задней кромки — кольцо стенок, равное внешнему минус полость', async () => {
    const m = await build(p), l = caseLayout(p)
    const ring = l.outerW * l.outerH - l.cavityW * l.cavityH
    expect(area(m, -l.shellLen + 0.01)).toBeCloseTo(ring, 2)
    expect(area(m, -l.shellLen / 2)).toBeCloseTo(ring, 2)
  })
  it('полость ровно по устройству плюс зазор с каждой стороны', async () => {
    const m = await build(p), s = m.slice(-10), polys = s.toPolygons(); s.delete()
    const inner = polys.map((q) => ({ w: Math.max(...q.map((v) => v[0])) - Math.min(...q.map((v) => v[0])), h: Math.max(...q.map((v) => v[1])) - Math.min(...q.map((v) => v[1])) })).sort((a, b) => a.w - b.w)[0]
    expect(inner.w).toBeCloseTo(100.8, 3); expect(inner.h).toBeCloseTo(120.8, 3)
  })
  it('оболочка по центру пластины по X и по высоте', async () => {
    const m = await build(C({ ...p, units: { auto: false, value: 5 } })), l = caseLayout({ ...p, units: { auto: false, value: 5 } })
    const s = m.slice(-10), polys = s.toPolygons(); s.delete()
    const ys = polys.flatMap((q) => q.map((v) => v[1])), xs = polys.flatMap((q) => q.map((v) => v[0]))
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(l.plateH / 2, 6); expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(0, 6)
  })
  it('окно: в лицевой пластине свободно на (устройство − 2 × кайма), с каймой 0 — на всё устройство', async () => {
    const withWin = await build(p), closed = await build(C({ ...p, window: { enabled: false, lip: 3 } })), l = caseLayout(p)
    expect(area(closed, 1.5) - area(withWin, 1.5)).toBeCloseTo(94 * 114 - (4 - Math.PI) * 4 * 1, 0) // окно с радиусом 2: минус четыре угла
    const lip0 = await build(C({ ...p, window: { enabled: true, lip: 0 } }))
    expect(area(closed, 1.5) - area(lip0, 1.5)).toBeCloseTo(100 * 120 - (4 - Math.PI) * 4, 0)
    void l
  })
  it('объём = пластина минус окно и отверстия плюс стенки оболочки (±1 %)', async () => {
    const m = await build(p), l = caseLayout(p)
    const plate = area(m, 1.5) * 3, walls = (l.outerW * l.outerH - l.cavityW * l.cavityH) * l.shellLen
    expect(Math.abs(m.volume() - (plate + walls)) / (plate + walls)).toBeLessThan(0.01)
  })
  it('одна компонента; закрытая пластина и принудительные юниты тоже валидны', async () => {
    for (const q of [p, C({ ...p, window: { enabled: false, lip: 0 } }), C({ ...p, units: { auto: false, value: 6 } })]) {
      const m = await build(q); expect(m.decompose()).toHaveLength(1)
    }
  })
  it('слишком широкое устройство: модели нет, ошибка и превышение', async () => {
    const r = await buildRackCase(C({ device: dev(230, 100, 40) }))
    expect(r.solid).toBeNull(); expect(r.error).toBe('rack.error.tooWide'); expect(r.excess).toBeCloseTo(234.8 - RACK_WINDOW, 6)
  })
})

import { frontExtras } from './case'
import { KEYSTONE_H, KEYSTONE_PITCH, KEYSTONE_W } from './spec'

describe('корпус: keystone и кабельные отверстия', () => {
  const base = C({ device: dev(100, 80, 40), window: { enabled: true, lip: 3 } })
  const withKeys = (count: number, side: 'left' | 'right' | 'below') => C({ ...base, keystones: { count, side } })

  it('keystone справа: два проёма в столбце с шагом 19, по центру свободной зоны и высоты пластины', () => {
    const p = withKeys(2, 'right'), l = caseLayout(p), e = frontExtras(p)
    expect(e.keystones).toHaveLength(2); expect(e.warnings).toEqual([])
    expect(e.keystones[1].y - e.keystones[0].y).toBeCloseTo(KEYSTONE_PITCH, 9)
    expect((e.keystones[0].y + e.keystones[1].y) / 2).toBeCloseTo(l.centreY, 9)
    const x = (l.outerW / 2 + 3 + (111.125 - 3)) / 2
    e.keystones.forEach((k) => expect(k.x).toBeCloseTo(x, 9))
  })
  it('проёмы внутри пластины, вне корпуса, ушей и рейки', () => {
    for (const side of ['left', 'right'] as const) {
      const p = withKeys(3, side), l = caseLayout(p)
      for (const k of frontExtras(p).keystones) {
        expect(Math.abs(k.x) - KEYSTONE_W / 2).toBeGreaterThanOrEqual(l.outerW / 2) // вне оболочки
        expect(Math.abs(k.x) + KEYSTONE_W / 2).toBeLessThanOrEqual(111.125 - 3 + 1e-9) // в пределах рейки, ушные отверстия дальше
        expect(k.y - KEYSTONE_H / 2).toBeGreaterThanOrEqual(3 - 1e-9); expect(k.y + KEYSTONE_H / 2).toBeLessThanOrEqual(l.plateH - 3 + 1e-9)
        expect(Math.sign(k.x)).toBe(side === 'right' ? 1 : -1)
      }
    }
  })
  it('keystone под корпусом: ряд по центру, если пластина выше оболочки', () => {
    const tall = C({ ...base, units: { auto: false, value: 4 }, keystones: { count: 3, side: 'below' } })
    const e = frontExtras(tall), l = caseLayout(tall)
    expect(e.keystones).toHaveLength(3); expect(e.warnings).toEqual([])
    expect(e.keystones.map((k) => k.x)).toEqual([-19, 0, 19])
    e.keystones.forEach((k) => expect(k.y + KEYSTONE_H / 2).toBeLessThanOrEqual(l.centreY - l.outerH / 2 - 3 + 1e-9))
    // без запаса высоты под корпусом: предупреждение и проёмов нет
    const tight = frontExtras(C({ ...base, keystones: { count: 2, side: 'below' } }))
    expect(tight.keystones).toEqual([]); expect(tight.warnings).toEqual([{ key: 'rack.warning.fit', setting: 'keystones' }])
  })
  it('не помещается: широкое устройство оставляет мало места сбоку — предупреждение, проёмы не режутся', () => {
    const p = C({ ...base, device: dev(200, 80, 40), keystones: { count: 1, side: 'right' } })
    const e = frontExtras(p)
    expect(e.keystones).toEqual([]); expect(e.warnings).toEqual([{ key: 'rack.warning.fit', setting: 'keystones' }])
    expect(frontExtras(withKeys(6, 'right')).warnings).toEqual([{ key: 'rack.warning.fit', setting: 'keystones' }]) // столбец 111 мм выше пластины 2 U
    expect(frontExtras(C({ ...base, units: { auto: false, value: 4 }, keystones: { count: 6, side: 'right' } })).keystones).toHaveLength(6)
  })
  it('кабельные отверстия: одно справа, два по обе стороны, у keystone занятая сторона пропускается', () => {
    const l = caseLayout(base)
    expect(frontExtras(C({ ...base, cable: { count: 1, diameter: 8 } })).cables).toHaveLength(1)
    expect(frontExtras(C({ ...base, cable: { count: 1, diameter: 8 } })).cables[0].x).toBeGreaterThan(0)
    const two = frontExtras(C({ ...base, cable: { count: 2, diameter: 8 } }))
    expect(two.cables.map((c) => Math.sign(c.x)).sort()).toEqual([-1, 1]); two.cables.forEach((c) => expect(c.y).toBeCloseTo(l.centreY, 9))
    const mixed = frontExtras(C({ ...base, keystones: { count: 1, side: 'right' }, cable: { count: 1, diameter: 8 } }))
    expect(mixed.cables[0].x).toBeLessThan(0)
    expect(frontExtras(C({ ...base, keystones: { count: 1, side: 'right' }, cable: { count: 2, diameter: 8 } })).warnings).toEqual([{ key: 'rack.warning.fit', setting: 'cable' }])
  })
  it('в модели: вырезаны ровно заданные проёмы, окно не задето, одна компонента', async () => {
    const p = C({ ...withKeys(2, 'right'), cable: { count: 1, diameter: 8 } })
    const plain = await build(C({ ...base })), m = await build(p)
    const cut = area(plain, 1.5) - area(m, 1.5)
    expect(cut).toBeCloseTo(2 * KEYSTONE_W * KEYSTONE_H + Math.PI * 16, 0) // круг 48-угольником чуть меньше π r²
    expect(m.decompose()).toHaveLength(1)
  })
  it('сочетание, которое не помещается, не вырезается: пластина как без проёмов', async () => {
    const p = C({ ...base, device: dev(200, 80, 40), keystones: { count: 1, side: 'right' } })
    const plain = await build(C({ ...p, keystones: { count: 0, side: 'right' } })), m = await build(p)
    expect(area(m, 1.5)).toBeCloseTo(area(plain, 1.5), 6)
  })
})

import { ventCutters } from './case'
import { getWasm } from '../wasm'

describe('корпус: соты', () => {
  const vp = C({ device: dev(100, 80, 40), vents: { enabled: true, width: 8, wall: 1.6, margin: 6 } })
  it('три вентиляционных выреза лежат в толще стенок и не заходят на края и пластину', async () => {
    const w = await getWasm(), l = caseLayout(vp), cs = ventCutters(w, vp, l)
    expect(cs).toHaveLength(3)
    const top = l.centreY + l.outerH / 2
    const [t, r, lf] = cs.map((c) => c.boundingBox())
    // верх: по Y от внутренней грани стенки наружу, по X и Z внутри отступа
    expect(t.min[1]).toBeCloseTo(top - 2 + 0, 6); expect(t.max[1]).toBeCloseTo(top + 1, 6)
    expect(t.max[0]).toBeLessThanOrEqual(l.outerW / 2 - 6 + 1e-6); expect(t.min[0]).toBeGreaterThanOrEqual(-(l.outerW / 2 - 6) - 1e-6)
    for (const b of [t, r, lf]) { expect(b.max[2]).toBeLessThanOrEqual(-6 + 1e-6); expect(b.min[2]).toBeGreaterThanOrEqual(-l.shellLen + 6 - 1e-6) }
    // бока: по X от внутренней грани наружу, по Y внутри отступа
    expect(r.min[0]).toBeCloseTo(l.outerW / 2 - 2, 6); expect(r.max[0]).toBeCloseTo(l.outerW / 2 + 1, 6)
    expect(lf.max[0]).toBeCloseTo(-(l.outerW / 2 - 2), 6); expect(lf.min[0]).toBeCloseTo(-(l.outerW / 2 + 1), 6)
    for (const b of [r, lf]) { expect(b.max[1]).toBeLessThanOrEqual(l.centreY + l.outerH / 2 - 6 + 1e-6); expect(b.min[1]).toBeGreaterThanOrEqual(l.centreY - l.outerH / 2 + 6 - 1e-6) }
    cs.forEach((c) => c.delete())
  })
  it('в модели убран ровно объём сот в стенках; полость и пластина не тронуты', async () => {
    const off = await build(C({ ...vp, vents: { ...vp.vents, enabled: false } })), on = await build(vp)
    const w = await getWasm(), l = caseLayout(vp)
    const cs = ventCutters(w, vp, l)
    const inWall = cs.reduce((a, c) => a + (c.volume() * 2) / 3, 0) // толщина выреза 3 мм, из них 2 мм стенка и 1 мм воздух
    expect(off.volume() - on.volume()).toBeGreaterThan(50)
    expect(Math.abs(off.volume() - on.volume() - inWall) / inWall).toBeLessThan(0.01)
    expect(area(on, 1.5)).toBeCloseTo(area(off, 1.5), 6) // пластина та же
    expect(on.decompose()).toHaveLength(1)
    // внутренняя полость не изменилась: на глубине, где вент нет (за отступом от пластины), сечение внутри стенок то же
    const s = on.slice(-3), polys = s.toPolygons(); s.delete()
    const inner = polys.map((q) => ({ w: Math.max(...q.map((v) => v[0])) - Math.min(...q.map((v) => v[0])) })).sort((a, b) => a.w - b.w)[0]
    expect(inner.w).toBeCloseTo(100.8, 3)
    cs.forEach((c) => c.delete())
  })
  it('количество сот в верхней стенке совпадает с раскладкой шестиугольников', async () => {
    const { hexCells } = await import('./patterns/hex'), w = await getWasm(), l = caseLayout(vp)
    const box = { width: l.outerW - 12, height: l.shellLen - 12 }
    const n = hexCells(box, { width: 8, wall: 1.6 }).length
    expect(n).toBeGreaterThan(20)
    const [t] = ventCutters(w, vp, l)
    const one = (Math.sqrt(3) / 2) * 64 * 3 // площадь шестиугольника 8 мм между гранями × толщина вырезa 3
    expect(Math.abs(t.volume() - n * one) / (n * one)).toBeLessThan(0.01)
    t.delete()
  })
  it('тонкая стенка сот предупреждает; слишком крупные соты для стенки просто ничего не вырезают', async () => {
    expect(validateRackCase(C({ ...vp, vents: { ...vp.vents, wall: 0.5 } })).warnings).toContainEqual({ key: 'rack.warning.thin', setting: 'ventWall' })
    expect(validateRackCase(vp).warnings).toEqual([])
    const w = await getWasm()
    expect(ventCutters(w, C({ ...vp, vents: { ...vp.vents, width: 40 } }), caseLayout(vp)).length).toBeLessThan(3)
  })
})
