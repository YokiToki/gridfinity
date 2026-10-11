/** Трассировка маски в контуры и SVG-путь: границы пикселей → петли → упрощение Дугласа–Пекера. */
export type Pt = [number, number]

/** Петли границ закрашенной области (закрашенное справа от направления обхода). Дырки — отдельные петли. */
export function maskLoops(mask: Uint8Array, w: number, h: number): Pt[][] {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] !== 0)
  const out = new Map<number, number[]>() // вершина → индексы рёбер, выходящих из неё
  const edges: [number, number][] = []
  const key = (x: number, y: number) => y * (w + 1) + x
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    const e = edges.length
    edges.push([key(x1, y1), 0])
    const k = key(x0, y0)
    const l = out.get(k)
    if (l) l.push(e); else out.set(k, [e])
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!at(x, y)) continue
    if (!at(x, y - 1)) add(x, y, x + 1, y)
    if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1)
    if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1)
    if (!at(x - 1, y)) add(x, y + 1, x, y)
  }
  const used = new Uint8Array(edges.length)
  const loops: Pt[][] = []
  const pointOf = (k: number): Pt => [k % (w + 1), Math.floor(k / (w + 1))]
  const startOf = new Array<number>(edges.length)
  for (const [k, l] of out) for (const e of l) startOf[e] = k
  for (let e0 = 0; e0 < edges.length; e0++) {
    if (used[e0]) continue
    const loop: Pt[] = []
    let e = e0
    for (;;) {
      used[e] = 1
      loop.push(pointOf(startOf[e]))
      const next = (out.get(edges[e][0]) ?? []).find((i) => !used[i])
      if (next === undefined) break
      e = next
    }
    loops.push(loop)
  }
  return loops
}

/** Убирает вершины на прямых отрезках (ступенчатые границы дают много коллинеарных точек). */
export function dropCollinear(loop: Pt[]): Pt[] {
  const n = loop.length
  if (n < 4) return loop
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const p = loop[(i + n - 1) % n], c = loop[i], q = loop[(i + 1) % n]
    if ((c[0] - p[0]) * (q[1] - c[1]) - (c[1] - p[1]) * (q[0] - c[0]) !== 0) out.push(c)
  }
  return out
}

const dist = (p: Pt, a: Pt, b: Pt) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

function dp(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts
  let idx = 0, max = 0
  for (let i = 1; i < pts.length - 1; i++) { const d = dist(pts[i], pts[0], pts[pts.length - 1]); if (d > max) { max = d; idx = i } }
  if (max <= tol) return [pts[0], pts[pts.length - 1]]
  return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)]
}

/** Упрощение замкнутой петли: делится по самой далёкой от начала точке, каждая половина — Дуглас–Пекер. */
export function simplifyLoop(loop: Pt[], tol: number): Pt[] {
  if (loop.length < 4) return loop
  let far = 0, max = -1
  for (let i = 1; i < loop.length; i++) { const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]); if (d > max) { max = d; far = i } }
  const a = dp(loop.slice(0, far + 1), tol), b = dp([...loop.slice(far), loop[0]], tol)
  return [...a.slice(0, -1), ...b.slice(0, -1)]
}

/** Путь SVG: координаты делятся на scale и округляются до precision; в относительных командах разности считаются по округлённым точкам (без накопления погрешности). */
export function toPath(loops: Pt[][], scale: number, precision = 0.1): string {
  const q = (v: number) => Math.round(v / scale / precision)
  const fmt = (n: number) => { const v = n * precision; return String(Math.round(v * 1e3) / 1e3) }
  let d = ''
  for (const l of loops) {
    if (l.length < 3) continue
    let px = q(l[0][0]), py = q(l[0][1])
    d += `M${fmt(px)} ${fmt(py)}`
    let rel = ''
    for (let i = 1; i < l.length; i++) {
      const x = q(l[i][0]), y = q(l[i][1])
      if (x === px && y === py) continue
      rel += `${fmt(x - px)} ${fmt(y - py)} `
      px = x; py = y
    }
    d += `l${rel.trimEnd().replace(/ -/g, '-')}z`
  }
  return d
}

/** Маска → путь (even-odd): упрощение с допуском tol (в пикселях маски). */
export function tracePath(mask: Uint8Array, w: number, h: number, scale: number, tol: number): string {
  return toPath(maskLoops(mask, w, h).map((l) => simplifyLoop(dropCollinear(l), tol)), scale)
}
