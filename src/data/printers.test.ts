import { describe, expect, it } from 'vitest'
import { FILAMENTS, NOZZLES, PRINTERS, PROCESSES, printerById } from './printers'

describe('printers', () => {
  it('идентификаторы уникальны и не занимают custom', () => {
    const ids = PRINTERS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toContain('custom')
  })
  it('размеры положительные, у каждого пресета есть имя и источник', () => {
    for (const p of PRINTERS) {
      expect(p.x).toBeGreaterThan(0); expect(p.y).toBeGreaterThan(0); expect(p.z).toBeGreaterThan(0)
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.source).toMatch(/^https:\/\//)
    }
  })
  it('у принтеров Bambu есть имя модели и суффикс профилей', () => {
    for (const p of PRINTERS) { expect(p.bambu?.model).toBeTruthy(); expect(p.bambu?.suffix).toMatch(/^[A-Z0-9]+$/) }
  })
  it('есть P2S, а H2D считается по объёму одним соплом', () => {
    expect(printerById('p2s')).toMatchObject({ x: 256, y: 256, z: 256 })
    expect(printerById('h2d')).toMatchObject({ x: 325, y: 320, z: 325 })
    expect(printerById('h2s')).toMatchObject({ x: 340, y: 320, z: 340 })
  })
  it('поиск по id, процессы и пластики не пустые', () => {
    expect(printerById('a1')?.x).toBe(256)
    expect(printerById('nope')).toBeUndefined()
    expect(PROCESSES.length).toBeGreaterThan(0); expect(FILAMENTS.length).toBeGreaterThan(0); expect(NOZZLES).toContain(0.4)
  })
})
