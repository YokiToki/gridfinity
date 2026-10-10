/** Соединители между частями плиты: настройки, планирование положений и геометрия. */
import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import type { Footprint, Point } from './footprint'
import type { Part } from './split'
import { CLEARANCE, SOCKET_HEIGHT, SOCKET_LAYERS } from './spec'
import { socketWindowWidth } from './profiles'


export type ConnectorType = 'none' | 'holes' | 'dovetail'
export const CONNECTOR_TYPES: ConnectorType[] = ['none', 'holes', 'dovetail']

export interface ConnectorConfig {
  type: ConnectorType
  /** Пресет отверстий: m3 | m6x2 | pin3 | custom. */
  preset: string
  /** Диаметр отверстия, мм. */
  diameter: number
  /** Глубина отверстия в каждую часть, мм. */
  depth: number
  /** Сколько соединителей на торец. */
  count: number
  /** Отступ от концов торца, мм. */
  inset: number
  /** Зазор печатного замка на сторону, мм. */
  clearance: number
  /** Ширина шейки и головки ласточкина хвоста вдоль торца, мм; глубина — `dovetailDepth`. */
  neck: number
  tip: number
  dovetailDepth: number
  /** Тип отдельных разрезов: ключ `x:3` / `y:1` (номер ячейки, перед которой разрез). */
  overrides: Record<string, ConnectorType>
}

export interface HolePreset { id: string; diameter: number; depth: number }
/** Размеры уже с зазором под посадку. */
export const HOLE_PRESETS: HolePreset[] = [
  { id: 'm3', diameter: 3.2, depth: 6 },
  { id: 'm6x2', diameter: 6.1, depth: 2.1 },
  { id: 'pin3', diameter: 3.1, depth: 6 },
]
export const CUSTOM = 'custom'

export const defaultConnector: ConnectorConfig = {
  type: 'none', preset: 'm3', diameter: 3.2, depth: 6, count: 2, inset: 10, clearance: 0.2, neck: 4, tip: 6, dovetailDepth: 1.2, overrides: {},
}

export function withHolePreset(c: ConnectorConfig, id: string): ConnectorConfig {
  const p = HOLE_PRESETS.find((x) => x.id === id)
  return p ? { ...c, preset: id, diameter: p.diameter, depth: p.depth } : { ...c, preset: CUSTOM }
}

export const cutKey = (axis: 'x' | 'y', index: number) => `${axis}:${index}`

/** Тип соединителя на конкретном разрезе: переопределение или общий. */
export const connectorTypeAt = (c: ConnectorConfig, axis: 'x' | 'y', index: number): ConnectorType => c.overrides[cutKey(axis, index)] ?? c.type

// ---------------------------------------------------------------------------------------------
// Геометрия соединителей. Координаты торца («канонический» кадр): n — вдоль нормали разреза от части A к B,
// u — вдоль торца от его начала, z — вверх.
// ---------------------------------------------------------------------------------------------

/** Минимальная стенка между соединителем и гнездом или отверстием, мм. */
export const MIN_WALL = 0.4

export interface Face {
  axis: 'x' | 'y'
  /** Индекс ячейки, перед которой проходит разрез. */
  cut: number
  a: Part
  b: Part
  /** Координата разреза (x для axis 'x', y для 'y'). */
  pos: number
  /** Протяжённость торца в мировых координатах по другой оси. */
  from: number
  to: number
}

export const faceLength = (f: Face) => f.to - f.from

/** Торцы между соседними частями. */
export function cutFaces(fp: Footprint, parts: Part[]): Face[] {
  const faces: Face[] = []
  for (const a of parts) {
    for (const b of parts) {
      if (a.col + 1 === b.col && a.row === b.row) faces.push({ axis: 'x', cut: a.i1, a, b, pos: a.x1, from: a.y0, to: a.y1 })
      if (a.row + 1 === b.row && a.col === b.col) faces.push({ axis: 'y', cut: a.j1, a, b, pos: a.y1, from: a.x0, to: a.x1 })
    }
  }
  void fp
  return faces
}

/** Ширина материала между соседними гнёздами на высоте z′ над низом гнезда (z′ < 0 — окно под гнездом). */
export function ridgeWidthAt(pitch: number, zRel: number): number {
  const { low, wall, up } = SOCKET_LAYERS
  const top = pitch - 2 * CLEARANCE + 0.5
  const mid = top - 2 * up
  const bottom = mid - 2 * low
  if (zRel < 0) return pitch - socketWindowWidth(pitch)
  if (zRel <= low) return pitch - (bottom + (mid - bottom) * (zRel / low))
  if (zRel <= low + wall) return pitch - mid
  if (zRel <= SOCKET_HEIGHT) return pitch - (mid + (top - mid) * ((zRel - low - wall) / up))
  return 0
}

/** Высота центра соединителя: середина вертикального участка стенки, но не ниже, чем диаметр/2 + 0.2 мм от низа плиты. */
export const connectorZ = (pocketBottom: number, diameter: number) => Math.max(pocketBottom + SOCKET_LAYERS.low + SOCKET_LAYERS.wall / 2, diameter / 2 + 0.2)

/** Отверстие диаметра D на высоте zc помещается в стенку между гнёздами с запасом MIN_WALL. */
export function holeFitsRidge(pitch: number, pocketBottom: number, diameter: number, zc: number): boolean {
  const r = diameter / 2
  if (zc - r < 0) return false
  const steps = 24
  for (let k = 0; k <= steps; k++) {
    const dz = -r + (2 * r * k) / steps
    const chord = 2 * Math.sqrt(Math.max(r * r - dz * dz, 0))
    if (ridgeWidthAt(pitch, zc + dz - pocketBottom) - chord < 2 * MIN_WALL - 1e-9) return false
  }
  return true
}

/** Ласточкин хвост: глубина вместе с зазором должна уместиться в половину стенки на всей высоте гнезда замка. */
export function dovetailFits(pitch: number, pocketBottom: number, c: ConnectorConfig, zc: number, height: number): boolean {
  const half = (zc - height / 2 - c.clearance)
  if (half < 0) return false
  let minRidge = Infinity
  for (let k = 0; k <= 12; k++) {
    const z = zc - height / 2 - c.clearance + ((height + 2 * c.clearance) * k) / 12
    minRidge = Math.min(minRidge, ridgeWidthAt(pitch, z - pocketBottom))
  }
  return c.dovetailDepth + c.clearance <= minRidge / 2 - MIN_WALL + 1e-9 && c.tip >= c.neck
}

export interface FastenerHole { x: number; y: number; r: number }

export interface ConnectorIssue {
  /** Ключ перевода connector.* */
  key: string
  /** Разрез: `x:4` / `y:1`. */
  cut: string
  /** Часть(и), на стыке которых проблема. */
  parts: string
}

export interface FacePlan {
  face: Face
  type: ConnectorType
  /** Положения соединителей вдоль торца, мм от его начала. */
  positions: number[]
  zc: number
  issues: ConnectorIssue[]
}

export interface PlanContext {
  pitch: number
  pocketBottom: number
  holes: FastenerHole[]
}

/** Круг пересекает прямоугольник [n0,n1]×[u0,u1]. */
function circleHitsRect(cn: number, cu: number, r: number, n0: number, n1: number, u0: number, u1: number) {
  const dn = Math.max(n0 - cn, 0, cn - n1)
  const du = Math.max(u0 - cu, 0, cu - u1)
  return Math.hypot(dn, du) < r
}

const toCanonical = (f: Face, p: Point) => (f.axis === 'x' ? { n: p.x - f.pos, u: p.y - f.from } : { n: p.y - f.pos, u: f.to - p.x })

/** Номинальные положения: count штук между отступами с обоих концов, симметрично; один — по центру. */
export function nominalPositions(length: number, count: number, inset: number): number[] {
  if (count <= 0) return []
  if (count === 1) return [length / 2]
  const span = length - 2 * inset
  if (span < 0) return []
  return Array.from({ length: count }, (_, k) => inset + (span * k) / (count - 1))
}

/** Планирует соединители одного торца: сдвигает их от отверстий крепежа и сообщает о нарушениях. */
export function planFace(face: Face, c: ConnectorConfig, ctx: PlanContext): FacePlan {
  const type = c.overrides[cutKey(face.axis, face.cut)] ?? c.type
  const cutId = cutKey(face.axis, face.cut)
  const parts = `${face.a.label}–${face.b.label}`
  const issues: ConnectorIssue[] = []
  const plan: FacePlan = { face, type, positions: [], zc: 0, issues }
  if (type === 'none') return plan

  const L = faceLength(face)
  const isHole = type === 'holes'
  const halfU = (isHole ? c.diameter : c.tip + 2 * c.clearance) / 2 // половина размера вдоль торца
  const depth = isHole ? c.depth : c.dovetailDepth + c.clearance
  const dz = isHole ? c.diameter : SOCKET_LAYERS.wall
  plan.zc = connectorZ(ctx.pocketBottom, dz)

  const fits = isHole ? holeFitsRidge(ctx.pitch, ctx.pocketBottom, c.diameter, plan.zc) : dovetailFits(ctx.pitch, ctx.pocketBottom, c, plan.zc, SOCKET_LAYERS.wall)
  if (!fits) { issues.push({ key: isHole ? 'connector.tooBigForRidge' : 'connector.dovetailTooDeep', cut: cutId, parts }); return plan }

  const nominal = nominalPositions(L, c.count, c.inset)
  if (nominal.length === 0) { issues.push({ key: 'connector.noRoom', cut: cutId, parts }); return plan }
  const holes = ctx.holes.map((h) => ({ ...toCanonical(face, h), r: h.r }))
  const free = (u: number) =>
    u - halfU >= MIN_WALL && u + halfU <= L - MIN_WALL &&
    !holes.some((h) => circleHitsRect(h.n, h.u, h.r + MIN_WALL, -depth, depth, u - halfU, u + halfU))
  const spacing = nominal.length > 1 ? nominal[1] - nominal[0] : L
  const maxShift = Math.min(10, spacing / 2)
  for (const u0 of nominal) {
    let placed: number | null = null
    for (let s = 0; s <= maxShift + 1e-9 && placed === null; s += 0.5) {
      for (const u of s === 0 ? [u0] : [u0 + s, u0 - s]) if (free(u) && !plan.positions.some((q) => Math.abs(q - u) < 2 * halfU)) { placed = u; break }
    }
    if (placed === null) issues.push({ key: 'connector.collision', cut: cutId, parts })
    else plan.positions.push(placed)
  }
  plan.positions.sort((a, b) => a - b)
  return plan
}

export interface PartExtras { add: Manifold[]; sub: Manifold[] }

const place = (m: Manifold, f: Face) => (f.axis === 'x' ? m.translate([f.pos, f.from, 0]) : m.rotate([0, 0, 90]).translate([f.to, f.pos, 0]))

/** Трапеция ласточкина хвоста в плоскости (n, u): шейка у торца, головка на глубине. grow — расширение (зазор). */
function dovetail(w: ManifoldToplevel, u: number, c: ConnectorConfig, grow: number, zc: number, height: number): Manifold {
  const { CrossSection, Manifold } = w
  const x0 = -0.3 // заходит в свою часть, чтобы ключ срастался с торцом
  const pts: [number, number][] = [[x0, u - c.neck / 2], [c.dovetailDepth, u - c.tip / 2], [c.dovetailDepth, u + c.tip / 2], [x0, u + c.neck / 2]]
  // фигура хранится как (n, u): extrude вдоль z, координаты x = n, y = u
  let cs = CrossSection.ofPolygons([pts])
  if (grow > 0) cs = cs.offset(grow, 'Miter', 2, 8)
  return Manifold.extrude(cs, height + 2 * grow).translate([0, 0, zc - height / 2 - grow])
}

/** Что нужно добавить и вычесть из каждой части (по метке) для всех торцов. */
export function connectorExtras(w: ManifoldToplevel, plans: FacePlan[], c: ConnectorConfig): Map<string, PartExtras> {
  const out = new Map<string, PartExtras>()
  const of = (label: string) => { let e = out.get(label); if (!e) { e = { add: [], sub: [] }; out.set(label, e) } return e }
  const { Manifold } = w
  for (const p of plans) {
    if (p.type === 'none') continue
    for (const u of p.positions) {
      const f = p.face
      if (p.type === 'holes') {
        const r = c.diameter / 2
        const hole = Manifold.cylinder(c.depth + 0.05, r, r, 32).rotate([0, 90, 0]) // вдоль +n от n = 0
        of(f.a.label).sub.push(place(hole.translate([-c.depth - 0.05, u, p.zc]), f))
        of(f.b.label).sub.push(place(hole.translate([0, u, p.zc]), f))
      } else {
        const h = SOCKET_LAYERS.wall
        of(f.a.label).add.push(place(dovetail(w, u, c, 0, p.zc, h), f))
        of(f.b.label).sub.push(place(dovetail(w, u, c, c.clearance, p.zc, h), f))
      }
    }
  }
  return out
}
