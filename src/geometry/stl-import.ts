import type { Manifold, ManifoldToplevel } from 'manifold-3d'

/** Разбор и подготовка STL: бинарный и ASCII, сварка вершин, ориентация, плоские грани. Всё в мм после масштаба. */

export class StlError extends Error {
  constructor(public code: 'empty' | 'invalid' | 'noVolume', message: string) { super(message) }
}

/** Треугольный «суп»: по 9 чисел на треугольник (3 вершины × xyz). */
export interface TriSoup { positions: Float32Array }

/** Сетка с общими вершинами для Manifold. */
export interface IndexedMesh { vertProperties: Float32Array; triVerts: Uint32Array }

const dec = (b: ArrayBuffer) => new TextDecoder('utf-8').decode(b)

function parseBinary(buf: ArrayBuffer): TriSoup {
  const n = new DataView(buf).getUint32(80, true)
  const view = new DataView(buf)
  const out = new Float32Array(n * 9)
  for (let t = 0; t < n; t++) for (let k = 0; k < 9; k++) out[t * 9 + k] = view.getFloat32(84 + t * 50 + 12 + k * 4, true)
  return { positions: out }
}

function parseAscii(text: string): TriSoup {
  const nums: number[] = []
  const re = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g
  for (let m = re.exec(text); m; m = re.exec(text)) nums.push(Number(m[1]), Number(m[2]), Number(m[3]))
  if (nums.length % 9 !== 0) throw new StlError('invalid', 'ASCII STL: vertex count is not a multiple of 3')
  return { positions: Float32Array.from(nums) }
}

/** Бинарный STL определяется по длине файла (заголовок «solid» бывает и у бинарных), иначе читаем как ASCII. */
export function parseStl(buf: ArrayBuffer): TriSoup {
  let soup: TriSoup | null = null
  if (buf.byteLength >= 84 && buf.byteLength === 84 + 50 * new DataView(buf).getUint32(80, true)) soup = parseBinary(buf)
  else {
    const text = dec(buf)
    if (/\bfacet\b/.test(text) && /\bvertex\b/.test(text)) soup = parseAscii(text)
  }
  if (!soup) throw new StlError('invalid', 'Not an STL file')
  if (soup.positions.length === 0) throw new StlError('empty', 'The STL has no triangles')
  for (let i = 0; i < soup.positions.length; i++) if (!Number.isFinite(soup.positions[i])) throw new StlError('invalid', 'STL contains invalid numbers')
  return soup
}

export interface RepairReport { welded: number; degenerate: number; flipped: number; closed: boolean; /** Объём по модулю, мм³ (в единицах файла). */ volume: number }

/** Сварка совпадающих вершин, удаление вырожденных треугольников, согласование ориентации, при отрицательном объёме — переворот. */
export function repairMesh(soup: TriSoup): { mesh: IndexedMesh; report: RepairReport } {
  const p = soup.positions
  let min = Infinity, max = -Infinity
  for (let i = 0; i < p.length; i++) { min = Math.min(min, p[i]); max = Math.max(max, p[i]) }
  const tol = Math.max(max - min, 1) * 1e-6
  const key = (x: number, y: number, z: number) => `${Math.round(x / tol)},${Math.round(y / tol)},${Math.round(z / tol)}`
  const index = new Map<string, number>()
  const verts: number[] = []
  const tris: number[] = []
  let degenerate = 0
  const vid = (x: number, y: number, z: number) => {
    const k = key(x, y, z)
    let i = index.get(k)
    if (i === undefined) { i = verts.length / 3; index.set(k, i); verts.push(x, y, z) }
    return i
  }
  const total = p.length / 3
  for (let t = 0; t < p.length / 9; t++) {
    const a = vid(p[t * 9], p[t * 9 + 1], p[t * 9 + 2]), b = vid(p[t * 9 + 3], p[t * 9 + 4], p[t * 9 + 5]), c = vid(p[t * 9 + 6], p[t * 9 + 7], p[t * 9 + 8])
    if (a === b || b === c || a === c) { degenerate++; continue }
    tris.push(a, b, c)
  }
  const welded = total - verts.length / 3
  const nT = tris.length / 3
  // согласование ориентации: обход по общим рёбрам
  const edgeTris = new Map<string, number[]>()
  const ek = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`)
  for (let t = 0; t < nT; t++) for (let e = 0; e < 3; e++) {
    const k = ek(tris[t * 3 + e], tris[t * 3 + ((e + 1) % 3)])
    const l = edgeTris.get(k)
    if (l) l.push(t); else edgeTris.set(k, [t])
  }
  const flip = new Uint8Array(nT)
  const seen = new Uint8Array(nT)
  const dirOf = (t: number, a: number, b: number) => {
    for (let e = 0; e < 3; e++) {
      const x = tris[t * 3 + e], y = tris[t * 3 + ((e + 1) % 3)]
      if (x === a && y === b) return flip[t] ? -1 : 1
      if (x === b && y === a) return flip[t] ? 1 : -1
    }
    return 0
  }
  let flipped = 0
  for (let s = 0; s < nT; s++) {
    if (seen[s]) continue
    seen[s] = 1
    const stack = [s]
    while (stack.length) {
      const t = stack.pop()!
      for (let e = 0; e < 3; e++) {
        const a = tris[t * 3 + e], b = tris[t * 3 + ((e + 1) % 3)]
        const list = edgeTris.get(ek(a, b))!
        if (list.length !== 2) continue
        const u = list[0] === t ? list[1] : list[0]
        if (seen[u]) continue
        // у соседа общее ребро должно идти в обратную сторону
        if (dirOf(t, a, b) === dirOf(u, a, b)) { flip[u] = 1; flipped++ }
        seen[u] = 1
        stack.push(u)
      }
    }
  }
  for (let t = 0; t < nT; t++) if (flip[t]) { const b = tris[t * 3 + 1]; tris[t * 3 + 1] = tris[t * 3 + 2]; tris[t * 3 + 2] = b }
  // знак объёма
  let vol = 0
  for (let t = 0; t < nT; t++) {
    const a = tris[t * 3] * 3, b = tris[t * 3 + 1] * 3, c = tris[t * 3 + 2] * 3
    vol += (verts[a] * (verts[b + 1] * verts[c + 2] - verts[b + 2] * verts[c + 1]) - verts[a + 1] * (verts[b] * verts[c + 2] - verts[b + 2] * verts[c]) + verts[a + 2] * (verts[b] * verts[c + 1] - verts[b + 1] * verts[c])) / 6
  }
  if (vol < 0) for (let t = 0; t < nT; t++) { const b = tris[t * 3 + 1]; tris[t * 3 + 1] = tris[t * 3 + 2]; tris[t * 3 + 2] = b }
  const closed = [...edgeTris.values()].every((l) => l.length === 2)
  return { mesh: { vertProperties: Float32Array.from(verts), triVerts: Uint32Array.from(tris) }, report: { welded, degenerate, flipped: vol < 0 ? nT - flipped : flipped, closed, volume: Math.abs(vol) } }
}

/** Manifold из сетки: ошибка noVolume, если сетка не образует тела. */
export function toManifold(w: ManifoldToplevel, mesh: IndexedMesh): Manifold {
  let m: Manifold
  try {
    m = new w.Manifold(new w.Mesh({ numProp: 3, vertProperties: mesh.vertProperties, triVerts: mesh.triVerts }))
  } catch (e) {
    throw new StlError('noVolume', `The mesh is not a closed solid (${e instanceof Error ? e.message : String(e)})`)
  }
  if (m.status() !== 'NoError' || m.isEmpty() || m.volume() <= 0) throw new StlError('noVolume', `The mesh is not a closed solid (${m.status()})`)
  return m
}

// ---------- ориентация ----------

export type Vec3 = [number, number, number]

/** Единицы файла, грань, лежащая на дне кармана (её нормаль → −Z), и повороты вокруг осей кратно 90°. */
export interface Orientation { faceDown: Vec3 | null; rx: number; ry: number; rz: number }
export const defaultOrientation: Orientation = { faceDown: null, rx: 0, ry: 0, rz: 0 }
export const INCH = 25.4

type Mat = [number, number, number, number, number, number, number, number, number]
const mul = (a: Mat, b: Mat): Mat => {
  const r = new Array(9).fill(0) as Mat
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j]
  return r
}
const rotX = (deg: number): Mat => { const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180); return [1, 0, 0, 0, c, -s, 0, s, c] }
const rotY = (deg: number): Mat => { const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180); return [c, 0, s, 0, 1, 0, -s, 0, c] }
const rotZ = (deg: number): Mat => { const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180); return [c, -s, 0, s, c, 0, 0, 0, 1] }
const I: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1]

/** Поворот, переводящий единичную нормаль n в −Z (формула Родрига). */
export function rotationToDown(n: Vec3): Mat {
  const len = Math.hypot(...n) || 1
  const v: Vec3 = [n[0] / len, n[1] / len, n[2] / len]
  const t: Vec3 = [0, 0, -1]
  const c = v[0] * t[0] + v[1] * t[1] + v[2] * t[2]
  if (c > 1 - 1e-9) return I
  if (c < -1 + 1e-9) return rotX(180) // нормаль смотрит вверх: переворачиваем
  const ax: Vec3 = [v[1] * t[2] - v[2] * t[1], v[2] * t[0] - v[0] * t[2], v[0] * t[1] - v[1] * t[0]]
  const s2 = ax[0] ** 2 + ax[1] ** 2 + ax[2] ** 2
  const k = (1 - c) / s2
  const [x, y, z] = ax
  return [1 - k * (y * y + z * z), -z + k * x * y, y + k * x * z, z + k * x * y, 1 - k * (x * x + z * z), -x + k * y * z, -y + k * x * z, x + k * y * z, 1 - k * (x * x + y * y)]
}

const orientMat = (o: Orientation): Mat => {
  let m = o.faceDown ? rotationToDown(o.faceDown) : I
  m = mul(rotX(o.rx * 90), m)
  m = mul(rotY(o.ry * 90), m)
  m = mul(rotZ(o.rz * 90), m)
  return m
}

/** Вершины после масштаба и поворота; затем XY-центр габарита в 0 и нижняя точка на z = 0. */
export function orientVertices(vertProperties: Float32Array, unit: 'mm' | 'in', o: Orientation): Float32Array {
  const s = unit === 'in' ? INCH : 1
  const m = orientMat(o)
  const out = new Float32Array(vertProperties.length)
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < vertProperties.length; i += 3) {
    const x = vertProperties[i] * s, y = vertProperties[i + 1] * s, z = vertProperties[i + 2] * s
    const p = [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z]
    for (let a = 0; a < 3; a++) { out[i + a] = p[a]; mn[a] = Math.min(mn[a], p[a]); mx[a] = Math.max(mx[a], p[a]) }
  }
  const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2
  for (let i = 0; i < out.length; i += 3) { out[i] -= cx; out[i + 1] -= cy; out[i + 2] -= mn[2] }
  return out
}

export interface MeshInfo {
  /** Размер после ориентации, мм. */
  size: Vec3
  /** Выпуклая оболочка силуэта в плане (центр габарита в 0): для превью и выравнивания. */
  hull: [number, number][]
}

/** Выпуклая оболочка точек (алгоритм Эндрю), не больше maxPoints точек (равномерное прореживание). */
export function convexHull(points: [number, number][], maxPoints = 96): [number, number][] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const uniq = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1])
  if (uniq.length < 3) return uniq
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = []
  for (const p of uniq) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p) }
  const upper: [number, number][] = []
  for (const p of [...uniq].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p) }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)]
  if (hull.length <= maxPoints) return hull
  const step = hull.length / maxPoints
  return Array.from({ length: maxPoints }, (_, i) => hull[Math.floor(i * step)])
}

export function describeMesh(vertProperties: Float32Array, unit: 'mm' | 'in', o: Orientation): MeshInfo {
  const v = orientVertices(vertProperties, unit, o)
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  const pts: [number, number][] = []
  for (let i = 0; i < v.length; i += 3) { for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], v[i + a]); mx[a] = Math.max(mx[a], v[i + a]) } pts.push([v[i], v[i + 1]]) }
  return { size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], hull: convexHull(pts) }
}

export interface FlatFace { normal: Vec3; area: number }

/** Самые большие плоские грани (кластеры одинаковых нормалей по площади): кандидаты «положить на дно». */
export function flatFaces(mesh: IndexedMesh, count = 6): FlatFace[] {
  const v = mesh.vertProperties, t = mesh.triVerts
  const groups = new Map<string, { n: Vec3; area: number }>()
  for (let i = 0; i < t.length; i += 3) {
    const a = t[i] * 3, b = t[i + 1] * 3, c = t[i + 2] * 3
    const u = [v[b] - v[a], v[b + 1] - v[a + 1], v[b + 2] - v[a + 2]], w = [v[c] - v[a], v[c + 1] - v[a + 1], v[c + 2] - v[a + 2]]
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const len = Math.hypot(n[0], n[1], n[2])
    if (len < 1e-12) continue
    const nn: Vec3 = [n[0] / len, n[1] / len, n[2] / len]
    const key = nn.map((x) => Math.round(x * 50)).join(',')
    const g = groups.get(key)
    if (g) { g.area += len / 2; g.n = [g.n[0] + nn[0] * (len / 2), g.n[1] + nn[1] * (len / 2), g.n[2] + nn[2] * (len / 2)] }
    else groups.set(key, { n: [nn[0] * (len / 2), nn[1] * (len / 2), nn[2] * (len / 2)], area: len / 2 })
  }
  return [...groups.values()].sort((a, b) => b.area - a.area).slice(0, count).map((g) => {
    const l = Math.hypot(...g.n)
    return { normal: [g.n[0] / l, g.n[1] / l, g.n[2] / l] as Vec3, area: g.area }
  })
}
