import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import { getWasm } from './wasm'
import { layeredHullRect, layerRadii, LIP_LAYERS, rectSlab, type LipStyle } from './profiles'
import type { Footprint } from './footprint'
import { axisMm, type AxisSize } from './baseplate'
import { defaultFasteners, type FastenerConfig } from './fasteners'
import { DEFAULT_PITCH, FOOT_R_TOP, HEIGHT_UNIT, R_MIN } from './spec'
import { binHeightMm, binLayout, type BinLayout, bottomFasteners, buildBinBody, FOOT_HEIGHT, lipOpening, prism, type BinHeight, type BinThickness } from './bin'

export type ScoopSide = 'front' | 'back' | 'left' | 'right'
export const SCOOP_SIDES: ScoopSide[] = ['front', 'back', 'left', 'right']

export type BoxHeight = BinHeight
export type BoxThickness = BinThickness
export { FOOT_HEIGHT }
export interface ScoopConfig { front: boolean; back: boolean; left: boolean; right: boolean; radius: number }

/**
 * Перегородки: позиции центров в долях внутренней длины полости по каждой оси (по возрастанию).
 * removed — убранные участки (слияние отсеков): `x:k:j` — k-я вертикальная перегородка в строке j, `y:k:i` — k-я горизонтальная в столбце i.
 */
export interface Compartments { cols: number; rows: number; xDividers: number[]; yDividers: number[]; removed: string[] }

export interface BoxParams {
  pitch: number
  x: AxisSize
  y: AxisSize
  height: BoxHeight
  thickness: BoxThickness
  lip: LipStyle
  scoop: ScoopConfig
  compartments: Compartments
  fasteners: FastenerConfig
}

export const defaultBoxThickness: BoxThickness = { outerWall: 0.95, innerWall: 1.2, floor: 0.7 }
export const defaultScoop: ScoopConfig = { front: false, back: false, left: false, right: false, radius: 8 }
export const defaultCompartments: Compartments = { cols: 1, rows: 1, xDividers: [], yDividers: [], removed: [] }

export const defaultBox: BoxParams = {
  pitch: DEFAULT_PITCH,
  x: { mode: 'units', value: 2, align: 'center' },
  y: { mode: 'units', value: 2, align: 'center' },
  height: { mode: 'units', value: 3 },
  thickness: defaultBoxThickness,
  lip: 'default',
  scoop: defaultScoop,
  compartments: defaultCompartments,
  fasteners: defaultFasteners,
}

export const boxHeightMm = binHeightMm

/** Положения центров перегородок при равном делении полости длиной len на n отсеков перегородками толщиной t. */
export function equalDividers(n: number, len: number, t: number): number[] {
  if (n <= 1) return []
  const cw = (len - (n - 1) * t) / n
  return Array.from({ length: n - 1 }, (_, k) => ((k + 1) * cw + (k + 0.5) * t) / len)
}

export interface BoxLayout extends BinLayout {
  /** Радиус скругления дна с учётом ограничений. */
  scoopRadius: number
}

export const boxLayout = (p: BoxParams): BoxLayout => {
  const l = binLayout(p)
  const depth = l.wallTop - l.cavityBottom
  const scoopRadius = Math.max(0, Math.min(p.scoop.radius, depth, Math.min(l.cavityX, l.cavityY) / 2))
  return { ...l, scoopRadius }
}

/** Сообщения (не ошибки): радиус скругления ограничен. */
export function boxNotices(p: BoxParams): string[] {
  const l = boxLayout(p)
  const anySide = SCOOP_SIDES.some((s) => p.scoop[s])
  return anySide && l.scoopRadius < p.scoop.radius - 1e-9 ? ['box.notice.scoopClamped'] : []
}

export interface BoxError { field: string; key: string }
export const MAX_BOX_SIZE = 1000
export const MAX_COMPARTMENTS = 20

export function validateBox(p: BoxParams): { ok: boolean; errors: BoxError[] } {
  const errors: BoxError[] = []
  const bad = (field: string, key: string) => errors.push({ field, key })
  const sx = axisMm(p.x, p.pitch), sy = axisMm(p.y, p.pitch)
  for (const [f, v] of [['x', sx], ['y', sy]] as const) {
    if (!Number.isFinite(v) || v < p.pitch - 1e-9) bad(f, 'box.error.sizeMin')
    else if (v > MAX_BOX_SIZE) bad(f, 'baseplate.error.sizeTooLarge')
  }
  const h = boxHeightMm(p.height)
  if (!Number.isFinite(h) || h <= 0) bad('height', 'box.error.height')
  for (const f of ['outerWall', 'innerWall', 'floor'] as const) {
    const v = p.thickness[f]
    if (!Number.isFinite(v) || v < 0) bad(`thickness.${f}`, 'baseplate.error.negative')
    else if (v === 0 && f !== 'floor') bad(`thickness.${f}`, 'thickness.zero')
  }
  if (!Number.isFinite(p.scoop.radius) || p.scoop.radius < 0) bad('scoop.radius', 'baseplate.error.negative')
  if (errors.length) return { ok: false, errors }
  const l = boxLayout(p)
  if (l.cavityX < 1 || l.cavityY < 1) bad('thickness.outerWall', 'box.error.noCavity')
  else if (l.wallTop - l.cavityBottom < 1) bad(l.wallTop <= FOOT_HEIGHT ? 'height' : 'thickness.floor', 'box.error.noCavity')
  const c = p.compartments
  if (!Number.isInteger(c.cols) || !Number.isInteger(c.rows) || c.cols < 1 || c.rows < 1 || c.cols > MAX_COMPARTMENTS || c.rows > MAX_COMPARTMENTS) bad('compartments', 'box.error.compartments')
  else {
    const t = p.thickness.innerWall
    if (c.xDividers.length * t >= l.cavityX || c.yDividers.length * t >= l.cavityY) bad('thickness.innerWall', 'box.error.dividersTooThick')
  }
  return { ok: errors.length === 0, errors }
}

/** Ширина и глубина отсеков после перегородок (по осям), мм: для предупреждения о слишком узких отсеках. */
export function compartmentSizes(p: BoxParams): { widths: number[]; depths: number[] } {
  const l = boxLayout(p), t = p.thickness.innerWall
  const sizes = (cuts: number[], len: number) => {
    const edges = [0, ...cuts.map((f) => f * len), len]
    return edges.slice(0, -1).map((e, i) => edges[i + 1] - e - (i > 0 ? t / 2 : 0) - (i < edges.length - 2 ? t / 2 : 0))
  }
  return { widths: sizes(p.compartments.xDividers, l.cavityX), depths: sizes(p.compartments.yDividers, l.cavityY) }
}

/** Полость: призма над полом, при губе — фаска 45° к нижнему краю губы и профиль губы. */
function buildCavity(w: ManifoldToplevel, p: BoxParams, l: BoxLayout): Manifold {
  const wall = p.thickness.outerWall
  const rc = Math.max(FOOT_R_TOP - wall, R_MIN)
  const top = l.total + 1
  if (p.lip === 'none') return prism(w, l.cavityX, l.cavityY, rc, l.cavityBottom, top)
  const layers = LIP_LAYERS[p.lip]
  const { rLow } = layerRadii(FOOT_R_TOP, layers)
  const inset = layers.low + layers.up
  const lipBottomX = l.outerX - 2 * inset, lipBottomY = l.outerY - 2 * inset
  const parts: Manifold[] = []
  // нижний край губы уже полости на overhang — переход фаской 45°, чтобы не было горизонтального свеса
  const overhang = Math.max((l.cavityX - lipBottomX) / 2, (l.cavityY - lipBottomY) / 2, 0)
  if (overhang > 1e-6) {
    const z0 = l.wallTop - overhang
    parts.push(prism(w, l.cavityX, l.cavityY, rc, l.cavityBottom, z0 + 0.001))
    parts.push(w.Manifold.hull([
      rectSlab(w, l.cavityX, l.cavityY, rc, z0),
      rectSlab(w, Math.min(l.cavityX, lipBottomX), Math.min(l.cavityY, lipBottomY), Math.min(rc, rLow), l.wallTop),
    ]))
  } else {
    parts.push(prism(w, l.cavityX, l.cavityY, rc, l.cavityBottom, l.wallTop + 0.001))
  }
  parts.push(lipOpening(w, p.lip, l)!)
  return w.Manifold.union(parts)
}

/** Перегородки: участки между соседними линиями, с учётом убранных (слитые отсеки). */
function buildDividers(w: ManifoldToplevel, p: BoxParams, l: BoxLayout): Manifold[] {
  const t = p.thickness.innerWall
  const c = p.compartments
  const z0 = l.cavityBottom - 0.01, h = l.wallTop - z0
  const x0 = -l.cavityX / 2, y0 = -l.cavityY / 2
  const xs = c.xDividers.map((f) => x0 + f * l.cavityX)
  const ys = c.yDividers.map((f) => y0 + f * l.cavityY)
  const xEdges = [x0, ...xs, x0 + l.cavityX], yEdges = [y0, ...ys, y0 + l.cavityY]
  const out: Manifold[] = []
  const box = (ax: number, ay: number, bx: number, by: number) => w.Manifold.cube([bx - ax, by - ay, h]).translate([ax, ay, z0])
  xs.forEach((cx, k) => {
    for (let j = 0; j < yEdges.length - 1; j++) {
      if (c.removed.includes(`x:${k}:${j}`)) continue
      const a = yEdges[j], b = yEdges[j + 1]
      out.push(box(cx - t / 2, a, cx + t / 2, b))
    }
  })
  ys.forEach((cy, k) => {
    for (let i = 0; i < xEdges.length - 1; i++) {
      if (c.removed.includes(`y:${k}:${i}`)) continue
      const a = xEdges[i], b = xEdges[i + 1]
      out.push(box(a, cy - t / 2, b, cy + t / 2))
    }
  })
  return out
}

/** Скругление дна вдоль выбранных сторон: призма «квадрат r×r минус круг», добавляется к корпусу. */
function buildScoops(w: ManifoldToplevel, p: BoxParams, l: BoxLayout): Manifold[] {
  const r = l.scoopRadius
  if (r < 0.01) return []
  const { Manifold } = w
  const front = (len: number, wallDist: number) => {
    const block = Manifold.cube([len, r, r]).translate([-len / 2, -wallDist, l.cavityBottom - 0.01])
    const cyl = Manifold.cylinder(len + 2, r, r, 48).rotate([0, 90, 0]).translate([-len / 2 - 1, -wallDist + r, l.cavityBottom + r])
    return block.subtract(cyl)
  }
  const out: Manifold[] = []
  const rot = (m: Manifold, deg: number) => m.rotate([0, 0, deg])
  if (p.scoop.front) out.push(front(l.cavityX, l.cavityY / 2))
  if (p.scoop.back) out.push(rot(front(l.cavityX, l.cavityY / 2), 180))
  if (p.scoop.right) out.push(rot(front(l.cavityY, l.cavityX / 2), 90))
  if (p.scoop.left) out.push(rot(front(l.cavityY, l.cavityX / 2), -90))
  return out
}

/** Корпус коробки: ноги на полных ячейках, тело над ними, полость с губой, перегородки, скругление дна, отверстия. */
export function buildBoxSolid(w: ManifoldToplevel, p: BoxParams): Manifold {
  const { Manifold } = w
  const l = boxLayout(p)
  let shell = buildBinBody(w, p, l).subtract(buildCavity(w, p, l))
  const adds = [...buildDividers(w, p, l), ...buildScoops(w, p, l)]
  if (adds.length) shell = shell.add(Manifold.union(adds))
  const subs = bottomFasteners(w, p, l)
  if (subs.length) shell = shell.subtract(Manifold.union(subs))
  return shell
}

export async function buildBox(p: BoxParams, wasmUrl?: string): Promise<Manifold> {
  return buildBoxSolid(await getWasm(wasmUrl), p)
}
