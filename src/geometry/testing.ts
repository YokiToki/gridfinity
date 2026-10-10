import { expect } from 'vitest'
import type { Manifold } from 'manifold-3d'
import type { MeshData } from './mesh'
import type { ModelResult } from './model'
import { defaultSplit } from './split'
import { defaultParams, defaultThickness, type AxisSize, type BaseplateGeometry } from './baseplate'

/** Общая проверка геометрии: валидная замкнутая модель, объём > 0 и (необязательно) габариты. */
export function expectValidSolid(m: Manifold, bbox?: { min?: number[]; max?: number[]; size?: number[] }, digits = 3) {
  expect(m.status()).toBe('NoError')
  expect(m.isEmpty()).toBe(false)
  expect(m.volume()).toBeGreaterThan(0)
  expect(m.genus()).toBeGreaterThanOrEqual(0)
  const bb = m.boundingBox()
  bbox?.min?.forEach((v, i) => expect(bb.min[i]).toBeCloseTo(v, digits))
  bbox?.max?.forEach((v, i) => expect(bb.max[i]).toBeCloseTo(v, digits))
  bbox?.size?.forEach((v, i) => expect(bb.max[i] - bb.min[i]).toBeCloseTo(v, digits))
}

export const units = (value: number, align: AxisSize['align'] = 'center'): AxisSize => ({ mode: 'units', value, align })
export const mm = (value: number, align: AxisSize['align'] = 'center'): AxisSize => ({ mode: 'mm', value, align })

/** Параметры 2×2 с острыми внешними углами, как у прототипа: от них считаются регрессионные объёмы. */
export const sharpParams: BaseplateGeometry = {
  pitch: defaultParams.pitch, x: defaultParams.x, y: defaultParams.y, fasteners: defaultParams.fasteners,
  thickness: { ...defaultThickness, cornerRadius: 0 }, split: defaultSplit,
}

/** Модель из одной части с заданным объёмом: для тестов клиента воркера и хука. */
export function result(volume: number, bbox: { min?: [number, number, number]; max?: [number, number, number] } = {}): ModelResult {
  const mesh: MeshData = { vertProperties: new Float32Array(), triVerts: new Uint32Array(), numProp: 3, min: bbox.min ?? [0, 0, 0], max: bbox.max ?? [1, 1, 1], volume }
  return { parts: [{ label: 'A1', col: 0, row: 0, oversize: false, mesh }] }
}
