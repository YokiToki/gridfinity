import type { Manifold } from 'manifold-3d'
import { getWasm } from './wasm'
import { socketPocket } from './profiles'
import { DEFAULT_PITCH, FLOOR, HOLE_OFFSET, MAGNET_D, MAGNET_H, SCREW_D, SOCKET_HEIGHT } from './spec'

export interface BaseplateParams {
  unit: number // размер ячейки, мм
  x: number
  y: number
  customSize: boolean
  sizeX: number // мм, если customSize
  sizeY: number
  magnets: boolean
  screws: boolean
  showPlate: boolean // стол принтера в превью
  plateX: number
  plateY: number
}

export const defaultParams: BaseplateParams = {
  unit: DEFAULT_PITCH, x: 2, y: 2, customSize: false, sizeX: 84, sizeY: 84, magnets: false, screws: false,
  showPlate: false, plateX: 256, plateY: 256,
}

export async function buildBaseplate(p: BaseplateParams, wasmUrl?: string): Promise<Manifold> {
  const w = await getWasm(wasmUrl)
  const { Manifold } = w
  const nx = p.x, ny = p.y
  const totalX = nx * p.unit, totalY = ny * p.unit
  const sizeX = p.customSize ? Math.max(p.sizeX, totalX) : totalX
  const sizeY = p.customSize ? Math.max(p.sizeY, totalY) : totalY
  // под магниты/винты нужен пол под гнёздами
  const floor = p.magnets || p.screws ? FLOOR : 0
  const height = SOCKET_HEIGHT + floor

  const plate = Manifold.cube([sizeX, sizeY, height]).translate([-sizeX / 2, -sizeY / 2, 0])
  const cell = socketPocket(w, p.unit).translate([0, 0, floor])
  const cuts: Manifold[] = []
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const cx = (i - (nx - 1) / 2) * p.unit
      const cy = (j - (ny - 1) / 2) * p.unit
      cuts.push(cell.translate([cx, cy, 0]))
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          const hx = cx + sx * HOLE_OFFSET, hy = cy + sy * HOLE_OFFSET
          if (p.screws) cuts.push(Manifold.cylinder(floor + 2, SCREW_D / 2, SCREW_D / 2, 24).translate([hx, hy, -1]))
          if (p.magnets) cuts.push(Manifold.cylinder(MAGNET_H + 1, MAGNET_D / 2, MAGNET_D / 2, 32).translate([hx, hy, floor - MAGNET_H]))
        }
      }
    }
  }
  return plate.subtract(Manifold.union(cuts))
}
