import { resolveAxis, type Align } from './sizing'

export interface Point { x: number; y: number }

/**
 * Габарит модели и блок целых ячеек внутри него. Начало координат — центр габарита.
 * offsetX/offsetY — смещение блока ячеек от начала габарита (из resolveAxis).
 */
export interface Footprint {
  pitch: number
  nx: number
  ny: number
  sizeX: number
  sizeY: number
  offsetX: number
  offsetY: number
}

/** Габарит из размеров в мм: ячейки и остаток считаются по оси через resolveAxis. */
export function footprintFromSize(sizeX: number, sizeY: number, pitch: number, alignX: Align = 'center', alignY: Align = 'center'): Footprint {
  const x = resolveAxis(sizeX, pitch, alignX)
  const y = resolveAxis(sizeY, pitch, alignY)
  return { pitch, nx: x.cells, ny: y.cells, sizeX, sizeY, offsetX: x.offset, offsetY: y.offset }
}

/** Габарит с заданным числом ячеек; блок ячеек по центру габарита. */
export function footprintFromCells(nx: number, ny: number, pitch: number, sizeX = nx * pitch, sizeY = ny * pitch): Footprint {
  return { pitch, nx, ny, sizeX, sizeY, offsetX: (sizeX - nx * pitch) / 2, offsetY: (sizeY - ny * pitch) / 2 }
}

/** Центр ячейки (i, j) в координатах модели. */
export function cellCenter(fp: Footprint, i: number, j: number): Point {
  return {
    x: -fp.sizeX / 2 + fp.offsetX + (i + 0.5) * fp.pitch,
    y: -fp.sizeY / 2 + fp.offsetY + (j + 0.5) * fp.pitch,
  }
}

export function cellCenters(fp: Footprint): Point[] {
  const out: Point[] = []
  for (let i = 0; i < fp.nx; i++) for (let j = 0; j < fp.ny; j++) out.push(cellCenter(fp, i, j))
  return out
}
