import { describe, expect, it } from 'vitest'
import { labelComponents } from '../raster/components'
import { pawBitmap, pawField } from './paw'

const S = 400
const img = pawBitmap(S)
const dark = (x: number, y: number) => img.gray[y * S + x] < 128
const mask = Uint8Array.from(img.gray, (g) => (g < 128 ? 1 : 0))

describe('лапа для картинки карточки (1.1)', () => {
  it('одна связная область: пальцы сросшиеся с подушкой, без островов и отверстий', () => {
    expect(labelComponents(mask, S, S, 1).count).toBe(1)
    expect(labelComponents(mask, S, S, 0).count).toBe(1) // фон тоже одна область: внутри нет дыр
  })

  it('зеркально симметрична относительно вертикальной оси', () => {
    let worst = 0
    for (let y = 0; y < S; y += 3) for (let x = 0; x < S; x++) worst = Math.max(worst, Math.abs(img.gray[y * S + x] - img.gray[y * S + (S - 1 - x)]))
    expect(worst).toBeLessThanOrEqual(1)
  })

  it('на уровне пальцев четыре отдельных пальца с зазорами между ними', () => {
    // на уровне нижних концов пальцев виден каждый из четырёх, между соседними фон
    const runs = (y: number) => { let n = 0, prev = false; for (let x = 0; x < S; x++) { const d = dark(x, y); if (d && !prev) n++; prev = d } return n }
    for (let r = Math.round(0.43 * S); r <= Math.round(0.47 * S); r += 4) expect(runs(r)).toBe(4)
    for (let r = Math.round(0.3 * S); r <= Math.round(0.4 * S); r += 4) expect(runs(r)).toBeGreaterThanOrEqual(2) // выше крайних пальцев — только средние
  })

  it('внизу подушка с выемкой между нижними долями', () => {
    const y = Math.round(0.85 * S)
    const left = dark(Math.round(0.35 * S), y), centre = dark(Math.round(0.5 * S), y)
    expect(left).toBe(true)
    expect(centre).toBe(false)
  })

  it('габарит внутри растра с полем, силуэт занимает основную часть', () => {
    let x0 = S, x1 = -1, y0 = S, y1 = -1
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (dark(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    expect(x0).toBeGreaterThanOrEqual(0.02 * S)
    expect(S - 1 - x1).toBeGreaterThanOrEqual(0.02 * S)
    expect(y0).toBeGreaterThanOrEqual(0.02 * S)
    expect(S - 1 - y1).toBeGreaterThanOrEqual(0.02 * S)
    expect(x1 - x0).toBeGreaterThan(0.6 * S)
    expect(y1 - y0).toBeGreaterThan(0.6 * S)
  })

  it('край сглажен: есть промежуточные яркости, а в глубине материала и на фоне — 0 и 255', () => {
    const mid = img.gray.filter((g) => g > 20 && g < 235).length
    expect(mid).toBeGreaterThan(S) // периметр порядка нескольких тысяч пикселей
    expect(img.gray[Math.round(0.66 * S) * S + Math.round(0.5 * S)]).toBe(0)
    expect(img.gray[0]).toBe(255)
  })

  it('детерминирован; поле расстояний меньше нуля внутри и больше снаружи', () => {
    expect(Array.from(pawBitmap(64).gray)).toEqual(Array.from(pawBitmap(64).gray))
    expect(pawField(0.5, 0.66)).toBeLessThan(0)
    expect(pawField(0.02, 0.02)).toBeGreaterThan(0)
  })
})
