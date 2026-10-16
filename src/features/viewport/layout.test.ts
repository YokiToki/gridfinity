import { describe, expect, it } from 'vitest'
import type { PartMesh } from '../../geometry/model'
import { bottomAssembly, identity, pinAssembly, type Assembly } from '../../geometry/keychainAssembly'
import { assembledMatrix, layoutBounds, OPEN_GAP_MAX } from './layout'

const part = (label: string, min: [number, number, number], max: [number, number, number]): PartMesh =>
  ({ label, col: 0, row: 0, oversize: false, mesh: { vertProperties: new Float32Array(), numProp: 3, triVerts: new Uint32Array(), min, max, volume: 1 } as unknown as PartMesh['mesh'] })

// лист: верх 0…40 × 0…30 × 0…4, низ сдвинут вправо на 50 (y зеркально), штифт на листе у (10, −10)
const parts = [part('top', [0, 0, 0], [40, 30, 4]), part('bottom', [50, 0, 0], [90, 30, 4]), part('pin1', [9, -11, 0], [11, -9, 1.6])]
const assembly: Assembly = { top: identity(), bottom: bottomAssembly(50, 30), pin1: pinAssembly({ x: 10, y: -10 }, { x: 20, y: 15 }, 1.6) }

describe('раскладка вьюпорта (2.1)', () => {
  it('лист печати: матриц нет, габарит — как на листе', () => {
    expect(assembledMatrix('top', assembly, 'sheet', 6)).toBeNull()
    expect(layoutBounds(parts, assembly, 'sheet', 6)).toEqual({ min: [0, -11, 0], max: [90, 30, 4] })
  })
  it('без сборки (не режим половин) собранного вида нет, даже если он выбран', () => {
    expect(assembledMatrix('A1', undefined, 'assembled', 0)).toBeNull()
    expect(layoutBounds(parts, undefined, 'assembled', 0)).toEqual(layoutBounds(parts, undefined, 'sheet', 0))
  })
  it('собран: половины на месте одна над другой, габарит по xy как у верхней, штифт в отверстии', () => {
    const b = layoutBounds(parts, assembly, 'assembled', 0)
    expect(b.min).toEqual([0, 0, -4])
    expect(b.max).toEqual([40, 30, 4])
  })
  it('раздвижка: верх вверх на gap/2, низ вниз; штифт на плоскости; габарит растёт на gap', () => {
    expect(assembledMatrix('top', assembly, 'assembled', 6)![14]).toBe(3)
    expect(assembledMatrix('bottom', assembly, 'assembled', 6)![14]).toBe(-3)
    expect(assembledMatrix('pin1', assembly, 'assembled', 6)![14]).toBeCloseTo(-0.8, 12)
    const b = layoutBounds(parts, assembly, 'assembled', 6)
    expect(b.max[2] - b.min[2]).toBeCloseTo(8 + 6, 9)
  })
  it('раздвижка ограничена 0…15 мм', () => {
    expect(assembledMatrix('top', assembly, 'assembled', 99)![14]).toBe(OPEN_GAP_MAX / 2)
    expect(assembledMatrix('top', assembly, 'assembled', -5)![14]).toBe(0)
  })
})
