import type { TriSoup } from './stl-import'

/** Треугольный «суп» прямоугольного бруса dx × dy × dz с наружными нормалями. */
export function boxSoup(dx: number, dy: number, dz: number): TriSoup {
  const v = [[0, 0, 0], [dx, 0, 0], [dx, dy, 0], [0, dy, 0], [0, 0, dz], [dx, 0, dz], [dx, dy, dz], [0, dy, dz]]
  const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]]
  return { positions: Float32Array.from(f.flatMap((t) => t.flatMap((i) => v[i]))) }
}

export function binaryStl(soup: TriSoup, header = 'binary test'): ArrayBuffer {
  const n = soup.positions.length / 9
  const buf = new ArrayBuffer(84 + 50 * n)
  const view = new DataView(buf)
  for (let i = 0; i < header.length; i++) view.setUint8(i, header.charCodeAt(i))
  view.setUint32(80, n, true)
  for (let t = 0; t < n; t++) for (let k = 0; k < 9; k++) view.setFloat32(84 + t * 50 + 12 + k * 4, soup.positions[t * 9 + k], true)
  return buf
}

export function asciiStl(soup: TriSoup): ArrayBuffer {
  let s = 'solid test\n'
  for (let t = 0; t < soup.positions.length / 9; t++) {
    s += 'facet normal 0 0 0\n outer loop\n'
    for (let k = 0; k < 3; k++) s += `  vertex ${soup.positions[t * 9 + k * 3]} ${soup.positions[t * 9 + k * 3 + 1]} ${soup.positions[t * 9 + k * 3 + 2]}\n`
    s += ' endloop\nendfacet\n'
  }
  return new TextEncoder().encode(s + 'endsolid test\n').buffer as ArrayBuffer
}


/** Деталь «Т» 60 × 60 × h: невыпуклый силуэт (перекладина 60 × 20 и ножка 20 × 40), замкнутая сетка. */
export function tSoup(h = 10): TriSoup {
  const P: [number, number][] = [[0, 0], [60, 0], [60, 20], [40, 20], [40, 60], [20, 60], [20, 20], [0, 20]]
  const caps = [[0, 1, 3], [0, 3, 6], [0, 6, 7], [1, 2, 3], [3, 4, 5], [3, 5, 6]]
  const out: number[] = []
  const tri = (a: number[], b: number[], c: number[]) => out.push(...a, ...b, ...c)
  for (const [i, j, k] of caps) {
    tri([...P[i], h], [...P[j], h], [...P[k], h]) // верх
    tri([...P[i], 0], [...P[k], 0], [...P[j], 0]) // низ (обратный порядок)
  }
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length]
    tri([...a, 0], [...b, 0], [...b, h])
    tri([...a, 0], [...b, h], [...a, h])
  }
  return { positions: Float32Array.from(out) }
}
