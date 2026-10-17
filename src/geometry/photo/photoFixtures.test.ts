import { describe, expect, it } from 'vitest'
import { rectify } from './homography'
import { paperSize } from './paper'
import { segment, type Silhouette } from './segment'
import { loadFixture } from './fixtures/load'

const A4 = paperSize('a4', 'portrait')
const run = (name: 'flash' | 'noflash') => {
  const f = loadFixture(name)
  const r = rectify(f.gray, f.corners, A4, f.color.rgb)!
  return segment(r)
}
/** Силуэты по левому краю (как лежат на обоих снимках): плоскогубцы слева, отвёртка в середине, кусачки справа. */
const tools = (silhouettes: Silhouette[]) => {
  const bySize = [...silhouettes].sort((a, b) => a.bbox[0] - b.bbox[0])
  return { pliers: bySize[0], screwdriver: bySize[1], cutters: bySize[2] }
}

describe('реальные фото владельца: инструменты на A4 (25a 1.3)', () => {
  const flash = run('flash'), noflash = run('noflash')

  it('(a) на обоих снимках ровно три силуэта: инструменты не распались и не слиплись', () => {
    expect(flash.silhouettes).toHaveLength(3)
    expect(noflash.silhouettes).toHaveLength(3)
  })

  it('размеры инструментов правдоподобны: плоскогубцы около 63 × 174 мм, кусачки 79 × 129, отвёртка 33 × 192', () => {
    const t = tools(flash.silhouettes)
    expect(t.pliers.widthMm).toBeGreaterThan(60); expect(t.pliers.widthMm).toBeLessThan(66)
    expect(t.pliers.heightMm).toBeGreaterThan(170); expect(t.pliers.heightMm).toBeLessThan(178)
    expect(t.cutters.widthMm).toBeGreaterThan(75); expect(t.cutters.widthMm).toBeLessThan(83)
    expect(t.screwdriver.heightMm).toBeGreaterThan(188); expect(t.screwdriver.heightMm).toBeLessThan(196)
  })

  it('(b) без вспышки размеры тех же инструментов отличаются от размеров со вспышкой не больше чем на 3 мм, площади не больше чем на 8 %', () => {
    const a = tools(flash.silhouettes), b = tools(noflash.silhouettes)
    for (const key of ['pliers', 'cutters', 'screwdriver'] as const) {
      expect(Math.abs(a[key].widthMm - b[key].widthMm), `${key} ширина`).toBeLessThanOrEqual(3)
      expect(Math.abs(a[key].heightMm - b[key].heightMm), `${key} высота`).toBeLessThanOrEqual(3)
      expect(Math.abs(a[key].areaMm2 - b[key].areaMm2) / a[key].areaMm2, `${key} площадь`).toBeLessThanOrEqual(0.08)
    }
  })

  it('(c) тень не раздувает плоскогубцы: без вспышки они не больше версии со вспышкой более чем на 1.5 мм', () => {
    const a = tools(flash.silhouettes).pliers, b = tools(noflash.silhouettes).pliers
    expect(b.widthMm - a.widthMm).toBeLessThanOrEqual(1.5)
    expect(b.heightMm - a.heightMm).toBeLessThanOrEqual(1.5)
  })

  it('без учёта цвета и теней (прежний конвейер) на тех же снимках результат хуже: со вспышкой распадается, без вспышки раздут', () => {
    const f = loadFixture('flash'), g = loadFixture('noflash')
    const legacyFlash = segment(rectify(f.gray, f.corners, A4)!)
    const legacyNoFlash = segment(rectify(g.gray, g.corners, A4)!)
    expect(legacyFlash.silhouettes.length).not.toBe(3)
    const wide = Math.max(...legacyNoFlash.silhouettes.map((s) => s.widthMm))
    expect(wide).toBeGreaterThan(tools(noflash.silhouettes).cutters.widthMm + 2)
  })
})
