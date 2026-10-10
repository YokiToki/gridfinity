import { describeMesh, defaultOrientation, parseStl, repairMesh, StlError, type IndexedMesh, type MeshInfo } from '../../geometry/stl-import'

export interface ImportedStl {
  mesh: IndexedMesh
  info: MeshInfo
  /** Сетка не замкнута: тело для настоящего 3D может не получиться. */
  open: boolean
  sizeBytes: number
}

export const LARGE_STL_BYTES = 8 * 1024 * 1024

/** Читает STL локально: разбор, сварка, проверка объёма. Ошибки — StlError с кодом invalid / empty / noVolume. */
export function importStl(buffer: ArrayBuffer): ImportedStl {
  const soup = parseStl(buffer)
  const { mesh, report } = repairMesh(soup)
  if (mesh.triVerts.length === 0 || report.volume < 1e-6) throw new StlError('noVolume', 'The mesh has no volume')
  return { mesh, info: describeMesh(mesh.vertProperties, 'mm', defaultOrientation), open: !report.closed, sizeBytes: buffer.byteLength }
}
