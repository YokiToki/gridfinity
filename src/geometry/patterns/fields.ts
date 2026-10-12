/** Поверхностные узоры: чёткие маски покрытия (0 или 1) в координатах брелока (начало — центр габарита силуэта). */
export type PatternKind = 'none' | 'lines' | 'crosshatch' | 'dots' | 'hex' | 'ripples'
export const PATTERN_KINDS: PatternKind[] = ['none', 'lines', 'crosshatch', 'dots', 'hex', 'ripples']
export type PatternScope = 'relief' | 'plateau' | 'base'

export interface PatternParams {
  kind: PatternKind
  /** Шаг (период, расстояние между центрами), мм. */
  pitch: number
  /** Ширина линии или диаметр точки, мм. */
  width: number
  /** Глубина канавки, мм. */
  depth: number
  /** Угол линий и решётки, градусы. */
  angle: number
  /** Сдвиг узора, мм. */
  offset: number
  /** Точки: шахматный порядок (иначе квадратная решётка). */
  staggered: boolean
  scope: PatternScope
}

const mod = (a: number, b: number) => ((a % b) + b) % b

/** Полоса периода pitch и ширины width с центром на кратных pitch: расстояние до ближайшей оси ≤ width / 2. */
function stripe(u: number, pitch: number, width: number): boolean {
  const r = mod(u + pitch / 2, pitch) - pitch / 2
  return Math.abs(r) <= width / 2
}

/** Расстояние до края шестиугольной ячейки решётки с шагом pitch (центры) от точки (x, y): pitch / 2 − max |проекция на нормали|. */
function hexEdgeDistance(x: number, y: number, pitch: number): number {
  const h = (pitch * Math.sqrt(3)) / 2
  // ближайший центр решётки с базисом a1 = (pitch, 0), a2 = (pitch/2, h): проверяем соседей округлённых координат
  const q = x / pitch - y / (2 * h) , r = y / h
  let best = Infinity
  let bestC: [number, number] = [0, 0]
  for (let dq = -1; dq <= 1; dq++) for (let dr = -1; dr <= 1; dr++) {
    const cq = Math.round(q) + dq, cr = Math.round(r) + dr
    const cx = cq * pitch + (cr * pitch) / 2, cy = cr * h
    const d = Math.hypot(x - cx, y - cy)
    if (d < best) { best = d; bestC = [cx, cy] }
  }
  const px = x - bestC[0], py = y - bestC[1]
  let m = 0
  for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) m = Math.max(m, Math.abs(px * Math.cos(a) + py * Math.sin(a)))
  return pitch / 2 - m
}

/** 1, если точка попадает в узор (канавка), иначе 0. Края чёткие, поэтому узор у шага сетки выглядит ступенчато (предупреждение о разрешении). */
export function coverage(p: PatternParams, x: number, y: number): 0 | 1 {
  if (p.kind === 'none' || !(p.pitch > 0)) return 0
  const a = (p.angle * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  switch (p.kind) {
    case 'lines': return stripe(x * c + y * s + p.offset, p.pitch, p.width) ? 1 : 0
    case 'crosshatch': return stripe(x * c + y * s + p.offset, p.pitch, p.width) || stripe(-x * s + y * c + p.offset, p.pitch, p.width) ? 1 : 0
    case 'ripples': return stripe(Math.hypot(x, y) + p.offset, p.pitch, p.width) ? 1 : 0
    case 'dots': {
      // повернутая система координат; шахматный порядок — чётные ряды сдвинуты на полшага
      const u = x * c + y * s + p.offset, v = -x * s + y * c + p.offset
      const row = Math.round(v / p.pitch)
      const shift = p.staggered && mod(row, 2) === 1 ? p.pitch / 2 : 0
      const du = mod(u - shift + p.pitch / 2, p.pitch) - p.pitch / 2, dv = v - row * p.pitch
      return Math.hypot(du, dv) <= p.width / 2 ? 1 : 0
    }
    case 'hex': {
      const u = x * c + y * s + p.offset, v = -x * s + y * c + p.offset
      return hexEdgeDistance(u, v, p.pitch) <= p.width / 2 ? 1 : 0
    }
    default: return 0
  }
}
