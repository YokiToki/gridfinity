// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import { generate } from '../model'
import { buildExport } from '../../export/build'
import { defaultExportSettings } from '../../export/settings'
import { defaultRackPanel, type RackPanelParams } from './panel'
import { defaultPattern } from './patterns/types'

const P = (o: Partial<RackPanelParams> = {}): RackPanelParams => ({ ...defaultRackPanel, ...o })

describe('generate("rackPanel")', () => {
  it('без задней стенки одна часть panel', async () => {
    const r = await generate('rackPanel', P({ units: 1 }))
    expect(r.parts.map((p) => p.label)).toEqual(['panel'])
    expect(r.parts[0].mesh.min[2]).toBeCloseTo(0, 6); expect(r.parts[0].mesh.max[2]).toBeCloseTo(3, 6)
    expect(r.rack).toEqual({ warnings: [] })
  })
  it('со стенкой две части: тот же контур и отверстия, толщина как задана, позади панели', async () => {
    const r = await generate('rackPanel', P({ units: 1, back: { enabled: true, thickness: 0.8 }, pattern: { ...defaultPattern, kind: 'skadis' } }))
    expect(r.parts.map((p) => p.label)).toEqual(['panel', 'back'])
    const [panel, back] = r.parts.map((p) => p.mesh)
    expect(back.max[2]).toBeCloseTo(0, 6); expect(back.min[2]).toBeCloseTo(-0.8, 6)
    for (let k = 0; k < 2; k++) { expect(back.min[k]).toBeCloseTo(panel.min[k], 6); expect(back.max[k]).toBeCloseTo(panel.max[k], 6) }
    // стенка без узора, но с отверстиями ушей и скруглёнными углами: площадь пластины минус 6 пазов
    const area = 254 * 44 - (4 - Math.PI) * 9 - 6 * (6.5 * 3.5 + Math.PI * 3.25 ** 2)
    expect(Math.abs(back.volume - area * 0.8) / (area * 0.8)).toBeLessThan(0.005)
    expect(panel.volume).toBeLessThan(254 * 44 * 3)
  })
  it('недопустимые параметры: частей нет, ключ ошибки', async () => {
    const r = await generate('rackPanel', P({ units: 12 }))
    expect(r.parts).toEqual([]); expect(r.rack?.error).toBe('rack.error.units')
  })
  it('экспорт 3MF с отдельными объектами сохраняет обе части', async () => {
    const r = await generate('rackPanel', P({ units: 1, back: { enabled: true, thickness: 0.6 } }))
    const out = buildExport(r.parts, { ...defaultExportSettings, format: '3mf', printerId: 'x1c', multi: 'one', margin: 5, gap: 6 }, 'rack')
    const files = unzipSync(new Uint8Array(await out.files[0].blob.arrayBuffer()))
    const x = strFromU8(files['3D/3dmodel.model'])
    expect((x.match(/<object /g) ?? []).length).toBe(2)
    expect(x).toContain('name="panel"'); expect(x).toContain('name="back"')
  })
})
