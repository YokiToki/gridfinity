import type { Manifold } from 'manifold-3d'

/** Сетка модели в виде, который можно передать между потоками. Все длины в мм. */
export interface MeshData {
  vertProperties: Float32Array
  triVerts: Uint32Array
  numProp: number
  min: [number, number, number]
  max: [number, number, number]
  volume: number
}

export function meshOf(m: Manifold): MeshData {
  const mesh = m.getMesh()
  const bb = m.boundingBox()
  return {
    vertProperties: mesh.vertProperties,
    triVerts: mesh.triVerts,
    numProp: mesh.numProp,
    min: [bb.min[0], bb.min[1], bb.min[2]],
    max: [bb.max[0], bb.max[1], bb.max[2]],
    volume: m.volume(),
  }
}

export const transferables = (m: MeshData): ArrayBuffer[] => [m.vertProperties.buffer as ArrayBuffer, m.triVerts.buffer as ArrayBuffer]
