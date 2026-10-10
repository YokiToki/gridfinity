import { expect } from 'vitest'
import type { Manifold } from 'manifold-3d'
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
export const sharpParams: BaseplateGeometry = { ...defaultParams, thickness: { ...defaultThickness, cornerRadius: 0 } }
