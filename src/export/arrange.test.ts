import { describe, expect, it } from 'vitest'
import { arrange, type Plate, type Rect } from './arrange'

const boxes = (plates: Plate[], rects: Rect[]) => plates.flatMap((p, pi) => p.items.map((it) => {
  const r = rects[it.index], w = it.rotated ? r.h : r.w, h = it.rotated ? r.w : r.h
  return { plate: pi, x0: it.x, y0: it.y, x1: it.x + w, y1: it.y + h, index: it.index }
}))
const overlap = (a: ReturnType<typeof boxes>[number], b: ReturnType<typeof boxes>[number]) => a.plate === b.plate && a.x0 < b.x1 - 1e-9 && b.x0 < a.x1 - 1e-9 && a.y0 < b.y1 - 1e-9 && b.y0 < a.y1 - 1e-9

describe('arrange', () => {
  const area = { x: 246, y: 246 }
  it('четыре детали 120 × 120 при зазоре 6 помещаются на одну плиту без наложений', () => {
    const rects = Array.from({ length: 4 }, () => ({ w: 120, h: 120 }))
    const plates = arrange(rects, area, 6)
    expect(plates).toHaveLength(1)
    const b = boxes(plates, rects)
    expect(b).toHaveLength(4)
    for (const x of b) { expect(x.x0).toBeGreaterThanOrEqual(0); expect(x.y0).toBeGreaterThanOrEqual(0); expect(x.x1).toBeLessThanOrEqual(246 + 1e-9); expect(x.y1).toBeLessThanOrEqual(246 + 1e-9) }
    for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) expect(overlap(b[i], b[j])).toBe(false)
  })
  it('между деталями соблюдается зазор', () => {
    const rects = [{ w: 100, h: 50 }, { w: 100, h: 50 }]
    const b = boxes(arrange(rects, area, 10), rects)
    const gapX = Math.max(b[1].x0 - b[0].x1, b[0].x0 - b[1].x1), gapY = Math.max(b[1].y0 - b[0].y1, b[0].y0 - b[1].y1)
    expect(Math.max(gapX, gapY)).toBeGreaterThanOrEqual(10 - 1e-9)
  })
  it('не влезают на одну плиту: несколько плит, все детали размещены ровно по разу', () => {
    const rects = Array.from({ length: 5 }, () => ({ w: 150, h: 150 }))
    const plates = arrange(rects, area, 6)
    expect(plates.length).toBeGreaterThan(1)
    const idx = plates.flatMap((p) => p.items.map((i) => i.index)).sort()
    expect(idx).toEqual([0, 1, 2, 3, 4])
    const b = boxes(plates, rects)
    for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) expect(overlap(b[i], b[j])).toBe(false)
    expect(plates.every((p) => !p.overflow)).toBe(true)
  })
  it('вытянутая деталь, влезающая только повёрнутой, поворачивается', () => {
    const r = [{ w: 300, h: 100 }]
    const plates = arrange(r, { x: 120, y: 320 }, 5)
    expect(plates[0].items[0].rotated).toBe(true)
    expect(plates[0].overflow).toBe(false)
  })
  it('деталь больше стола в любой ориентации: отдельная плита с переполнением', () => {
    const plates = arrange([{ w: 400, h: 400 }, { w: 50, h: 50 }], area, 6)
    expect(plates).toHaveLength(2)
    expect(plates.filter((p) => p.overflow)).toHaveLength(1)
    expect(plates.flatMap((p) => p.items).map((i) => i.index).sort()).toEqual([0, 1])
  })
  it('пусто — ни одной плиты', () => expect(arrange([], area, 6)).toEqual([]))
})
