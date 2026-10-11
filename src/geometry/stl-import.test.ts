import { beforeAll, describe, expect, it } from 'vitest'
import { getWasm } from './wasm'
import { asciiStl, binaryStl, boxSoup } from './stl-fixtures'
import { convexHull, defaultOrientation, describeMesh, flatFaces, orientVertices, parseStl, repairMesh, sliceLoops, StlError, toManifold, type IndexedMesh, type TriSoup } from './stl-import'

const code = (f: () => unknown) => { try { f() } catch (e) { return e instanceof StlError ? e.code : 'other' } return 'none' }

describe('parseStl', () => {
  const cube = boxSoup(10, 10, 10)
  it('бинарный и ASCII дают одинаковые треугольники', () => {
    const b = parseStl(binaryStl(cube)), a = parseStl(asciiStl(cube))
    expect(b.positions.length).toBe(12 * 9)
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions))
  })
  it('бинарный файл с заголовком «solid» читается как бинарный', () => {
    expect(parseStl(binaryStl(cube, 'solid exported by CAD')).positions.length).toBe(12 * 9)
  })
  it('ASCII с экспонентой и отрицательными числами', () => {
    const txt = 'solid x\nfacet normal 0 0 1\n outer loop\n vertex -1.5e0 0 0\n vertex 1E1 0 0\n vertex 0 +2 0\n endloop\nendfacet\nendsolid x'
    expect(Array.from(parseStl(new TextEncoder().encode(txt).buffer as ArrayBuffer).positions)).toEqual([-1.5, 0, 0, 10, 0, 0, 0, 2, 0])
  })
  it('ошибки: мусор, текст без граней, пустой файл, нечисловые значения, обрезанный ASCII', () => {
    expect(code(() => parseStl(new Uint8Array(200).fill(7).buffer as ArrayBuffer))).toBe('invalid')
    expect(code(() => parseStl(new TextEncoder().encode('hello world').buffer as ArrayBuffer))).toBe('invalid')
    expect(code(() => parseStl(binaryStl({ positions: new Float32Array(0) })))).toBe('empty')
    const bad = binaryStl(cube); new DataView(bad).setFloat32(84 + 12, NaN, true)
    expect(code(() => parseStl(bad))).toBe('invalid')
    expect(code(() => parseStl(new TextEncoder().encode('solid x\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nendloop endfacet').buffer as ArrayBuffer))).toBe('invalid')
    expect(code(() => parseStl(new ArrayBuffer(10)))).toBe('invalid')
  })
})

describe('repairMesh и Manifold', () => {
  it('куб с дублирующимися вершинами сваривается: 8 вершин, 12 треугольников, объём 1000', async () => {
    const { mesh, report } = repairMesh(boxSoup(10, 10, 10))
    expect(mesh.vertProperties.length / 3).toBe(8)
    expect(mesh.triVerts.length / 3).toBe(12)
    expect(report).toMatchObject({ welded: 28, degenerate: 0, closed: true })
    const m = toManifold(await getWasm(), mesh)
    expect(m.status()).toBe('NoError')
    expect(m.volume()).toBeCloseTo(1000, 3)
  })
  it('несогласованная ориентация части граней исправляется', async () => {
    const soup = boxSoup(10, 20, 30)
    for (const t of [1, 4, 7]) { for (let k = 0; k < 3; k++) { const a = soup.positions[t * 9 + 3 + k]; soup.positions[t * 9 + 3 + k] = soup.positions[t * 9 + 6 + k]; soup.positions[t * 9 + 6 + k] = a } }
    const { mesh, report } = repairMesh(soup)
    expect(report.flipped).toBeGreaterThan(0)
    expect(toManifold(await getWasm(), mesh).volume()).toBeCloseTo(6000, 2)
  })
  it('вывернутая наизнанку сетка (отрицательный объём) переворачивается', async () => {
    const soup = boxSoup(5, 5, 5)
    for (let t = 0; t < 12; t++) for (let k = 0; k < 3; k++) { const a = soup.positions[t * 9 + 3 + k]; soup.positions[t * 9 + 3 + k] = soup.positions[t * 9 + 6 + k]; soup.positions[t * 9 + 6 + k] = a }
    expect(toManifold(await getWasm(), repairMesh(soup).mesh).volume()).toBeCloseTo(125, 3)
  })
  it('вырожденные треугольники отбрасываются', () => {
    const soup = boxSoup(10, 10, 10)
    const extra = new Float32Array(soup.positions.length + 9)
    extra.set(soup.positions); extra.set([1, 1, 1, 1, 1, 1, 2, 2, 2], soup.positions.length)
    const { mesh, report } = repairMesh({ positions: extra })
    expect(report.degenerate).toBe(1)
    expect(mesh.triVerts.length / 3).toBe(12)
  })
  it('открытая сетка (нет грани) не становится телом: noVolume', async () => {
    const soup = boxSoup(10, 10, 10)
    const open = { positions: soup.positions.slice(0, 11 * 9) }
    const { mesh, report } = repairMesh(open)
    expect(report.closed).toBe(false)
    expect(code(() => toManifold(getWasmSync(), mesh))).toBe('noVolume')
  })
})

let wasmSync: Awaited<ReturnType<typeof getWasm>>
const getWasmSync = () => wasmSync
beforeAll(async () => { wasmSync = await getWasm() })

describe('ориентация', () => {
  const mesh = (dx: number, dy: number, dz: number): IndexedMesh => repairMesh(boxSoup(dx, dy, dz)).mesh
  it('единицы: куб 1 дюйм = 25.4 мм', () => {
    const info = describeMesh(mesh(1, 1, 1).vertProperties, 'in', defaultOrientation)
    info.size.forEach((s) => expect(s).toBeCloseTo(25.4, 4))
    expect(describeMesh(mesh(1, 1, 1).vertProperties, 'mm', defaultOrientation).size[0]).toBeCloseTo(1, 6)
  })
  it('центр габарита в XY и нижняя точка на z = 0', () => {
    const v = orientVertices(mesh(10, 20, 30).vertProperties, 'mm', defaultOrientation)
    const xs = Array.from({ length: v.length / 3 }, (_, i) => v[i * 3]), zs = Array.from({ length: v.length / 3 }, (_, i) => v[i * 3 + 2])
    expect(Math.min(...xs)).toBeCloseTo(-5, 6)
    expect(Math.max(...xs)).toBeCloseTo(5, 6)
    expect(Math.min(...zs)).toBeCloseTo(0, 6)
  })
  it('повороты на 90°: вокруг Z меняют X и Y, вокруг X — Y и Z', () => {
    const m = mesh(10, 20, 30)
    expect(describeMesh(m.vertProperties, 'mm', { ...defaultOrientation, rz: 1 }).size.map((s) => +s.toFixed(4))).toEqual([20, 10, 30])
    expect(describeMesh(m.vertProperties, 'mm', { ...defaultOrientation, rx: 1 }).size.map((s) => +s.toFixed(4))).toEqual([10, 30, 20])
  })
  it('flatFaces: самые большие грани первыми, площадь и нормаль', () => {
    const faces = flatFaces(mesh(10, 20, 30))
    expect(faces).toHaveLength(6)
    expect(faces[0].area).toBeCloseTo(600, 3) // 20 × 30
    expect(Math.abs(faces[0].normal[0])).toBeCloseTo(1, 6)
    expect(faces[5].area).toBeCloseTo(200, 3) // 10 × 20
  })
  it('грань на дно: нормаль +X → брус ложится на грань 20 × 30, высота 10', () => {
    const m = mesh(10, 20, 30)
    const face = flatFaces(m).find((f) => f.normal[0] > 0.9)!
    const info = describeMesh(m.vertProperties, 'mm', { ...defaultOrientation, faceDown: face.normal })
    expect(info.size[2]).toBeCloseTo(10, 4)
    expect(info.size[0] * info.size[1]).toBeCloseTo(600, 3)
    const v = orientVertices(m.vertProperties, 'mm', { ...defaultOrientation, faceDown: face.normal })
    expect(Math.min(...Array.from({ length: v.length / 3 }, (_, i) => v[i * 3 + 2]))).toBeCloseTo(0, 5)
  })
  it('грань, смотрящая вверх, переворачивает деталь', () => {
    const m = mesh(10, 20, 30)
    const top = flatFaces(m).find((f) => f.normal[2] > 0.9)!
    expect(describeMesh(m.vertProperties, 'mm', { ...defaultOrientation, faceDown: top.normal }).size[2]).toBeCloseTo(30, 4)
  })
  it('сохраняется объём после ориентации', async () => {
    const w = await getWasm()
    const m = mesh(10, 20, 30)
    const face = flatFaces(m)[2]
    const v = orientVertices(m.vertProperties, 'mm', { ...defaultOrientation, faceDown: face.normal, ry: 1 })
    expect(toManifold(w, { vertProperties: v, triVerts: m.triVerts }).volume()).toBeCloseTo(6000, 1)
  })
})

describe('convexHull', () => {
  it('квадрат с внутренними точками: четыре вершины', () => {
    const pts: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10], [5, 5], [3, 4], [10, 5]]
    expect(convexHull(pts)).toHaveLength(4)
  })
  it('прореживание до maxPoints и вырожденные случаи', () => {
    const circle: [number, number][] = Array.from({ length: 400 }, (_, i) => [Math.cos(i / 63.7), Math.sin(i / 63.7)])
    expect(convexHull(circle, 32).length).toBe(32)
    expect(convexHull([[0, 0], [1, 1]])).toHaveLength(2)
    expect(convexHull([])).toEqual([])
  })
})

describe('sliceLoops', () => {
  const box = repairMesh(boxSoup(10, 6, 4)).mesh
  it('замкнутый брус даёт один прямоугольник 10 × 6', () => {
    const loops = sliceLoops(box.vertProperties, box.triVerts, 2)
    expect(loops).toHaveLength(1)
    const xs = loops[0].map((p) => p[0]), ys = loops[0].map((p) => p[1])
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([0, 10, 0, 6])
  })
  it('без одной боковой грани цепочка остаётся и замыкается заливкой', () => {
    const open = { vertProperties: box.vertProperties, triVerts: box.triVerts.slice(0, box.triVerts.length - 6) }
    const loops = sliceLoops(open.vertProperties, open.triVerts, 2)
    expect(loops.length).toBeGreaterThan(0)
    expect(loops.flat().length).toBeGreaterThanOrEqual(3)
  })
  it('плоскость выше детали не даёт контуров', () => {
    expect(sliceLoops(box.vertProperties, box.triVerts, 5)).toEqual([])
  })
})
