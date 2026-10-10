import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import { cellCenters, cellCenter, type Footprint, type Point } from './footprint'
import { FLOOR, HOLE_OFFSET, MAGNET_D, MAGNET_H, SCREW_D } from './spec'
import { socketWindow, socketWindowWidth } from './profiles'

export type FastenerMode = 'none' | 'corner' | 'full' | 'manual'
export const FASTENER_MODES: FastenerMode[] = ['none', 'corner', 'full', 'manual']

/** Стандартная позиция отверстия: ячейка (i, j) и её угол (sx, sy ∈ {−1, +1}). Хранится так, а не координатами, чтобы переживать смену размера сетки. */
export interface Slot { i: number; j: number; sx: 1 | -1; sy: 1 | -1 }

export interface FastenerKind {
  mode: FastenerMode
  /** Выбранные позиции в режиме manual. */
  slots: Slot[]
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
  /** Материал вокруг отверстия («ухо»), мм. */
  earWall: number
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
  magnets: { mode: 'none', slots: [] },
  screws: { mode: 'none', slots: [] },
  magnetPreset: 'm6.5x2.4',
  magnetD: MAGNET_D,
  magnetDepth: MAGNET_H,
  screwPreset: 'm3',
  screwD: SCREW_D,
  screwHead: 'none',
  headD: 6,
  headDepth: 1.5,
  tolerance: 0,
  earWall: 1.2,
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

/** Радиус уха вокруг отверстия данного вида. */
export const earRadius = (c: FastenerConfig, kind: 'magnets' | 'screws') => (kind === 'magnets' ? magnetSize(c).d : c.screwD) / 2 + c.earWall

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

export const sameSlot = (a: Slot, b: Slot) => a.i === b.i && a.j === b.j && a.sx === b.sx && a.sy === b.sy

/** Позиция слота в координатах модели. */
export function slotPosition(fp: Footprint, s: Slot): Point {
  const c = cellCenter(fp, s.i, s.j)
  return { x: c.x + s.sx * HOLE_OFFSET, y: c.y + s.sy * HOLE_OFFSET }
}

/** Все стандартные слоты сетки. */
export function allSlots(fp: Footprint): Slot[] {
  const out: Slot[] = []
  for (let i = 0; i < fp.nx; i++) for (let j = 0; j < fp.ny; j++) for (const [sx, sy] of SIGNS) out.push({ i, j, sx: sx as 1 | -1, sy: sy as 1 | -1 })
  return out
}

/** Слоты, которые есть в текущей сетке (после уменьшения сетки лишние игнорируются). */
export const validSlots = (slots: Slot[], fp: Footprint) => slots.filter((s) => s.i >= 0 && s.j >= 0 && s.i < fp.nx && s.j < fp.ny)

export const toggleSlot = (slots: Slot[], s: Slot): Slot[] => (slots.some((q) => sameSlot(q, s)) ? slots.filter((q) => !sameSlot(q, s)) : [...slots, s])

export function resolvePositions(kind: FastenerKind, fp: Footprint): Point[] {
  switch (kind.mode) {
    case 'none': return []
    case 'corner': return cornerPositions(fp)
    case 'full': return standardPositions(fp)
    case 'manual': return validSlots(kind.slots, fp).map((s) => slotPosition(fp, s))
  }
}

/** Переключение режима. В Manual всегда входим с пустым выбором; при выходе из Manual выбор не трогаем. */
export function switchMode(kind: FastenerKind, mode: FastenerMode): FastenerKind {
  if (mode === kind.mode) return kind
  return mode === 'manual' ? { mode, slots: [] } : { ...kind, mode }
}

export const SNAP_RADIUS = 3 // мм

/** Старые сохранённые точки → слоты: ближайшая стандартная позиция в радиусе, остальные отбрасываются, дубли сливаются. */
export function slotsFromPoints(points: Point[], fp: Footprint, radius = SNAP_RADIUS): Slot[] {
  const slots = allSlots(fp)
  const out: Slot[] = []
  for (const p of points) {
    let best: Slot | null = null
    let bd = radius
    for (const s of slots) {
      const q = slotPosition(fp, s)
      const d = Math.hypot(p.x - q.x, p.y - q.y)
      if (d <= bd) { best = s; bd = d }
    }
    if (best && !out.some((o) => sameSlot(o, best!))) out.push(best)
  }
  return out
}

export interface FastenerPositions { magnets: Point[]; screws: Point[] }

export function allPositions(c: FastenerConfig, fp: Footprint): FastenerPositions {
  return { magnets: resolvePositions(c.magnets, fp), screws: resolvePositions(c.screws, fp) }
}

/** Нужен ли пол под гнёздами: есть хотя бы одно отверстие. */
export const needsFloor = (p: FastenerPositions) => p.magnets.length > 0 || p.screws.length > 0

export interface FastenerCuts { cuts: Manifold[]; positions: FastenerPositions }

/** Ячейка, в которой лежит точка, и направление угла ячейки (−1 или +1 по каждой оси). */
export function cellOfPoint(fp: Footprint, p: Point) {
  const i = Math.min(fp.nx - 1, Math.max(0, Math.floor((p.x + fp.sizeX / 2 - fp.offsetX) / fp.pitch)))
  const j = Math.min(fp.ny - 1, Math.max(0, Math.floor((p.y + fp.sizeY / 2 - fp.offsetY) / fp.pitch)))
  const c = cellCenter(fp, i, j)
  return { i, j, center: c, sx: p.x >= c.x ? 1 : -1, sy: p.y >= c.y ? 1 : -1 }
}

/**
 * Ухо: оболочка круга вокруг отверстия и круга в углу окна ячейки, поэтому оно сливается со стенками.
 * Тело занимает z от zFrom до zTo; вычитается из окна ячейки, и ухо остаётся материалом.
 */
export function fastenerEar(w: ManifoldToplevel, hole: Point, cell: Point, sx: number, sy: number, radius: number, pitch: number, zFrom: number, zTo: number): Manifold {
  const half = socketWindowWidth(pitch) / 2
  const disc = (x: number, y: number) => w.Manifold.cylinder(zTo - zFrom, radius, radius, 32).translate([x, y, zFrom])
  return w.Manifold.hull([disc(hole.x, hole.y), disc(cell.x + sx * half, cell.y + sy * half)])
}

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

/**
 * Окна ячеек под гнёздами: каждое окно открыто насквозь, кроме ушей вокруг отверстий этой ячейки.
 * floor — высота нижнего края гнезда (верх ушей). Без отверстий возвращает пустой список.
 */
export function cellWindows(w: ManifoldToplevel, c: FastenerConfig, fp: Footprint, floor = FLOOR): Manifold[] {
  const pos = allPositions(c, fp)
  if (!needsFloor(pos)) return []
  const holes = [
    ...pos.magnets.map((p) => ({ p, r: earRadius(c, 'magnets') })),
    ...pos.screws.map((p) => ({ p, r: earRadius(c, 'screws') })),
  ]
  const byCell = new Map<string, typeof holes>()
  for (const h of holes) {
    const { i, j } = cellOfPoint(fp, h.p)
    const key = `${i},${j}`
    byCell.set(key, [...(byCell.get(key) ?? []), h])
  }
  const template = socketWindow(w, fp.pitch, -1, floor + 0.002)
  const out: Manifold[] = []
  for (let i = 0; i < fp.nx; i++) {
    for (let j = 0; j < fp.ny; j++) {
      const center = cellCenter(fp, i, j)
      let cutter = template.translate([center.x, center.y, 0])
      const own = byCell.get(`${i},${j}`) ?? []
      if (own.length) {
        const ears = own.map((h) => {
          const cell = cellOfPoint(fp, h.p)
          return fastenerEar(w, h.p, center, cell.sx, cell.sy, h.r, fp.pitch, -2, floor + 1)
        })
        cutter = cutter.subtract(w.Manifold.union(ears))
      }
      out.push(cutter)
    }
  }
  return out
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
  // ухо должно помещаться в ячейку: отверстие внутри окна, а уши соседних отверстий не слипаются
  const half = socketWindowWidth(fp.pitch) / 2
  for (const kind of ['magnets', 'screws'] as const) {
    if (pos[kind].length === 0) continue
    const holeR = (kind === 'magnets' ? magnetSize(c).d : c.screwD) / 2
    if (HOLE_OFFSET + holeR > half || earRadius(c, kind) >= HOLE_OFFSET) out.push({ kind, key: 'fastener.earTooBig', index: 0 })
  }
  return out
}
