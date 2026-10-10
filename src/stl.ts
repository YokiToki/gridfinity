import type { Manifold } from 'manifold-3d'

export function toBinaryStl(m: Manifold): Blob {
  const mesh = m.getMesh()
  const n = mesh.triVerts.length / 3
  const buf = new DataView(new ArrayBuffer(84 + n * 50))
  buf.setUint32(80, n, true)
  const v = (i: number) => [0, 1, 2].map((k) => mesh.vertProperties[i * mesh.numProp + k])
  for (let t = 0; t < n; t++) {
    const [a, b, c] = [0, 1, 2].map((k) => v(mesh.triVerts[t * 3 + k]))
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const nr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const len = Math.hypot(nr[0], nr[1], nr[2]) || 1
    let o = 84 + t * 50
    for (const x of nr) { buf.setFloat32(o, x / len, true); o += 4 }
    for (const p of [a, b, c]) for (const x of p) { buf.setFloat32(o, x, true); o += 4 }
  }
  return new Blob([buf.buffer], { type: 'model/stl' })
}
