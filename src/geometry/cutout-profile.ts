import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import { sliceLoops, type IndexedMesh } from './stl-import'

/**
 * Профиль кармана для сетки без тела: ступенчатая стопка накопленных сечений детали, поставленной на дно (z от 0).
 * Сечение k — проекция всего, что лежит не выше top[k]; для замкнутых сеток карман строится по самой детали.
 */
export interface PocketProfile {
  /** Высота детали. */
  height: number
  /** Верх каждой ступени, по возрастанию; последняя равна высоте. */
  tops: number[]
  /** Накопленные сечения (центр габарита в 0, без зазора), по одному на ступень. */
  sections: CrossSection[]
  /** Сетка не образует тела: сечения замкнуты по срезам. */
  fromSlices: boolean
}

export const SLAB = 0.5 // целевая высота ступени, мм
export const MIN_SLABS = 8
export const MAX_SLABS = 48

export const slabCount = (height: number) => Math.min(MAX_SLABS, Math.max(MIN_SLABS, Math.ceil(height / SLAB)))

export function slabTops(height: number): number[] {
  const n = slabCount(height)
  return Array.from({ length: n }, (_, k) => (height * (k + 1)) / n)
}

/** Профиль сетки без тела: сечения срезами (по два среза на ступень), контуры заливаются, накопление — объединением. */
export function profileOfSlices(w: ManifoldToplevel, mesh: IndexedMesh, height: number): PocketProfile | null {
  const tops = slabTops(height)
  const { CrossSection } = w
  let acc: CrossSection | null = null
  const sections: CrossSection[] = []
  let prev = 0
  for (const top of tops) {
    for (const level of [prev + (top - prev) / 2, top - 1e-4, ...(prev === 0 ? [1e-4] : [])]) {
      const loops = sliceLoops(mesh.vertProperties, mesh.triVerts, level)
      if (!loops.length) continue
      const cs = CrossSection.ofPolygons(loops, 'EvenOdd')
      acc = acc ? acc.add(cs) : cs
    }
    prev = top
    if (acc) sections.push(acc)
    else sections.push(CrossSection.ofPolygons([[[0, 0], [0, 0], [0, 0]]])) // пустое сечение: до первого непустого среза
  }
  if (!acc || acc.isEmpty()) { sections.forEach((s) => s.delete()); return null }
  return { height, tops, sections, fromSlices: true }
}

const cache = new Map<string, PocketProfile>()
const MAX_CACHED = 16

/** Профиль по ключу ориентированной сетки; кэш освобождает WASM-объекты при переполнении. */
export function cachedProfile(key: string, make: () => PocketProfile | null): PocketProfile | null {
  const hit = cache.get(key)
  if (hit) return hit
  const p = make()
  if (!p) return null
  if (cache.size >= MAX_CACHED) { for (const old of cache.values()) old.sections.forEach((s) => s.delete()); cache.clear() }
  cache.set(key, p)
  return p
}
export const profileCacheSize = () => cache.size
export const clearProfileCache = () => { for (const old of cache.values()) old.sections.forEach((s) => s.delete()); cache.clear() }

