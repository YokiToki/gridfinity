import { describe, expect, it } from 'vitest'
import { footprintFromCells } from '../../geometry/footprint'
import { standardPositions } from '../../geometry/fasteners'
import { clampToFootprint, fromCorner, snapPoint, toCorner, togglePoint } from './placement'

const fp = footprintFromCells(2, 2, 42)

describe('placement', () => {
  it('координаты от угла и обратно', () => {
    expect(toCorner({ x: -34, y: -34 }, fp)).toEqual({ x: 8, y: 8 })
    expect(fromCorner({ x: 8, y: 8 }, fp)).toEqual({ x: -34, y: -34 })
  })
  it('привязка к ближайшей стандартной позиции в радиусе', () => {
    const snaps = standardPositions(fp)
    expect(snapPoint({ x: -33, y: -35 }, snaps)).toEqual({ x: -34, y: -34 })
    expect(snapPoint({ x: 0, y: 0 }, snaps)).toEqual({ x: 0, y: 0 }) // далеко от всех
  })
  it('ограничение габаритом', () => {
    expect(clampToFootprint({ x: 100, y: -100 }, fp)).toEqual({ x: 42, y: -42 })
  })
  it('toggle добавляет и убирает', () => {
    const a = togglePoint([], { x: 1, y: 2 })
    expect(a).toEqual([{ x: 1, y: 2 }])
    expect(togglePoint(a, { x: 1, y: 2 })).toEqual([])
  })
})
