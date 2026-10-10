import { expect } from 'vitest'
import type { Manifold } from 'manifold-3d'

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
