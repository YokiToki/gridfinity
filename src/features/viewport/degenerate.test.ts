import { describe, expect, it } from 'vitest'
import { creaseEdges } from './degenerate'

/** Куб 10 × 10 × 10: 8 вершин, 12 треугольников. */
const CUBE_P = new Float32Array([0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0, 0, 0, 10, 10, 0, 10, 10, 10, 10, 0, 10, 10])
const CUBE_T = new Uint32Array([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7])
const segments = (a: Float32Array) => a.length / 6

describe('creaseEdges', () => {
  it('куб: 12 рёбер плюс по диагонали на грань не рисуется', () => {
    expect(segments(creaseEdges(CUBE_P, CUBE_T))).toBe(12)
  })
  it('плоская пластина из двух треугольников: рёбер-складок нет, только контур', () => {
    const p = new Float32Array([0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0])
    expect(segments(creaseEdges(p, new Uint32Array([0, 1, 2, 0, 2, 3])))).toBe(4) // граничные рёбра (один треугольник)
  })
  it('коллинеарная вершина на ребре куба даёт вырожденный треугольник, но линия по грани не рисуется', () => {
    // добавляем вершину 8 на середине ребра 0-1 верхней грани z = 0: треугольник 0, 8, 1 нулевой площади в плоскости низа куба
    const p = new Float32Array([...CUBE_P, 5, 0, 0])
    const t = new Uint32Array([...CUBE_T.slice(0, 3 * 1), 0, 8, 1, ...CUBE_T.slice(3)])
    // 0,2,1 заменяем на 0,2,8 и 8,2,1: сторона 0-1 разбита, вырожденный треугольник добавлен как пример шума
    const split = new Uint32Array([0, 2, 8, 8, 2, 1, 0, 8, 1, ...CUBE_T.slice(3)])
    void t
    const e = creaseEdges(p, split)
    // все концы отрезков лежат на рёбрах куба (две из трёх координат равны 0 или 10), диагоналей по граням нет
    for (let i = 0; i < e.length; i += 3) { const c = [e[i], e[i + 1], e[i + 2]]; expect(c.filter((v) => v === 0 || v === 10).length).toBeGreaterThanOrEqual(2) }
    const long = [...Array(segments(e)).keys()].filter((s) => Math.hypot(e[s * 6] - e[s * 6 + 3], e[s * 6 + 1] - e[s * 6 + 4], e[s * 6 + 2] - e[s * 6 + 5]) > 11)
    expect(long).toEqual([])
  })
  it('панель стойки: у сетки с пазами длинные линии есть только на внешней кромке, не между концами пазов', async () => {
    const { generate } = await import('../../geometry/model')
    const { defaultRackPanel } = await import('../../geometry/rack/panel')
    const { mesh } = (await generate('rackPanel', { ...defaultRackPanel, units: 2 })).parts[0]
    const n = mesh.vertProperties.length / mesh.numProp, pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = mesh.vertProperties[i * mesh.numProp + k]
    const e = creaseEdges(pos, mesh.triVerts)
    // длинный отрезок допустим только на внешнем контуре панели (кромок y = 0, y = 88.45 и x = ±127)
    for (let k = 0; k < e.length / 6; k++) {
      const len = Math.hypot(e[k * 6] - e[k * 6 + 3], e[k * 6 + 1] - e[k * 6 + 4])
      if (len > 40) {
        const y = [e[k * 6 + 1], e[k * 6 + 4]], x = [e[k * 6], e[k * 6 + 3]]
        expect(y.every((v) => Math.abs(v) < 1e-3 || Math.abs(v - 88.45) < 1e-3) || x.every((v) => Math.abs(Math.abs(v) - 127) < 1e-3)).toBe(true)
      }
    }
  })
})
