import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import { cellCenters, cellCenter, type Footprint, type Point } from './footprint'
import { FLOOR, HOLE_OFFSET, MAGNET_D, MAGNET_H, SCREW_D } from './spec'

export type FastenerMode = 'none' | 'corner' | 'full' | 'manual'
export const FASTENER_MODES: FastenerMode[] = ['none', 'corner', 'full', 'manual']

export interface FastenerKind {
  mode: FastenerMode
  /** Точки ручной расстановки, мм, начало координат — центр габарита. */
  manual: Point[]
}

export type ScrewHead = 'none' | 'countersink' | 'counterbore'

export interface FastenerConfig {
  magnets: FastenerKind
  screws: FastenerKind
  magnetPreset: string
  magnetD: number
  magnetDepth: number
  screwPreset: string
  screwD: number
  screwHead: ScrewHead
  /** Диаметр головки винта (для потая и цековки), мм. */
  headD: number
  /** Глубина цековки, мм. */
  headDepth: number
  /** Допуск посадки: добавляется к диаметру магнита и к его глубине. */
  tolerance: number
}

export interface MagnetPreset { id: string; d: number; depth: number }
export interface ScrewPreset { id: string; d: number }

export const MAGNET_PRESETS: MagnetPreset[] = [
  { id: 'm6x2', d: 6, depth: 2 },
  { id: 'm6.5x2.4', d: 6.5, depth: 2.4 },
  { id: 'm8x2', d: 8, depth: 2 },
]
export const SCREW_PRESETS: ScrewPreset[] = [{ id: 'm3', d: 3 }]
export const CUSTOM = 'custom'

export const defaultFasteners: FastenerConfig = {
  magnets: { mode: 'none', manual: [] },
  screws: { mode: 'none', manual: [] },
  magnetPreset: 'm6.5x2.4',
  magnetD: MAGNET_D,
  magnetDepth: MAGNET_H,
  screwPreset: 'm3',
  screwD: SCREW_D,
  screwHead: 'none',
  headD: 6,
  headDepth: 1.5,
  tolerance: 0,
}

/** Применяет пресет магнита: размеры берутся из пресета, custom оставляет текущие. */
export function withMagnetPreset(c: FastenerConfig, id: string): FastenerConfig {
  const p = MAGNET_PRESETS.find((x) => x.id === id)
  return p ? { ...c, magnetPreset: id, magnetD: p.d, magnetDepth: p.depth } : { ...c, magnetPreset: CUSTOM }
}
export function withScrewPreset(c: FastenerConfig, id: string): FastenerConfig {
  const p = SCREW_PRESETS.find((x) => x.id === id)
  return p ? { ...c, screwPreset: id, screwD: p.d } : { ...c, screwPreset: CUSTOM }
}

/** Фактические размеры отверстий с учётом допуска. */
export const magnetSize = (c: FastenerConfig) => ({ d: c.magnetD + c.tolerance, depth: c.magnetDepth + c.tolerance })

const SIGNS: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]]

/** Стандартные позиции: четыре отверстия в каждой ячейке на HOLE_OFFSET от центра. */
export function standardPositions(fp: Footprint): Point[] {
  return cellCenters(fp).flatMap((c) => SIGNS.map(([sx, sy]) => ({ x: c.x + sx * HOLE_OFFSET, y: c.y + sy * HOLE_OFFSET })))
}

/** Только четыре внешних угла блока ячеек (у дробных габаритов — первая и последняя полные ячейки). */
export function cornerPositions(fp: Footprint): Point[] {
  const a = cellCenter(fp, 0, 0)
  const b = cellCenter(fp, fp.nx - 1, fp.ny - 1)
  return SIGNS.map(([sx, sy]) => ({
    x: (sx < 0 ? a.x : b.x) + sx * HOLE_OFFSET,
    y: (sy < 0 ? a.y : b.y) + sy * HOLE_OFFSET,
  }))
}

export function resolvePositions(kind: FastenerKind, fp: Footprint): Point[] {
  switch (kind.mode) {
    case 'none': return []
    case 'corner': return cornerPositions(fp)
    case 'full': return standardPositions(fp)
    case 'manual': return kind.manual.map((p) => ({ ...p }))
  }
}

/** Переключение режима: при уходе в Manual текущие вычисленные точки сохраняются как ручные. */
export function switchMode(kind: FastenerKind, mode: FastenerMode, fp: Footprint): FastenerKind {
  if (mode === kind.mode) return kind
  if (mode === 'manual') return { mode, manual: kind.mode === 'none' ? kind.manual : resolvePositions(kind, fp) }
  return { ...kind, mode }
}

export interface FastenerPositions { magnets: Point[]; screws: Point[] }

export function allPositions(c: FastenerConfig, fp: Footprint): FastenerPositions {
  return { magnets: resolvePositions(c.magnets, fp), screws: resolvePositions(c.screws, fp) }
}

/** Нужен ли пол под гнёздами: есть хотя бы одно отверстие. */
export const needsFloor = (p: FastenerPositions) => p.magnets.length > 0 || p.screws.length > 0

export interface FastenerCuts { cuts: Manifold[]; positions: FastenerPositions }

/**
 * Объёмы для вычитания. floor — высота материала под гнёздом (низ гнезда): магнитное гнездо
 * уходит от этой высоты вниз, винт проходит снизу насквозь.
 */
export function fastenerCuts(w: ManifoldToplevel, c: FastenerConfig, fp: Footprint, floor = FLOOR): FastenerCuts {
  const { Manifold } = w
  const positions = allPositions(c, fp)
  const cuts: Manifold[] = []
  const m = magnetSize(c)
  const sr = c.screwD / 2
  for (const p of positions.screws) {
    cuts.push(Manifold.cylinder(floor + 2, sr, sr, 24).translate([p.x, p.y, -1]))
    if (c.screwHead === 'counterbore') {
      cuts.push(Manifold.cylinder(c.headDepth + 1, c.headD / 2, c.headD / 2, 32).translate([p.x, p.y, -1]))
    } else if (c.screwHead === 'countersink' && c.headD > c.screwD) {
      const h = (c.headD - c.screwD) / 2 // конус 45°
      cuts.push(Manifold.cylinder(h, c.headD / 2, sr, 32).translate([p.x, p.y, 0]))
      cuts.push(Manifold.cylinder(1, c.headD / 2, c.headD / 2, 32).translate([p.x, p.y, -1]))
    }
  }
  for (const p of positions.magnets) {
    cuts.push(Manifold.cylinder(m.depth + 1, m.d / 2, m.d / 2, 32).translate([p.x, p.y, floor - m.depth]))
  }
  return { cuts, positions }
}

export interface FastenerWarning { kind: 'magnets' | 'screws'; key: string; index: number }

const EDGE_MIN = 0.8 // минимальная стенка между отверстием и контуром, мм

/** Предупреждения: отверстие у самого края или пересечение отверстий одного габарита. */
export function checkFasteners(c: FastenerConfig, fp: Footprint): FastenerWarning[] {
  const pos = allPositions(c, fp)
  const out: FastenerWarning[] = []
  const check = (kind: 'magnets' | 'screws', pts: Point[], d: number) => {
    pts.forEach((p, i) => {
      const r = d / 2
      if (Math.abs(p.x) + r + EDGE_MIN > fp.sizeX / 2 || Math.abs(p.y) + r + EDGE_MIN > fp.sizeY / 2) out.push({ kind, key: 'fastener.nearEdge', index: i })
      for (let j = i + 1; j < pts.length; j++) if (Math.hypot(p.x - pts[j].x, p.y - pts[j].y) < d) out.push({ kind, key: 'fastener.overlap', index: i })
    })
  }
  check('magnets', pos.magnets, magnetSize(c).d)
  check('screws', pos.screws, c.screwD)
  return out
}
