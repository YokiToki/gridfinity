// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { bedOf, defaultExportSettings, normalizeExportSettings, resetExportSettings, updateExportSettings, usableBed } from './settings'

describe('export settings', () => {
  beforeEach(() => { localStorage.clear(); resetExportSettings() })
  it('пресет задаёт стол, поля вычитаются с каждой стороны: 256 / 5 → 246', () => {
    const s = { ...defaultExportSettings, printerId: 'a1', margin: 5 }
    expect(bedOf(s)).toEqual({ x: 256, y: 256, z: 256 })
    expect(usableBed(s)).toEqual({ x: 246, y: 246, z: 256 })
  })
  it('свой размер: 220 × 220 берётся из настроек', () => {
    const s = { ...defaultExportSettings, printerId: 'custom', customX: 220, customY: 220 }
    expect(usableBed({ ...s, margin: 0 })).toMatchObject({ x: 220, y: 220 })
  })
  it('большие поля не дают отрицательной области', () => {
    expect(usableBed({ ...defaultExportSettings, printerId: 'custom', customX: 50, customY: 50, margin: 40 })).toMatchObject({ x: 0, y: 0 })
  })
  it('неизвестный принтер и мусор в хранилище заменяются значениями по умолчанию', () => {
    const n = normalizeExportSettings({ printerId: 'zzz', margin: -3, gap: 'x', format: 'pdf', multi: 1, orientation: 'up' })
    expect(n).toEqual({ printerId: defaultExportSettings.printerId })
  })
  it('изменения сохраняются и читаются после сброса кэша', () => {
    updateExportSettings({ printerId: 'custom', customX: 300, customY: 280 })
    resetExportSettings()
    expect(bedOf(JSON.parse(localStorage.getItem('gridfinity.export')!))).toMatchObject({ x: 300, y: 280 })
  })
})
