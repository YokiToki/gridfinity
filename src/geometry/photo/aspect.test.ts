import { describe, expect, it } from 'vitest'
import type { Pt } from './homography'
import { ASPECT_TOLERANCE, estimateAspect, guessPaper } from './aspect'

type V = [number, number, number]
const rotX = (a: number) => (p: V): V => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)]
const rotY = (a: number) => (p: V): V => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)]
const rotZ = (a: number) => (p: V): V => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]]

/** Снимок прямоугольника w × h через камеру с фокусом f и главной точкой в центре кадра; поворот, затем сдвиг на расстояние d. */
function project(w: number, h: number, W: number, H: number, f: number, rot: (p: V) => V, d: number): Pt[] {
  const pts: V[] = [[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]]
  return pts.map((p) => { const q = rot(p); const z = q[2] + d; return [W / 2 + (f * q[0]) / z, H / 2 + (f * q[1]) / z] as Pt })
}

describe('пропорции листа по перспективе (25a 2.1)', () => {
  const W = 1200, H = 1600
  it('A4 книжный (210 × 297) под наклоном 20° и 35°: отношение 0.707 в пределах 1.5 %', () => {
    for (const tilt of [10, 20, 35]) {
      const q = project(210, 297, W, H, 1300, (p) => rotX((tilt * Math.PI) / 180)(rotZ(0.08)(p)), 600)
      const r = estimateAspect(q, W, H)!
      expect(Math.abs(r - 210 / 297) / (210 / 297), `tilt ${tilt}`).toBeLessThan(0.015)
    }
  })
  it('наклон вокруг другой оси и поворот листа в кадре тоже не сбивают пропорцию', () => {
    const q = project(297, 210, W, H, 1100, (p) => rotY(0.5)(rotX(0.3)(rotZ(0.6)(p))), 700)
    expect(Math.abs(estimateAspect(q, W, H)! - 297 / 210) / (297 / 210)).toBeLessThan(0.02)
  })
  it('A4 и Letter различаются: A4 при 20° и 35° наклона — a4, Letter — letter', () => {
    for (const tilt of [20, 35]) {
      const rot = (p: V) => rotX((tilt * Math.PI) / 180)(rotZ(0.05)(p))
      expect(guessPaper(project(210, 297, W, H, 1300, rot, 600), W, H)).toMatchObject({ preset: 'a4', orientation: 'portrait' })
      expect(guessPaper(project(215.9, 279.4, W, H, 1300, rot, 600), W, H)).toMatchObject({ preset: 'letter', orientation: 'portrait' })
    }
  })
  it('альбомная ориентация: лист повернут на 90° — landscape', () => {
    const q = project(297, 210, W, H, 1300, (p) => rotX(0.3)(p), 600)
    expect(guessPaper(q, W, H)).toMatchObject({ preset: 'a4', orientation: 'landscape' })
  })
  it('вид строго сверху (фокус вывести нельзя): запасной фокус даёт верное отношение', () => {
    const q = project(210, 297, W, H, 1300, (p) => p, 600)
    expect(Math.abs(estimateAspect(q, W, H)! - 210 / 297) / (210 / 297)).toBeLessThan(0.02)
  })
  it('не A4 и не Letter (квадрат, 1:1.8) — формат не назван, ориентация и отношение есть', () => {
    const sq = guessPaper(project(200, 200, W, H, 1300, (p) => rotX(0.2)(p), 600), W, H)!
    expect(sq.preset).toBeNull()
    const long = guessPaper(project(150, 270, W, H, 1300, (p) => rotX(0.2)(p), 600), W, H)!
    expect(long.preset).toBeNull()
    expect(long.orientation).toBe('portrait')
  })
  it('вырожденные углы дают null, допуск 3 %', () => {
    expect(estimateAspect([[0, 0], [10, 0], [20, 0], [30, 0]], W, H)).toBeNull()
    expect(estimateAspect([[0, 0]], W, H)).toBeNull()
    expect(ASPECT_TOLERANCE).toBe(0.03)
  })
})
