// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import { buildExport, layout } from './build'
import { defaultExportSettings, type ExportSettings } from './settings'
import { generate, type ModelResult } from '../geometry/model'
import { defaultSplit } from '../geometry/split'
import { sharpParams, mm } from '../geometry/testing'
import { defaultCutout } from '../geometry/cutout'

let four: ModelResult, one: ModelResult
beforeAll(async () => {
  four = await generate('baseplate', { ...sharpParams, x: mm(300), y: mm(300), split: { ...defaultSplit, enabled: true, maxX: 200, maxY: 200 } })
  one = await generate('cutout', { ...defaultCutout, lip: 'none' })
})
const S = (o: Partial<ExportSettings> = {}): ExportSettings => ({ ...defaultExportSettings, printerId: 'x1c', margin: 5, gap: 6, ...o })
const unzipText = async (b: Blob) => Object.fromEntries(Object.entries(unzipSync(new Uint8Array(await b.arrayBuffer()))).map(([k, v]) => [k, strFromU8(v)]))

describe('buildExport: 3MF', () => {
  it('сплит на 4 части: один 3MF с четырьмя объектами, названными по меткам', async () => {
    expect(four.parts).toHaveLength(4)
    const r = buildExport(four.parts, S({ format: '3mf' }), 'plate')
    expect(r.files.map((f) => f.name)).toEqual(['plate.3mf'])
    const x = (await unzipText(r.files[0].blob))['3D/3dmodel.model']
    expect((x.match(/<object /g) ?? []).length).toBe(4)
    for (const l of four.parts.map((p) => p.label)) expect(x).toContain(`name="${l}"`)
  })
  it('Bambu: у принтера X1C в пакете есть project_settings и model_settings с выбранными профилями', async () => {
    const r = buildExport(four.parts, S({ format: '3mf', filament: 'pla', process: '0.20-standard', nozzle: 0.4 }), 'plate')
    const f = await unzipText(r.files[0].blob)
    const cfg = JSON.parse(f['Metadata/project_settings.config'])
    expect(cfg.printer_model).toBe('Bambu Lab X1 Carbon')
    expect(cfg.printer_settings_id).toBe('Bambu Lab X1 Carbon 0.4 nozzle')
    expect(cfg.print_settings_id).toBe('0.20mm Standard @BBL X1C')
    expect(cfg.filament_settings_id).toEqual(['Bambu PLA Basic @BBL X1C'])
    expect(cfg.nozzle_diameter).toEqual(['0.4'])
    expect(cfg.printable_area).toEqual(['0x0', '256x0', '256x256', '0x256'])
    expect(f['Metadata/model_settings.config']).toContain('plater_id')
    expect(f['3D/3dmodel.model']).toContain('BambuStudio')
  })
  it('свой принтер: обычный 3MF без метаданных Bambu', async () => {
    const r = buildExport(four.parts, S({ format: '3mf', printerId: 'custom', customX: 300, customY: 300 }), 'plate')
    const f = await unzipText(r.files[0].blob)
    expect(Object.keys(f).some((k) => k.startsWith('Metadata/'))).toBe(false)
    expect(f['3D/3dmodel.model']).not.toContain('BambuStudio')
  })
  it('отдельные файлы: по одному 3MF на часть', () => {
    const r = buildExport(four.parts, S({ format: '3mf', multi: 'separate' }), 'plate')
    expect(r.files.map((f) => f.name)).toEqual(four.parts.map((p) => `plate_${p.label}.3mf`))
  })
  it('детали, не влезающие на один стол, раскладываются по плитам, метаданные Bambu называют плиты', async () => {
    const r = buildExport(four.parts, S({ format: '3mf', printerId: 'custom', customX: 200, customY: 200, margin: 5 }), 'plate')
    expect(r.plates).toBeGreaterThan(1)
    expect(r.overflow).toBe(false)
    const b = buildExport(four.parts, S({ format: '3mf', printerId: 'a1-mini' }), 'plate')
    expect(b.plates).toBeGreaterThan(1)
    const ms = (await unzipText(b.files[0].blob))['Metadata/model_settings.config']
    expect((ms.match(/<plate>/g) ?? []).length).toBe(b.plates)
  })
})

describe('buildExport: раскладка и ориентация', () => {
  it('все части лежат в пределах стола с полем и не пересекаются', () => {
    const { placed } = layout(four.parts, S())
    expect(placed.filter((p) => p.plate === 1).length).toBeGreaterThan(0)
    for (const p of placed) {
      expect(p.x).toBeGreaterThanOrEqual(5 - 1e-9); expect(p.y).toBeGreaterThanOrEqual(5 - 1e-9)
      expect(p.x + p.mesh.size[0]).toBeLessThanOrEqual(251 + 1e-6); expect(p.y + p.mesh.size[1]).toBeLessThanOrEqual(251 + 1e-6)
    }
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], b = placed[j]
      if (a.plate !== b.plate) continue
      const sep = a.x + a.mesh.size[0] <= b.x + 1e-9 || b.x + b.mesh.size[0] <= a.x + 1e-9 || a.y + a.mesh.size[1] <= b.y + 1e-9 || b.y + b.mesh.size[1] <= a.y + 1e-9
      expect(sep).toBe(true)
    }
  })
  it('перевёрнутый экспорт опирается на стол: минимум z = 0 у каждой детали', () => {
    const { placed } = layout(one.parts, S({ orientation: 'flipped' }))
    for (const p of placed) { let mn = Infinity; for (let i = 2; i < p.mesh.positions.length; i += 3) mn = Math.min(mn, p.mesh.positions[i]); expect(mn).toBeCloseTo(0, 6) }
    expect(layout(one.parts, S({ orientation: 'flipped' })).placed[0].mesh.size[2]).toBeCloseTo(21, 3)
  })
  it('перевёрнутая деталь отличается от обычной: низ ящика с ногами становится верхом', () => {
    const a = layout(one.parts, S()).placed[0].mesh, b = layout(one.parts, S({ orientation: 'flipped' })).placed[0].mesh
    let sa = 0, sb = 0
    for (let i = 2; i < a.positions.length; i += 3) { sa += a.positions[i]; sb += b.positions[i] }
    expect(Math.abs(sa - sb)).toBeGreaterThan(1)
  })
})

describe('buildExport: STL', () => {
  it('одна деталь: один файл .stl с именем режима и размера, 84 + 50·n байт', async () => {
    const r = buildExport(one.parts, S(), 'cutout_84x84')
    expect(r.files).toHaveLength(1)
    expect(r.files[0].name).toBe('cutout_84x84.stl')
    expect(r.files[0].blob.size).toBe(84 + 50 * (one.parts[0].mesh.triVerts.length / 3))
  })
  it('по частям: четыре файла с метками в имени', () => {
    const r = buildExport(four.parts, S({ multi: 'separate' }), 'plate')
    expect(r.files.map((f) => f.name)).toEqual(four.parts.map((p) => `plate_${p.label}.stl`))
  })
  it('одним файлом: все треугольники частей вместе', () => {
    const r = buildExport(four.parts, S({ multi: 'one' }), 'plate')
    expect(r.files).toHaveLength(1)
    expect(r.files[0].blob.size).toBe(84 + 50 * four.parts.reduce((n, p) => n + p.mesh.triVerts.length / 3, 0))
  })
  it('своё имя файла очищается от запрещённых символов', () => {
    expect(buildExport(one.parts, S({ fileName: 'my box/v1?' }), 'x').files[0].name).toBe('my_box_v1_.stl')
  })
})
