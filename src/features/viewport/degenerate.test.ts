import { describe, expect, it } from 'vitest'
import { dropDegenerate } from './degenerate'

const P = new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 100, 0, 0, 50, 0.000001, 0])
describe('dropDegenerate', () => {
  it('оставляет обычные треугольники тем же массивом', () => {
    const t = new Uint32Array([0, 1, 2])
    expect(dropDegenerate(P, t)).toBe(t)
  })
  it('убирает коллинеарный треугольник, даже длинный и тонкий', () => {
    expect([...dropDegenerate(P, new Uint32Array([0, 3, 4, 0, 1, 2]))]).toEqual([0, 1, 2])
    expect(dropDegenerate(P, new Uint32Array([0, 1, 1])).length).toBe(0)
  })
  it('тонкий, но настоящий треугольник остаётся', () => {
    const q = new Float32Array([0, 0, 0, 100, 0, 0, 50, 1, 0])
    expect(dropDegenerate(q, new Uint32Array([0, 1, 2])).length).toBe(3)
  })
})

describe('панель стойки: коллинеарные концы пазов', () => {
  it('в сетке 3 U с пазами есть вырожденные треугольники на лицевой грани, фильтр их убирает', async () => {
    const { generate } = await import('../../geometry/model')
    const { defaultRackPanel } = await import('../../geometry/rack/panel')
    const { mesh } = (await generate('rackPanel', { ...defaultRackPanel, units: 3 })).parts[0]
    const n = mesh.vertProperties.length / mesh.numProp, pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = mesh.vertProperties[i * mesh.numProp + k]
    const kept = dropDegenerate(pos, mesh.triVerts)
    expect(kept.length).toBeLessThan(mesh.triVerts.length)
  })
})
