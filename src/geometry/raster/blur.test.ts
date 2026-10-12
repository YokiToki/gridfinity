import { describe, expect, it } from 'vitest'
import { gaussianBlur, MAX_SIGMA, median3, MIN_SIGMA, sigmaCells } from './blur'

const N = 41
const all = () => new Uint8Array(N * N).fill(1)
const field = (f: (i: number, j: number) => number) => { const a = new Float32Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) a[j * N + i] = f(i, j); return a }
const at = (a: Float32Array, i: number, j: number) => a[j * N + i]

describe('gaussianBlur', () => {
  it('постоянное поле остаётся постоянным, в том числе у краёв и на маске', () => {
    const v = field(() => 0.7)
    const out = gaussianBlur(v, N, N, 3, all())
    for (const x of out) expect(x).toBeCloseTo(0.7, 5)
    const m = new Uint8Array(N * N); for (let j = 5; j < 30; j++) for (let i = 8; i < 33; i++) m[j * N + i] = 1
    const o2 = gaussianBlur(v, N, N, 3, m)
    for (let k = 0; k < N * N; k++) if (m[k]) expect(o2[k]).toBeCloseTo(0.7, 5)
  })
  it('импульс превращается в гауссиан: сумма сохраняется, форма колоколом с заданной сигмой', () => {
    const v = field((i, j) => (i === 20 && j === 20 ? 1 : 0))
    const sigma = 2
    const out = gaussianBlur(v, N, N, sigma, all())
    let sum = 0
    for (const x of out) sum += x
    expect(sum).toBeCloseTo(1, 3)
    const peak = at(out, 20, 20)
    expect(peak).toBeCloseTo(1 / (2 * Math.PI * sigma * sigma), 2) // g(0, 0) = 1 / (2πσ²)
    expect(at(out, 22, 20) / peak).toBeCloseTo(Math.exp(-(2 * 2) / (2 * sigma * sigma)), 1) // на расстоянии σ
    expect(at(out, 20, 22)).toBeCloseTo(at(out, 22, 20), 6) // изотропно
    expect(at(out, 30, 20)).toBeLessThan(1e-4)
  })
  it('сигма 0 — копия без изменений', () => {
    const v = field((i) => i)
    const out = gaussianBlur(v, N, N, 0, all())
    expect(out).not.toBe(v)
    expect(Array.from(out)).toEqual(Array.from(v))
  })
  it('нет утечки через маску: значения снаружи не попадают внутрь, вне маски ничего не меняется', () => {
    const m = new Uint8Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < 20; i++) m[j * N + i] = 1
    const v = field((i) => (i < 20 ? 1 : 100)) // справа от маски огромные значения
    const out = gaussianBlur(v, N, N, 3, m)
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (i < 20) expect(at(out, i, j)).toBeCloseTo(1, 5)
      else expect(at(out, i, j)).toBe(100)
    }
  })
  it('закреплённые узлы не усредняются и не меняются', () => {
    const fixed = new Uint8Array(N * N); for (let j = 0; j < N; j++) for (let i = 20; i < N; i++) fixed[j * N + i] = 1
    const v = field((i) => (i < 20 ? 1 : 50))
    const out = gaussianBlur(v, N, N, 3, all(), fixed)
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) expect(at(out, i, j)).toBeCloseTo(i < 20 ? 1 : 50, 5)
  })
  it('ступенька сглаживается: значение посередине между уровнями, монотонно', () => {
    const v = field((i) => (i < 20 ? 0 : 1))
    const out = gaussianBlur(v, N, N, 3, all())
    expect(at(out, 19, 20)).toBeGreaterThan(0.2)
    expect(at(out, 19, 20)).toBeLessThan(0.5)
    for (let i = 1; i < N; i++) expect(at(out, i, 20)).toBeGreaterThanOrEqual(at(out, i - 1, 20) - 1e-6)
  })
  it('зажим сигмы: радиус в ячейках, минимум и максимум', () => {
    expect(sigmaCells(0, 0.25)).toBe(0)
    expect(sigmaCells(-1, 0.25)).toBe(0)
    expect(sigmaCells(0.01, 0.25)).toBe(MIN_SIGMA)
    expect(sigmaCells(0.5, 0.25)).toBeCloseTo(2, 9)
    expect(sigmaCells(100, 0.1)).toBe(MAX_SIGMA)
  })
  it('огромная сигма не ломает фильтр: ядро ограничено, результат конечный', () => {
    const out = gaussianBlur(field((i, j) => i + j), N, N, 1e6, all())
    for (const x of out) expect(Number.isFinite(x)).toBe(true)
  })
})

describe('median3', () => {
  it('убирает одиночные выбросы и не трогает ровное поле', () => {
    const v = field(() => 0.5)
    v[20 * N + 20] = 1; v[10 * N + 30] = 0
    const out = median3(v, N, N, all())
    expect(at(out, 20, 20)).toBeCloseTo(0.5, 6)
    expect(at(out, 30, 10)).toBeCloseTo(0.5, 6)
  })
  it('граница ступеньки сохраняется (медиана не размывает)', () => {
    const v = field((i) => (i < 20 ? 0 : 1))
    const out = median3(v, N, N, all())
    expect(at(out, 19, 20)).toBe(0)
    expect(at(out, 20, 20)).toBe(1)
  })
  it('считает только соседей-материал и не трогает fixed', () => {
    const m = new Uint8Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < 20; i++) m[j * N + i] = 1
    const v = field((i) => (i < 20 ? 0.2 : 9))
    v[20 * N + 10] = 1 // выброс внутри
    const fixed = new Uint8Array(N * N); fixed[5 * N + 5] = 1
    v[5 * N + 5] = 0.9
    const out = median3(v, N, N, m, fixed)
    expect(at(out, 10, 20)).toBeCloseTo(0.2, 6)
    expect(at(out, 19, 3)).toBeCloseTo(0.2, 6) // справа 9 не влияет
    expect(at(out, 25, 3)).toBe(9)
    expect(at(out, 5, 5)).toBeCloseTo(0.9, 6)
  })
})
