import type { Manifold } from 'manifold-3d'
import { getWasm } from './wasm'
import { socketPocket } from './profiles'
import { DEFAULT_PITCH, FLOOR, SOCKET_HEIGHT } from './spec'
import { footprintFromCells, cellCenters } from './footprint'
import { allPositions, cellWindows, defaultFasteners, fastenerCuts, needsFloor, type FastenerConfig } from './fasteners'

export interface BaseplateParams {
  unit: number // размер ячейки, мм
  x: number
  y: number
  customSize: boolean
  sizeX: number // мм, если customSize
  sizeY: number
  fasteners: FastenerConfig
  showPlate: boolean // стол принтера в превью
  plateX: number
  plateY: number
}

export const defaultParams: BaseplateParams = {
  unit: DEFAULT_PITCH, x: 2, y: 2, customSize: false, sizeX: 84, sizeY: 84, fasteners: defaultFasteners,
  showPlate: false, plateX: 256, plateY: 256,
}

/** Габарит плиты: при своём размере не меньше блока ячеек. */
export function baseplateFootprint(p: BaseplateParams) {
  const sizeX = p.customSize ? Math.max(p.sizeX, p.x * p.unit) : p.x * p.unit
  const sizeY = p.customSize ? Math.max(p.sizeY, p.y * p.unit) : p.y * p.unit
  return footprintFromCells(p.x, p.y, p.unit, sizeX, sizeY)
}

export async function buildBaseplate(p: BaseplateParams, wasmUrl?: string): Promise<Manifold> {
  const w = await getWasm(wasmUrl)
  const { Manifold } = w
  const fp = baseplateFootprint(p)
  const { sizeX, sizeY } = fp
  // под магниты/винты нужен пол под гнёздами
  const floor = needsFloor(allPositions(p.fasteners, fp)) ? FLOOR : 0
  const height = SOCKET_HEIGHT + floor

  const plate = Manifold.cube([sizeX, sizeY, height]).translate([-sizeX / 2, -sizeY / 2, 0])
  const cell = socketPocket(w, p.unit).translate([0, 0, floor])
  const cuts: Manifold[] = cellCenters(fp).map((c) => cell.translate([c.x, c.y, 0]))
  // под гнёздами ячейки открыты насквозь, материал остаётся только в «ушах» вокруг отверстий
  cuts.push(...cellWindows(w, p.fasteners, fp, floor))
  cuts.push(...fastenerCuts(w, p.fasteners, fp, floor).cuts)
  return plate.subtract(Manifold.union(cuts))
}
