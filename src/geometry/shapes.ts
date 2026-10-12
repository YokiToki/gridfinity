// Готовые фигуры Keychain (режим «Форма»): аналитическая проверка «внутри» и маска для общего конвейера рельефа.
// Размеры в мм, центр фигуры — центр её габарита (после растеризации габарит всегда ровно width × height).

export type ShapeKind = 'rect' | 'circle' | 'ellipse' | 'capsule' | 'polygon'
export const SHAPE_KINDS: ShapeKind[] = ['rect', 'circle', 'ellipse', 'capsule', 'polygon']

/** Бортик: приподнятая кайма вдоль края фигуры. */
export interface RimParams { enabled: boolean; width: number; height: number }

export interface ShapeParams {
  kind: ShapeKind
  /** Ширина; у круга — диаметр, у многоугольника — диаметр описанной окружности (расстояние между крайними вершинами). */
  width: number
  /** Высота; у круга и многоугольника не используется. */
  height: number
  /** Радиус скругления углов (прямоугольник, многоугольник). */
  radius: number
  /** Число сторон многоугольника, 3…12. */
  sides: number
  /** Поворот многоугольника, градусы; при 0 одна вершина смотрит вправо. */
  rotation: number
  rim: RimParams
}

export const MIN_SIDES = 3
export const MAX_SIDES = 12
export const defaultRim: RimParams = { enabled: false, width: 1.2, height: 0.8 }
export const defaultShape: ShapeParams = { kind: 'rect', width: 54, height: 30, radius: 4, sides: 6, rotation: 0, rim: defaultRim }

/** Заготовки размеров: бирка 54 × 30, круг 40 мм, широкая пластина 70 × 25. */
export const SHAPE_PRESETS: { id: 'idTag' | 'round' | 'wide'; shape: Partial<ShapeParams> }[] = [
  { id: 'idTag', shape: { kind: 'rect', width: 54, height: 30, radius: 4 } },
  { id: 'round', shape: { kind: 'circle', width: 40, height: 40 } },
  { id: 'wide', shape: { kind: 'rect', width: 70, height: 25, radius: 4 } },
]

/** Размеры фигуры по её виду: у круга и многоугольника высота определяется шириной. */
const dims = (s: ShapeParams): { w: number; h: number } => (s.kind === 'circle' ? { w: s.width, h: s.width } : { w: s.width, h: s.height })

export const clampSides = (n: number) => Math.min(MAX_SIDES, Math.max(MIN_SIDES, Math.round(Number.isFinite(n) ? n : MIN_SIDES)))

/** Радиус скругления, который действительно применяется: не больше половины меньшей стороны (прямоугольник) или радиуса описанной окружности (многоугольник). */
export function effectiveRadius(s: ShapeParams): number {
  const r = Number.isFinite(s.radius) ? Math.max(0, s.radius) : 0
  if (s.kind === 'rect') return Math.min(r, Math.min(s.width, s.height) / 2)
  if (s.kind === 'polygon') return Math.min(r, s.width / 2)
  return 0
}

/** Вершины ядра многоугольника (правильный многоугольник радиуса R − r): скругление — сумма Минковского ядра с кругом r, так крайние точки остаются на радиусе R. */
export function polygonVertices(s: ShapeParams): [number, number][] {
  const n = clampSides(s.sides)
  const rho = s.width / 2 - effectiveRadius(s)
  const a0 = (s.rotation * Math.PI) / 180
  return Array.from({ length: n }, (_, k) => [rho * Math.cos(a0 + (2 * Math.PI * k) / n), rho * Math.sin(a0 + (2 * Math.PI * k) / n)] as [number, number])
}

export interface ShapeBounds { minX: number; maxX: number; minY: number; maxY: number; w: number; h: number }

/** Габарит фигуры в её собственных координатах (точно, без растеризации). */
export function shapeBounds(s: ShapeParams): ShapeBounds {
  if (s.kind === 'polygon') {
    const r = effectiveRadius(s)
    const v = polygonVertices(s)
    const xs = v.map((p) => p[0]), ys = v.map((p) => p[1])
    const minX = Math.min(...xs) - r, maxX = Math.max(...xs) + r, minY = Math.min(...ys) - r, maxY = Math.max(...ys) + r
    return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY }
  }
  const { w, h } = dims(s)
  return { minX: -w / 2, maxX: w / 2, minY: -h / 2, maxY: h / 2, w, h }
}

/** Расстояние от точки до отрезка. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Аналитическая проверка «точка (x, y) внутри фигуры», координаты фигуры. */
export function shapeInside(s: ShapeParams): (x: number, y: number) => boolean {
  const { w, h } = dims(s)
  switch (s.kind) {
    case 'circle': {
      const R = w / 2
      return (x, y) => x * x + y * y <= R * R
    }
    case 'ellipse': {
      const a = w / 2, b = h / 2
      return (x, y) => (x * x) / (a * a) + (y * y) / (b * b) <= 1
    }
    case 'capsule': {
      // стадион: отрезок вдоль длинной оси, радиус — половина короткой стороны
      const r = Math.min(w, h) / 2
      const L = Math.max(w, h) / 2 - r
      return w >= h ? (x, y) => Math.hypot(x - Math.max(-L, Math.min(L, x)), y) <= r : (x, y) => Math.hypot(x, y - Math.max(-L, Math.min(L, y))) <= r
    }
    case 'polygon': {
      const r = effectiveRadius(s), v = polygonVertices(s), n = v.length
      // внешние нормали рёбер (многоугольник выпуклый и обходится против часовой стрелки)
      const edges = v.map((p, k) => {
        const q = v[(k + 1) % n]
        const ex = q[0] - p[0], ey = q[1] - p[1], len = Math.hypot(ex, ey) || 1
        return { ax: p[0], ay: p[1], bx: q[0], by: q[1], nx: ey / len, ny: -ex / len }
      })
      if (n < 3 || edges.every((e) => e.nx === 0 && e.ny === 0)) return (x, y) => Math.hypot(x, y) <= r
      return (x, y) => {
        let worst = -Infinity
        for (const e of edges) { const d = (x - e.ax) * e.nx + (y - e.ay) * e.ny; if (d > worst) worst = d }
        if (worst <= 0) return true // внутри ядра
        if (worst > r) return false // дальше r от любой прямой ребра
        for (const e of edges) if (segDist(x, y, e.ax, e.ay, e.bx, e.by) <= r) return true
        return false
      }
    }
    default: {
      // прямоугольник со скруглением
      const r = effectiveRadius(s)
      const hx = w / 2 - r, hy = h / 2 - r
      return (x, y) => {
        const qx = Math.abs(x) - hx, qy = Math.abs(y) - hy
        return Math.abs(x) <= w / 2 && Math.abs(y) <= h / 2 && Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) <= r + 1e-12
      }
    }
  }
}

/** Число пикселей маски по длинной стороне. */
export const SHAPE_MASK_PX = 2048

export interface ShapeMask {
  mask: Uint8Array
  /** Размер маски в пикселях. */
  width: number
  height: number
  /** Размер габарита в мм: ровно width × height фигуры. */
  wMm: number
  hMm: number
}

/** Маска фигуры: габарит ровно заполняет прямоугольник пикселей, длинная сторона — `longest` пикселей. */
export function shapeMask(s: ShapeParams, longest = SHAPE_MASK_PX): ShapeMask {
  const b = shapeBounds(s)
  const k = longest / Math.max(b.w, b.h)
  const width = Math.max(3, Math.round(b.w * k)), height = Math.max(3, Math.round(b.h * k))
  const inside = shapeInside(s)
  const mask = new Uint8Array(width * height)
  for (let j = 0; j < height; j++) {
    const y = b.maxY - ((j + 0.5) / height) * b.h
    for (let i = 0; i < width; i++) {
      const x = b.minX + ((i + 0.5) / width) * b.w
      if (inside(x, y)) mask[j * width + i] = 1
    }
  }
  return { mask, width, height, wMm: b.w, hMm: b.h }
}
