import { describe, expect, it } from 'vitest'
import { getWasm } from './wasm'
import { binFoot, lipProfile, LIP_LAYERS, SLAB_T, socketPocket } from './profiles'
import { layersHeight, FOOT_LAYERS, SOCKET_HEIGHT } from './spec'
import { expectValidSolid } from './testing'

/** Ширина сечения на высоте z. */
const widthAt = (m: { slice: (z: number) => { bounds: () => { min: number[]; max: number[] } } }, z: number) => {
  const b = m.slice(z).bounds()
  return b.max[0] - b.min[0]
}

describe('profiles', () => {
  it('гнездо: высота и ширина слоёв', async () => {
    const w = await getWasm()
    const p = socketPocket(w, 42)
    expectValidSolid(p, { size: [42, 42, SOCKET_HEIGHT + SLAB_T] })
    expect(widthAt(p, 0.0005)).toBeCloseTo(42 - 2 * (0.7 + 2.15), 2) // нижний слой
    expect(widthAt(p, 0.7)).toBeCloseTo(42 - 2 * 2.15, 2)            // после нижней фаски
    expect(widthAt(p, 0.7 + 1.8)).toBeCloseTo(42 - 2 * 2.15, 2)      // вертикальная стенка
    expect(widthAt(p, SOCKET_HEIGHT - 0.0005)).toBeCloseTo(42, 2)    // верх
  })
  it('нога коробки: 4.75 мм, 35.6 → 41.5', async () => {
    const w = await getWasm()
    const f = binFoot(w, 42)
    expectValidSolid(f, { size: [41.5, 41.5, layersHeight(FOOT_LAYERS) + SLAB_T] })
    expect(layersHeight(FOOT_LAYERS)).toBeCloseTo(4.75, 6)
    expect(widthAt(f, 0.0005)).toBeCloseTo(35.6, 2)
    expect(widthAt(f, 0.8 + 1.8)).toBeCloseTo(41.5 - 2 * 2.15, 2)
  })
  it('шаг 40 мм масштабирует ширину, но не высоту', async () => {
    const w = await getWasm()
    expectValidSolid(socketPocket(w, 40), { size: [40, 40, SOCKET_HEIGHT + SLAB_T] })
  })
  it('губа: default 4.4 мм, thin 2.6 мм, none = null', async () => {
    const w = await getWasm()
    const d = lipProfile(w, 42, 'default')!
    const t = lipProfile(w, 42, 'thin')!
    expectValidSolid(d, { size: [41.5, 41.5, 4.4 + SLAB_T] })
    expectValidSolid(t, { size: [41.5, 41.5, 2.6 + SLAB_T] })
    expect(LIP_LAYERS.default.low + LIP_LAYERS.default.wall + LIP_LAYERS.default.up).toBeCloseTo(4.4, 6)
    expect(widthAt(d, 0.0005)).toBeCloseTo(41.5 - 2 * (0.7 + 1.9), 2)
    expect(lipProfile(w, 42, 'none')).toBeNull()
  })
})
