import { describe, expect, it } from 'vitest'
import { getWasm } from '../../wasm'
import { buildRackPanel, defaultRackPanel, type RackPanelParams } from '../panel'
import { cutPattern } from '.'
import { hexCells, hexRadius } from './hex'
import { skadisCut, skadisSlots } from './skadis'
import { defaultPattern, type PatternParams } from './types'

const SK = defaultPattern.skadis
const pat = (o: Partial<PatternParams>): PatternParams => ({ ...defaultPattern, ...o })

describe('Skadis', () => {
  it('область 100 × 60: три ряда (−20, 0, 20), в чётных три паза, в нечётном два со сдвигом, всего 8', () => {
    const slots = skadisSlots({ width: 100, height: 60 }, SK)
    expect(slots).toHaveLength(8)
    const row = (y: number) => slots.filter((s) => s.y === y).map((s) => s.x).sort((a, b) => a - b)
    expect(row(-20)).toEqual([-40, 0, 40]); expect(row(0)).toEqual([-20, 20]); expect(row(20)).toEqual([-40, 0, 40])
  })
  it('каждый паз целиком внутри области; поля слева и справа равны', () => {
    for (const [w, h] of [[100, 60], [212.25, 82.9], [73, 31]] as const) {
      const slots = skadisSlots({ width: w, height: h }, SK)
      expect(slots.length).toBeGreaterThan(0)
      for (const s of slots) { expect(Math.abs(s.x) + SK.slotWidth / 2).toBeLessThanOrEqual(w / 2 + 1e-9); expect(Math.abs(s.y) + SK.slotLength / 2).toBeLessThanOrEqual(h / 2 + 1e-9) }
      expect(Math.min(...slots.map((s) => s.x)) + Math.max(...slots.map((s) => s.x))).toBeCloseTo(0, 9)
    }
  })
  it('область меньше паза — узора нет', () => {
    expect(skadisSlots({ width: 4, height: 60 }, SK)).toEqual([])
    expect(skadisSlots({ width: 100, height: 10 }, SK)).toEqual([])
  })
  it('вырез: площадь равна числу пазов на площадь паза', async () => {
    const w = await getWasm()
    const cut = skadisCut(w, { width: 100, height: 60 }, SK)!
    const exact = 8 * (5 * 10 + Math.PI * 2.5 ** 2)
    expect(Math.abs(cut.area() - exact) / exact).toBeLessThan(0.005)
  })
})

describe('поворот и размещение', () => {
  const region = { x0: -50, x1: 50, y0: 0, y1: 60 }
  it('поворот на 90° меняет оси: узор строится в области 60 × 100 и ложится в область', async () => {
    const w = await getWasm()
    const flat = cutPattern(w, pat({ kind: 'skadis' }), region)!, turned = cutPattern(w, pat({ kind: 'skadis', rotate: true }), region)!
    for (const cs of [flat, turned]) { const b = cs.bounds(); expect(b.min[0]).toBeGreaterThanOrEqual(-50 - 1e-6); expect(b.max[0]).toBeLessThanOrEqual(50 + 1e-6); expect(b.min[1]).toBeGreaterThanOrEqual(-1e-6); expect(b.max[1]).toBeLessThanOrEqual(60 + 1e-6) }
    const fb = flat.bounds(), tb = turned.bounds()
    // без поворота пазы вертикальные, с поворотом лежат: узкая сторона пазов меняется с X на Y
    expect(fb.max[1] - fb.min[1]).toBeGreaterThan(40); expect(tb.max[0] - tb.min[0]).toBeGreaterThan(60)
    expect(turned.area()).toBeGreaterThan(0)
  })
  it('вырез центрирован в области', async () => {
    const w = await getWasm()
    const b = cutPattern(w, pat({ kind: 'skadis' }), region)!.bounds()
    expect((b.min[0] + b.max[0]) / 2).toBeCloseTo(0, 6); expect((b.min[1] + b.max[1]) / 2).toBeCloseTo(30, 6)
  })
  it('пустая область даёт null', async () => {
    const w = await getWasm()
    expect(cutPattern(w, pat({ kind: 'skadis' }), { x0: 0, x1: 0, y0: 0, y1: 10 })).toBeNull()
  })
})

describe('соты', () => {
  const H = defaultPattern.hex
  it('соседние ячейки на расстоянии width + wall, а значит стенка равна wall', () => {
    const cells = hexCells({ width: 100, height: 60 }, H)
    expect(cells.length).toBeGreaterThan(10)
    let min = Infinity
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) min = Math.min(min, Math.hypot(cells[i].x - cells[j].x, cells[i].y - cells[j].y))
    expect(min).toBeCloseTo(H.width + H.wall, 9)
  })
  it('все ячейки целиком в области, группа симметрична по X и Y', () => {
    for (const [w, h] of [[100, 60], [212.25, 82.9]] as const) {
      const cells = hexCells({ width: w, height: h }, H), R = hexRadius(H.width)
      for (const c of cells) { expect(Math.abs(c.x) + R).toBeLessThanOrEqual(w / 2 + 1e-9); expect(Math.abs(c.y) + H.width / 2).toBeLessThanOrEqual(h / 2 + 1e-9) }
      expect(Math.min(...cells.map((c) => c.x)) + Math.max(...cells.map((c) => c.x))).toBeCloseTo(0, 9)
      expect(Math.min(...cells.map((c) => c.y)) + Math.max(...cells.map((c) => c.y))).toBeCloseTo(0, 9)
    }
  })
  it('площадь отверстия — правильный шестиугольник со стороной между гранями width', async () => {
    const w = await getWasm()
    const cut = cutPattern(w, pat({ kind: 'hex' }), { x0: -10, x1: 10, y0: 0, y1: 9 })!
    expect(cut.area()).toBeCloseTo((Math.sqrt(3) / 2) * H.width ** 2, 3)
  })
})

describe('панель с узором остаётся одним куском', () => {
  const panel = (kind: 'skadis' | 'hex', rotate = false): RackPanelParams => ({ ...defaultRackPanel, pattern: pat({ kind, rotate }) })
  it.each([['skadis', false], ['skadis', true], ['hex', false], ['hex', true]] as const)('%s, поворот %s', async (kind, rotate) => {
    const r = await buildRackPanel(panel(kind, rotate))
    expect(r.error).toBeUndefined()
    const parts = r.panel!.decompose(); expect(parts).toHaveLength(1)
    const plain = (await buildRackPanel(defaultRackPanel)).panel!
    expect(r.panel!.volume()).toBeLessThan(plain.volume() * 0.99)
    expect(r.panel!.genus()).toBeGreaterThan(10)
  })
})

describe('таблетки, линии, проём', () => {
  const box = { width: 100, height: 60 }
  it('таблетки: сетка с шагом width + wall, без краевых', async () => {
    const { pillsLayout } = await import('./pills')
    const p = { ...defaultPattern.pills, edgePills: false }
    const cells = pillsLayout(box, p)
    // по X: floor((100 − 6) / 8) + 1 = 12, по Y: floor((60 − 20) / 22) + 1 = 2
    expect(cells).toHaveLength(24)
    expect(new Set(cells.map((c) => c.height))).toEqual(new Set([20]))
  })
  it('краевые таблетки занимают остаток, не короче своей ширины', async () => {
    const { pillsLayout } = await import('./pills')
    // две строки по 20 и стенка 2: занято 42, остаток (60 − 42) / 2 = 9 минус стенка 2 = 7 мм ≥ ширины 6
    const p = { ...defaultPattern.pills, edgePills: true }
    const cells = pillsLayout(box, p)
    const edge = cells.filter((c) => c.height < 20)
    expect(edge).toHaveLength(24)
    edge.forEach((c) => expect(c.height).toBeCloseTo(7, 9))
    // остаток слишком мал для ширины 10: краевых нет
    expect(pillsLayout(box, { ...p, width: 10 }).filter((c) => c.height < 20)).toHaveLength(0)
    // все таблетки внутри области
    cells.forEach((c) => { expect(Math.abs(c.y) + c.height / 2).toBeLessThanOrEqual(30 + 1e-9); expect(Math.abs(c.x) + c.width / 2).toBeLessThanOrEqual(50 + 1e-9) })
  })
  it('линии: ряды height + wall на всю ширину', async () => {
    const w = await getWasm()
    const { lineRows } = await import('./lines')
    expect(lineRows(box, defaultPattern.lines)).toHaveLength(12) // floor((60 − 3) / 5) + 1
    const b = cutPattern(w, pat({ kind: 'lines' }), { x0: -50, x1: 50, y0: 0, y1: 60 })!.bounds()
    expect(b.max[0] - b.min[0]).toBeCloseTo(100, 6)
  })
  it('проём с дополнительной кромкой', async () => {
    const w = await getWasm()
    const b = cutPattern(w, pat({ kind: 'passthrough', passthrough: { borderX: 5, borderY: 8, radius: 3 } }), { x0: -50, x1: 50, y0: 0, y1: 60 })!.bounds()
    expect(b.max[0] - b.min[0]).toBeCloseTo(90, 6); expect(b.max[1] - b.min[1]).toBeCloseTo(44, 6)
    expect(cutPattern(w, pat({ kind: 'passthrough', passthrough: { borderX: 60, borderY: 0, radius: 3 } }), { x0: -50, x1: 50, y0: 0, y1: 60 })).toBeNull()
  })
})

describe('все узоры в панели', () => {
  it.each(['pills', 'lines', 'passthrough'] as const)('%s: один кусок, объём меньше гладкой панели', async (kind) => {
    const r = await buildRackPanel({ ...defaultRackPanel, pattern: pat({ kind }) })
    expect(r.error).toBeUndefined()
    const parts = r.panel!.decompose(); expect(parts).toHaveLength(1)
    expect(r.panel!.volume()).toBeLessThan((await buildRackPanel(defaultRackPanel)).panel!.volume() * 0.99)
  })
  it('проём с кромкой 0 и маржей 3: рамка вокруг окна остаётся, панель цела', async () => {
    const r = await buildRackPanel({ ...defaultRackPanel, pattern: pat({ kind: 'passthrough' }) })
    expect(r.error).toBeUndefined(); expect(r.panel!.genus()).toBe(12 + 1) // 12 отверстий в ушах 2 U и проём
  })
})

describe('предупреждения о тонком', () => {
  it('стенка меньше 0.8 мм называет настройку', async () => {
    const { validateRackPanel } = await import('../panel')
    const w = validateRackPanel({ ...defaultRackPanel, pattern: pat({ kind: 'hex', hex: { width: 8, wall: 0.5 } }) }).warnings
    expect(w).toEqual([{ key: 'rack.warning.thin', setting: 'wall' }])
    expect(validateRackPanel({ ...defaultRackPanel, pattern: pat({ kind: 'hex' }) }).warnings).toEqual([])
    expect(validateRackPanel({ ...defaultRackPanel, pattern: pat({ kind: 'lines', margin: 0.5, lines: { height: 0.6, wall: 2 } }) }).warnings.map((x) => x.setting)).toEqual(['height', 'margin'])
  })
  it('узор без цельной панели отвергается: поля 0 и пазы режут перемычки', async () => {
    // одна строка линий на всю ширину окна при marginе 0 и панели 1 U: полоса над и под щелью остаётся, но щель во всю высоту режет кусок
    const r = await buildRackPanel({ ...defaultRackPanel, units: 1, tolerance: false, cornerRadius: 0, pattern: pat({ kind: 'passthrough', margin: 0, passthrough: { borderX: 0, borderY: 0, radius: 0 } }) })
    expect(r.panel).toBeNull(); expect(r.error).toBe('rack.error.disconnected')
  })
})
