import { describe, expect, it } from 'vitest'
import { ISO } from './projection'
import { defaultArtOptions, renderSvg } from './svg'
import type { TriMesh } from './raster'

const cube = (): TriMesh => {
  const v = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]
  const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]]
  return { positions: Float32Array.from(v.flat()), triangles: Uint32Array.from(f.flat()) }
}

describe('renderSvg', () => {
  it('куб: viewBox как в настройках, три тона и контур, цветов в файле нет', () => {
    const svg = renderSvg(cube(), ISO)
    expect(svg).toContain(`viewBox="0 0 ${defaultArtOptions.width} ${defaultArtOptions.height}"`)
    const classes = [...svg.matchAll(/class="(art-[a-z0-9]+)"/g)].map((m) => m[1])
    expect(classes.filter((c) => c.startsWith('art-t')).length).toBeGreaterThanOrEqual(3)
    expect(classes).toContain('art-edge')
    expect(svg).not.toMatch(/fill="/)
    expect(svg).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })
  it('результат детерминирован', () => expect(renderSvg(cube(), ISO)).toBe(renderSvg(cube(), ISO)))
  it('общий масштаб делает фигуру меньше, чем подогнанную под рамку', () => {
    const big = renderSvg(cube(), ISO), small = renderSvg(cube(), ISO, defaultArtOptions, 10)
    expect(small.length).toBeLessThanOrEqual(big.length)
    expect(small).not.toBe(big)
  })
  it('smooth: по умолчанию вывод прежний, с smooth другой, но стабильный, цветов по-прежнему нет', () => {
    const base = renderSvg(cube(), ISO)
    expect(renderSvg(cube(), ISO, { ...defaultArtOptions, smooth: undefined })).toBe(base)
    expect(renderSvg(cube(), ISO, { ...defaultArtOptions, smooth: 0 })).toBe(base)
    const sm = renderSvg(cube(), ISO, { ...defaultArtOptions, smooth: 0.9 })
    expect(sm).not.toBe(base)
    expect(sm).toBe(renderSvg(cube(), ISO, { ...defaultArtOptions, smooth: 0.9 }))
    expect(sm).toContain('art-edge')
    expect(sm).not.toMatch(/fill="/)
  })
  it('пустой меш даёт пустую картинку без путей', () => {
    const svg = renderSvg({ positions: Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]), triangles: new Uint32Array(0) }, ISO)
    expect(svg).not.toContain('<path')
  })
})
