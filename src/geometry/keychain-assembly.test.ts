import { describe, expect, it } from 'vitest'
import { buildKeychainParts, defaultKeychain, defaultSplit, type KeychainParams } from './keychain'
import { apply, bottomAssembly, identity, openOffsets, pinAssembly, withOpenGap } from './keychainAssembly'
import { getWasm } from './wasm'
import type { GrayImage } from './raster/threshold'

/** Буква «Г»: несимметричный силуэт, чтобы перепутанное отражение было заметно. */
function lShape(): GrayImage {
  const W = 200, H = 200, gray = new Uint8Array(W * H).fill(255)
  for (let y = 20; y < 180; y++) for (let x = 20; x < 180; x++) if (x < 70 || y > 130) gray[y * W + x] = 0
  return { width: W, height: H, gray, alpha: null }
}
const P = (over: Partial<KeychainParams> = {}): KeychainParams => ({
  ...defaultKeychain, imageId: 'img',
  silhouette: { ...defaultKeychain.silhouette, close: 0, speck: 0, grow: 0 },
  quality: { cell: 0.3, maxTriangles: 400_000 },
  split: { ...defaultSplit, enabled: true, pins: 3, pinRadius: 0.9, clearance: 0.1, pinDepth: 1 },
  ...over,
})

describe('сборка половин брелка (1.1)', () => {
  it('нижняя половина после матрицы = зеркало верхней относительно z = 0; штифты в отверстиях; половины касаются на плоскости', async () => {
    const w = await getWasm()
    const r = buildKeychainParts(w, P(), new Map([['img', lShape()]]))
    const a = r.assembly!
    expect(Object.keys(a)).toEqual(['top', 'bottom', 'pin1', 'pin2', 'pin3'])
    const [top, bottom, ...pins] = r.parts.map((q) => q.solid)
    const placed = bottom.transform(a.bottom)
    const mirrored = top.mirror([0, 0, 1])
    const same = placed.intersect(mirrored)
    expect(placed.volume()).toBeGreaterThan(0) // положительный объём: не вывернута
    expect(same.volume()).toBeCloseTo(mirrored.volume(), 6)
    expect(placed.volume()).toBeCloseTo(mirrored.volume(), 6)
    const bt = top.boundingBox(), bb = placed.boundingBox()
    expect(bt.min[2]).toBeCloseTo(0, 9)
    expect(bb.max[2]).toBeCloseTo(0, 9) // закрытые половины касаются ровно по плоскости
    expect(bb.min[0]).toBeCloseTo(bt.min[0], 6) // тот же габарит по xy, нижняя на столько же ниже плоскости, насколько верхняя выше
    expect(bb.min[1]).toBeCloseTo(bt.min[1], 6)
    expect(bb.min[2]).toBeCloseTo(-bt.max[2], 6)
    // штифты: центр на оси отверстия, середина по длине на плоскости разъёма, в зазоре (не пересекают материал)
    const holes = r.info.mountInfo!.pins.filter((q) => q.used)
    const both = top.add(placed)
    pins.forEach((pin, i) => {
      const moved = pin.transform(a[`pin${i + 1}`])
      const b = moved.boundingBox()
      expect((b.min[0] + b.max[0]) / 2).toBeCloseTo(holes[i].x, 6)
      expect((b.min[1] + b.max[1]) / 2).toBeCloseTo(holes[i].y, 6)
      expect((b.min[2] + b.max[2]) / 2).toBeCloseTo(0, 9)
      expect(moved.intersect(both).volume()).toBeCloseTo(0, 6)
    })
    r.parts.forEach((q) => q.solid.delete())
  })

  it('без режима половин сборки нет', async () => {
    const w = await getWasm()
    const r = buildKeychainParts(w, P({ split: { ...defaultSplit, enabled: false } }), new Map([['img', lShape()]]))
    expect(r.assembly).toBeUndefined()
    r.parts.forEach((q) => q.solid.delete())
  })
})

describe('матрицы сборки (чистые)', () => {
  it('нижняя: (x, −y, z) + сдвиг листа возвращается в (x, y, −z)', () => {
    const tx = 40, ty = 3
    const onSheet: [number, number, number] = [5 + tx, -7 + ty, 2]
    expect(apply(bottomAssembly(tx, ty), onSheet)).toEqual([5, 7, -2])
  })
  it('штифт переносится в отверстие и центрируется по длине', () => {
    const m = pinAssembly({ x: 10, y: -4 }, { x: 1, y: 2 }, 1.6)
    expect(apply(m, [10, -4, 0])).toEqual([1, 2, -0.8])
    expect(apply(m, [10, -4, 1.6])[2]).toBeCloseTo(0.8, 12)
  })
  it('идентичность не двигает точку', () => {
    expect(apply(identity(), [1, 2, 3])).toEqual([1, 2, 3])
  })
})

describe('раздвижка (1.2)', () => {
  it('±gap/2 у половин, штифты на плоскости', () => {
    expect(openOffsets('top', 6)).toBe(3)
    expect(openOffsets('bottom', 6)).toBe(-3)
    expect(openOffsets('pin2', 6)).toBe(0)
  })
  it('gap = 0 оставляет матрицу как есть, а исходную не меняет', () => {
    const m = bottomAssembly(1, 2)
    expect(withOpenGap('bottom', m, 0)).toEqual(m)
    const o = withOpenGap('top', identity(), 6)
    expect(o[14]).toBe(3)
    expect(identity()[14]).toBe(0)
  })
  it('вся раздвижка: верх +3, низ −3 по Z', () => {
    const t = apply(withOpenGap('top', identity(), 6), [0, 0, 0])
    const b = apply(withOpenGap('bottom', bottomAssembly(0, 0), 6), [0, 0, 0])
    expect(t[2]).toBe(3)
    expect(b[2]).toBe(-3)
  })
})
