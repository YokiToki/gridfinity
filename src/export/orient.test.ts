import { describe, expect, it } from 'vitest'
import { orientMesh } from './orient'
import { generate } from '../geometry/model'
import { defaultCutout } from '../geometry/cutout'

describe('orientMesh', () => {
  it('без поворотов: угол габарита в нуле, низ на z = 0', async () => {
    const r = await generate('cutout', { ...defaultCutout, lip: 'none' })
    const m = orientMesh(r.parts[0].mesh)
    let mnZ = Infinity
    for (let i = 2; i < m.positions.length; i += 3) mnZ = Math.min(mnZ, m.positions[i])
    expect(mnZ).toBeCloseTo(0, 6)
    expect(m.size[0]).toBeCloseTo(83.5, 3); expect(m.size[2]).toBeCloseTo(21, 3)
  })
  it('перевернутая деталь опирается на стол верхом: минимум z = 0, объём не меняется', async () => {
    const r = await generate('cutout', { ...defaultCutout, lip: 'none' })
    const src = r.parts[0].mesh
    const flipped = orientMesh(src, { flip: true })
    let mnZ = Infinity, mxZ = -Infinity
    for (let i = 2; i < flipped.positions.length; i += 3) { mnZ = Math.min(mnZ, flipped.positions[i]); mxZ = Math.max(mxZ, flipped.positions[i]) }
    expect(mnZ).toBeCloseTo(0, 6)
    expect(mxZ).toBeCloseTo(src.max[2] - src.min[2], 4)
    // объём по знаку тетраэдров совпадает (поворот собственный, обход граней не меняется)
    const vol = (p: Float32Array, t: Uint32Array) => {
      let v = 0
      for (let i = 0; i < t.length; i += 3) {
        const a = t[i] * 3, b = t[i + 1] * 3, c = t[i + 2] * 3
        v += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6
      }
      return v
    }
    expect(vol(flipped.positions, flipped.triangles)).toBeCloseTo(src.volume, 0)
  })
  it('поворот на 90° меняет местами размеры в плане', () => {
    const mesh = { vertProperties: Float32Array.from([0, 0, 0, 10, 0, 0, 0, 4, 0, 0, 0, 2]), triVerts: Uint32Array.from([0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2]), numProp: 3, min: [0, 0, 0] as [number, number, number], max: [10, 4, 2] as [number, number, number], volume: 0 }
    const r = orientMesh(mesh, { rotate: true })
    expect(r.size.map((v) => +v.toFixed(6))).toEqual([4, 10, 2])
  })
})
