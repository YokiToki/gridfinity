import { describe, expect, it } from 'vitest'
import { applyPreset, PRESETS, presetOf, profileValue, type ProfileParams } from './profile'
import { coverage, type PatternParams } from './fields'
import { skeleton } from '../raster/thin'

const prof = (over: Partial<ProfileParams> = {}): ProfileParams => ({ profile: 'bevel', pow: 0.65, steps: 3, ...over })

describe('профили (1.1)', () => {
  it.each(['bevel', 'dome', 'terrace', 'flat', 'engraved'] as const)('%s: значения в [0, 1], не убывают, на плато 1', (k) => {
    let prev = -1
    for (let i = 0; i <= 200; i++) {
      const v = profileValue(i / 200, prof({ profile: k }))
      expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1)
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = v
    }
    expect(profileValue(1, prof({ profile: k }))).toBeCloseTo(1, 9)
    expect(profileValue(5, prof({ profile: k }))).toBeCloseTo(1, 9) // дальше плато
  })
  it('наклон на плато: у dome и bevel нулевой, у кромки — нет', () => {
    for (const k of ['dome', 'bevel'] as const) {
      const p = prof({ profile: k })
      expect((profileValue(1, p) - profileValue(0.999, p)) / 0.001).toBeLessThan(0.02)
    }
    expect((profileValue(0.05, prof({ profile: 'dome' })) - profileValue(0, prof({ profile: 'dome' }))) / 0.05).toBeGreaterThan(1)
  })
  it('terrace: ровно n различных уровней 1/n … 1, на каждом плоско', () => {
    for (const n of [2, 3, 5]) {
      const levels = new Set<number>()
      for (let i = 1; i <= 1000; i++) levels.add(+profileValue(i / 1000, prof({ profile: 'terrace', steps: n })).toFixed(9))
      expect(levels.size).toBe(n)
      expect(Math.min(...levels)).toBeCloseTo(1 / n, 9)
    }
    expect(profileValue(0, prof({ profile: 'terrace', steps: 3 }))).toBe(0)
  })
  it('flat: 0 на кромке, 1 сразу внутри', () => {
    expect(profileValue(0, prof({ profile: 'flat' }))).toBe(0)
    expect(profileValue(0.001, prof({ profile: 'flat' }))).toBe(1)
  })
  it('пресет ↔ параметры: применение даёт тот же пресет, правка превращает в Свой, остальные поля сохраняются', () => {
    for (const k of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) expect(presetOf(applyPreset(prof({ pow: 0.9, steps: 7 }), k))).toBe(k)
    expect(presetOf(prof())).toBe('bevel')
    expect(presetOf(prof({ pow: 0.8 }))).toBe('custom') // правка pow при bevel
    expect(presetOf(applyPreset(prof(), 'terrace'))).toBe('terrace')
    expect(presetOf({ ...applyPreset(prof(), 'terrace'), steps: 4 })).toBe('custom')
    const t = applyPreset({ ...prof(), steps: 9, pow: 0.3 }, 'dome')
    expect(t).toMatchObject({ profile: 'dome', pow: 0.3, steps: 9 }) // dome не трогает pow и steps
  })
})

const P = (over: Partial<PatternParams> = {}): PatternParams => ({ kind: 'lines', pitch: 1.2, width: 0.4, depth: 0.3, angle: 0, offset: 0, staggered: false, scope: 'relief', ...over })
const frac = (p: PatternParams, f: (u: number) => [number, number], from = -6, to = 6, n = 24000) => {
  let c = 0
  for (let i = 0; i < n; i++) { const u = from + ((to - from) * (i + 0.5)) / n; const [x, y] = f(u); c += coverage(p, x, y) }
  return c / n
}

describe('поля узоров (2.1)', () => {
  it('Lines: период и доля ширины — 0,4 из 1,2 на любой трассе поперёк', () => {
    expect(frac(P(), (u) => [u, 0.3])).toBeCloseTo(0.4 / 1.2, 2)
    expect(coverage(P(), 1.2, 7)).toBe(1) // ось полосы на кратном шагу
    expect(coverage(P(), 0.6, 7)).toBe(0) // середина между полосами
    expect(coverage(P(), 0.19, 0)).toBe(1); expect(coverage(P(), 0.21, 0)).toBe(0) // край полосы на ±0,2
    expect(coverage(P(), 0, 100)).toBe(1) // вдоль полос покрытие не меняется
  })
  it('Lines: поворот на 45° поворачивает канавки вокруг центра', () => {
    const p0 = P({ angle: 0 }), p45 = P({ angle: 45 })
    const a = Math.PI / 4
    // точка на оси канавки при угле 45°: u = x·cos + y·sin = 1,2
    const on = [1.2 * Math.cos(a), 1.2 * Math.sin(a)]
    expect(coverage(p45, on[0], on[1])).toBe(1)
    expect(coverage(p0, on[0], on[1])).toBe(0) // та же точка без поворота — не на канавке (x = 0,85)
    // вдоль канавки (направление −sin, cos) покрытие постоянно
    for (const t of [-3, 0.7, 5]) expect(coverage(p45, on[0] - t * Math.sin(a), on[1] + t * Math.cos(a))).toBe(1)
  })
  it('Lines: сдвиг offset смещает канавки', () => {
    expect(coverage(P({ offset: 0.6 }), 0.6, 0)).toBe(1) // u + 0,6 = 1,2 — ось
    expect(coverage(P({ offset: 0.6 }), 0, 0)).toBe(0)
  })
  it('Crosshatch: два направления, доля покрытия ≈ 1 − (1 − w/p)²', () => {
    const p = P({ kind: 'crosshatch', angle: 0 })
    expect(coverage(p, 0.6, 0)).toBe(1) // на оси второго направления (y = 0), между полосами первого
    expect(coverage(p, 0, 0.6)).toBe(1) // на оси первого направления
    expect(coverage(p, 0.6, 0.6)).toBe(0) // между полосами по обоим направлениям
    let c = 0; const n = 200
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c += coverage(p, -6 + ((i + 0.5) * 12) / n, -6 + ((j + 0.5) * 12) / n)
    expect(c / (n * n)).toBeCloseTo(1 - (1 - 0.4 / 1.2) ** 2, 1)
  })
  it('Dots: диаметр 0,5 при шаге 1,5: центры на решётке, шахматный порядок сдвигает ряды', () => {
    const sq = P({ kind: 'dots', pitch: 1.5, width: 0.5, staggered: false })
    expect(coverage(sq, 0, 0)).toBe(1); expect(coverage(sq, 1.5, 1.5)).toBe(1)
    expect(coverage(sq, 0.74, 0)).toBe(0); expect(coverage(sq, 0.2, 0)).toBe(1); expect(coverage(sq, 0.26, 0)).toBe(0) // радиус 0,25
    const st = P({ kind: 'dots', pitch: 1.5, width: 0.5, staggered: true })
    expect(coverage(st, 0, 0)).toBe(1) // чётный ряд
    expect(coverage(st, 0, 1.5)).toBe(0) // нечётный ряд сдвинут на 0,75
    expect(coverage(st, 0.75, 1.5)).toBe(1)
    // доля покрытия ≈ π r² / p² для квадратной решётки
    let c = 0; const n = 300
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c += coverage(sq, -4.5 + ((i + 0.5) * 9) / n, -4.5 + ((j + 0.5) * 9) / n)
    expect(c / (n * n)).toBeCloseTo((Math.PI * 0.25 ** 2) / 1.5 ** 2, 2)
  })
  it('Hex: центр ячейки пуст, граница между ячейками покрыта шириной линии, решётка периодична', () => {
    const p = P({ kind: 'hex', pitch: 2, width: 0.4 })
    expect(coverage(p, 0, 0)).toBe(0) // центр ячейки
    expect(coverage(p, 1, 0)).toBe(1) // середина ребра между центрами (0,0) и (2,0)
    expect(coverage(p, 0.85, 0)).toBe(1); expect(coverage(p, 0.7, 0)).toBe(0) // граница ±0,2 вокруг x = 1
    expect(coverage(p, 2, 0)).toBe(0) // центр соседней ячейки
    expect(coverage(p, 1 + 2, 0)).toBe(coverage(p, 1, 0)) // период pitch
    expect(coverage(p, 1 + 1, Math.sqrt(3))).toBe(coverage(p, 1, 0)) // период по второму базису (1, √3)
  })
  it('Ripples: концентрические кольца вокруг центра', () => {
    const p = P({ kind: 'ripples', pitch: 1.5, width: 0.4 })
    expect(coverage(p, 0, 0)).toBe(1) // кольцо нулевого радиуса
    for (const a of [0, 1, 2, 3]) expect(coverage(p, 3 * Math.cos(a), 3 * Math.sin(a))).toBe(1) // r = 3 — кратно шагу
    expect(coverage(p, 0.75, 0)).toBe(0)
  })
  it('None и нулевой шаг дают 0', () => {
    expect(coverage(P({ kind: 'none' }), 0, 0)).toBe(0)
    expect(coverage(P({ pitch: 0 }), 0, 0)).toBe(0)
  })
})

describe('скелет (для хребта)', () => {
  it('полоса 3 × 21 даёт линию вдоль оси, симметрично', () => {
    const w = 25, h = 9, m = new Uint8Array(w * h)
    for (let y = 3; y < 6; y++) for (let x = 2; x < 23; x++) m[y * w + x] = 1
    const s = skeleton(m, w, h)
    const rows = new Set<number>(); let count = 0
    for (let i = 0; i < s.length; i++) if (s[i]) { rows.add(Math.floor(i / w)); count++ }
    expect(rows.size).toBe(1) // одна линия
    expect([...rows][0]).toBe(4) // по центральной строке
    expect(count).toBeGreaterThan(10)
  })
  it('скелет внутри материала, пустая маска пуста', () => {
    const w = 15, h = 15, m = new Uint8Array(w * h)
    for (let y = 2; y < 13; y++) for (let x = 2; x < 13; x++) m[y * w + x] = 1
    const s = skeleton(m, w, h)
    for (let i = 0; i < s.length; i++) if (s[i]) expect(m[i]).toBe(1)
    expect(skeleton(new Uint8Array(9), 3, 3).every((v) => v === 0)).toBe(true)
  })
})
