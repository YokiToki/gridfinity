// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import { build3mf, escapeXml, type ThreeMfObject } from './threemf'
import { orientMesh } from './orient'
import { generate } from '../geometry/model'
import { defaultCutout } from '../geometry/cutout'
import { defaultParams, toGeometry } from '../geometry/baseplate'

const read = (z: Uint8Array) => { const u = unzipSync(z); return Object.fromEntries(Object.entries(u).map(([k, v]) => [k, strFromU8(v)])) }
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length

describe('build3mf', () => {
  it('круговой тест: части, имена, единица мм, число вершин и треугольников совпадает с исходными', async () => {
    const r = await generate('cutout', { ...defaultCutout, lip: 'none' })
    const mesh = orientMesh(r.parts[0].mesh)
    const objs: ThreeMfObject[] = [{ name: 'A1', mesh, x: 10, y: 20, plate: 1 }, { name: 'B <&> "2"', mesh, x: 100, y: 20, plate: 1 }]
    const files = read(build3mf(objs, { title: 'Test' }))
    expect(Object.keys(files).sort()).toEqual(['3D/3dmodel.model', '[Content_Types].xml', '_rels/.rels'])
    const xml = files['3D/3dmodel.model']
    expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror')).toBeNull()
    expect(xml).toContain('unit="millimeter"')
    expect(count(xml, /<object /g)).toBe(2)
    expect(xml).toContain('name="A1"')
    expect(xml).toContain('name="B &lt;&amp;&gt; &quot;2&quot;"')
    expect(count(xml, /<vertex /g)).toBe(2 * mesh.positions.length / 3)
    expect(count(xml, /<triangle /g)).toBe(2 * mesh.triangles.length / 3)
    expect(count(xml, /<item /g)).toBe(2)
    expect(xml).toContain('transform="1 0 0 0 1 0 0 0 1 100 20 0"')
  })
  it('индексы треугольников не выходят за число вершин', async () => {
    const r = await generate('baseplate', toGeometry(defaultParams))
    const mesh = orientMesh(r.parts[0].mesh)
    const xml = read(build3mf([{ name: 'A1', mesh, x: 0, y: 0, plate: 1 }], { title: 't' }))['3D/3dmodel.model']
    const nv = count(xml, /<vertex /g)
    let max = -1
    for (const m of xml.matchAll(/v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)) max = Math.max(max, +m[1], +m[2], +m[3])
    expect(max).toBeLessThan(nv)
  })
  it('дополнительные файлы попадают в пакет', () => {
    const mesh = { positions: Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]), triangles: Uint32Array.from([0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2]), size: [1, 1, 1] as [number, number, number] }
    const files = read(build3mf([{ name: 'x', mesh, x: 0, y: 0, plate: 1 }], { title: 't', files: { 'Metadata/a.config': '<c/>' } }))
    expect(files['Metadata/a.config']).toBe('<c/>')
  })
  it('escapeXml', () => expect(escapeXml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;'))
})
