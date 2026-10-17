import { describe, expect, it } from 'vitest'
import type { Rectified } from './homography'
import { paperSize } from './paper'
import { defaultSegmentParams, dropFor, segment } from './segment'

const A4 = paperSize('a4', 'landscape')
type Painter = (x: number, y: number) => number | null // яркость в точке листа (мм) или null — лист

/** Выпрямленный лист напрямую: яркость листа задаёт paper(x, y), предметы — painters (первый непустой побеждает). */
function sheet(paper: (x: number, y: number) => number, objects: Painter[] = [], size = A4): Rectified {
  const scale = 4
  const w = Math.round(size.width * scale), h = Math.round(size.height * scale)
  const gray = new Uint8Array(w * h)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = (i + 0.5) / scale, y = (j + 0.5) / scale
    let v: number | null = null
    for (const o of objects) { v = o(x, y); if (v !== null) break }
    gray[j * w + i] = Math.round(v ?? paper(x, y))
  }
  return { image: { width: w, height: h, gray, alpha: null }, scale, paper: size }
}
const flat = (v = 235) => () => v
const rect = (x: number, y: number, w: number, h: number, g = 40): Painter => (px, py) => (px >= x && px <= x + w && py >= y && py <= y + h ? g : null)
const disc = (cx: number, cy: number, r: number, g = 40): Painter => (px, py) => (Math.hypot(px - cx, py - cy) <= r ? g : null)
const ring = (cx: number, cy: number, r: number, hole: number, g = 40): Painter => (px, py) => { const d = Math.hypot(px - cx, py - cy); return d <= r && d >= hole ? g : null }

describe('выделение силуэтов (1.2)', () => {
  it('прямоугольник 40 × 20 мм находится одним силуэтом нужного размера (±0.5 мм) и площади', () => {
    const r = segment(sheet(flat(), [rect(60, 50, 40, 20)]))
    expect(r.silhouettes).toHaveLength(1)
    const s = r.silhouettes[0]
    expect(Math.abs(s.widthMm - 40)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(s.heightMm - 20)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(s.areaMm2 - 800) / 800).toBeLessThan(0.03)
  })

  it('градиент освещения поперёк листа не даёт ложного предмета', () => {
    const r = segment(sheet((x, y) => 235 * (1 - 0.4 * (x / A4.width) - 0.1 * (y / A4.height))))
    expect(r.silhouettes).toEqual([])
  })

  it('градиент не мешает найти предмет у тёмного края листа', () => {
    const r = segment(sheet((x) => 235 * (1 - 0.4 * (x / A4.width)), [rect(240, 90, 30, 30, 70)]))
    expect(r.silhouettes).toHaveLength(1)
    expect(Math.abs(r.silhouettes[0].widthMm - 30)).toBeLessThanOrEqual(0.6)
  })

  it('большой тёмный предмет (около 30 % листа) всё равно один силуэт, а не фон', () => {
    const r = segment(sheet(flat(), [rect(60, 40, 150, 120)]))
    expect(r.silhouettes).toHaveLength(1)
    expect(Math.abs(r.silhouettes[0].widthMm - 150)).toBeLessThanOrEqual(0.6)
    expect(Math.abs(r.silhouettes[0].heightMm - 120)).toBeLessThanOrEqual(0.6)
  })

  it('два отдельных предмета — два силуэта в порядке обхода сверху вниз, с метками в labels', () => {
    const r = segment(sheet(flat(), [rect(20, 100, 30, 30), disc(150, 40, 12)]))
    expect(r.silhouettes.map((s) => s.id)).toEqual([1, 2])
    expect(r.silhouettes[0].widthMm).toBeCloseTo(24, 0) // диск встретился раньше по строкам
    const first = r.silhouettes[0], second = r.silhouettes[1]
    expect(r.labels[Math.round((first.bbox[1] + first.bbox[3]) / 2) * r.width + Math.round((first.bbox[0] + first.bbox[2]) / 2)]).toBe(1)
    expect(r.labels[Math.round((second.bbox[1] + second.bbox[3]) / 2) * r.width + Math.round((second.bbox[0] + second.bbox[2]) / 2)]).toBe(2)
    expect(r.labels[0]).toBe(0)
  })

  it('чувствительность: бледный предмет находится при высокой и пропадает при низкой, число силуэтов монотонно', () => {
    const faint = sheet(flat(), [rect(60, 50, 40, 30, 190)]) // на 19 % темнее листа
    const counts = [0, 0.25, 0.5, 0.75, 1].map((sens) => segment(faint, { sensitivity: sens }).silhouettes.length)
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
    expect(counts[0]).toBe(0)
    expect(counts[4]).toBe(1)
  })

  it('чувствительность: порог падения яркости убывает от 50 % до 8 %, значения вне диапазона зажимаются', () => {
    expect(dropFor(0)).toBeCloseTo(0.5, 9)
    expect(dropFor(1)).toBeCloseTo(0.08, 9)
    expect(dropFor(-3)).toBe(dropFor(0))
    expect(dropFor(9)).toBe(dropFor(1))
    const r = segment(sheet(flat(), [rect(60, 50, 40, 30)]), { sensitivity: 9 })
    expect(r.sensitivity).toBe(1)
  })

  it('автоматическая чувствительность лежит в 0…1 и находит обычный тёмный предмет без подсказок', () => {
    const r = segment(sheet(flat(), [rect(60, 50, 40, 30), disc(180, 120, 20)]))
    expect(r.defaultSensitivity).toBeGreaterThanOrEqual(0)
    expect(r.defaultSensitivity).toBeLessThanOrEqual(1)
    expect(r.sensitivity).toBe(r.defaultSensitivity)
    expect(r.silhouettes).toHaveLength(2)
  })

  it('пятна меньше 2 мм² и силуэты тоньше 3 мм игнорируются', () => {
    const r = segment(sheet(flat(), [disc(50, 50, 0.6), rect(100, 60, 2, 40), rect(150, 60, 20, 20)]))
    expect(r.silhouettes).toHaveLength(1)
    expect(r.silhouettes[0].widthMm).toBeCloseTo(20, 0)
  })

  it('поле по краю: полоса стола вдоль края листа и предмет целиком в поле не находятся; предмет у поля обрезается', () => {
    const strip = (x: number, y: number) => (x < 2 || y < 2 || x > A4.width - 2 || y > A4.height - 2 ? 50 : null)
    const edgeObject = rect(1, 90, 2.5, 30) // целиком в поле 3 мм
    expect(segment(sheet(flat(), [strip, edgeObject]), { margin: 3 }).silhouettes).toEqual([])
    const cut = segment(sheet(flat(), [rect(0, 90, 30, 30)]), { margin: 3 }) // уходит за край: остаётся часть вне поля
    expect(cut.silhouettes).toHaveLength(1)
    expect(cut.silhouettes[0].bbox[0]).toBeGreaterThanOrEqual(Math.round(3 * 4))
    const noMargin = segment(sheet(flat(), [rect(0, 90, 30, 30)]), { margin: 0 })
    expect(noMargin.silhouettes[0].bbox[0]).toBe(0)
  })

  it('замкнутая щель внутри предмета заливается: кольцо — один силуэт полной площади, метки и в щели', () => {
    const r = segment(sheet(flat(), [ring(150, 100, 25, 12)]))
    expect(r.silhouettes).toHaveLength(1)
    expect(Math.abs(r.silhouettes[0].areaMm2 - Math.PI * 25 * 25) / (Math.PI * 25 * 25)).toBeLessThan(0.03)
    expect(r.labels[100 * 4 * r.width + 150 * 4]).toBe(1) // центр щели
  })

  it('нет предметов — пустой результат, метки нулевые', () => {
    const r = segment(sheet(flat()))
    expect(r.silhouettes).toEqual([])
    expect(r.labels.every((v) => v === 0)).toBe(true)
  })

  it('параметры по умолчанию: поле 3 мм, склейка 0.8, пятна 2 мм², минимум 3 мм', () => {
    expect(defaultSegmentParams).toEqual({ margin: 3, close: 0.8, minSpeck: 2, minSize: 3 })
  })
})
