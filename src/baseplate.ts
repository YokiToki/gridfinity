import Module from 'manifold-3d'
import type { Manifold, ManifoldToplevel } from 'manifold-3d'

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
  unit: 42, x: 2, y: 2, customSize: false, sizeX: 84, sizeY: 84, magnets: false, screws: false,
  showPlate: false, plateX: 256, plateY: 256,
}

// Профиль гнезда базовой плиты (Gridfinity spec): снизу вверх
const H = 4.65
const CHAMFER_LOW = 0.7
const WALL = 1.8
const CHAMFER_UP = 2.15
const CLEARANCE = 0.25 // зазор на сторону относительно 42 мм ячейки
const R_TOP = 4.0
const MAGNET_D = 6.5
const MAGNET_H = 2.4
const SCREW_D = 3.0
const HOLE_OFFSET = 13
const FLOOR = 4.0 // толщина пола при магнитах/винтах // от центра ячейки

let wasmPromise: Promise<ManifoldToplevel> | undefined
export function getWasm(wasmUrl?: string): Promise<ManifoldToplevel> {
  wasmPromise ??= Module(wasmUrl ? { locateFile: () => wasmUrl } : undefined).then((w) => {
    w.setup()
    return w
  })
  return wasmPromise
}

function slab(w: ManifoldToplevel, width: number, r: number, z: number): Manifold {
  const { CrossSection, Manifold } = w
  const inner = Math.max(width - 2 * r, 0.01)
  const rounded = CrossSection.square([inner, inner], true).offset(r, 'Round', 2, 24)
  return Manifold.extrude(rounded, 0.001).translate([0, 0, z])
}

/** Гнездо одной ячейки с центром в (0,0), основание z=0, верх z=H. */
function pocket(w: ManifoldToplevel, unit: number): Manifold {
  const top = unit - 2 * CLEARANCE + 0.5 // ширина на верхней кромке
  const mid = top - 2 * CHAMFER_UP
  const low = mid - 2 * CHAMFER_LOW
  const rTop = R_TOP
  const rMid = Math.max(rTop - CHAMFER_UP, 0.3)
  const rLow = Math.max(rMid - CHAMFER_LOW, 0.3)
  const s = (width: number, r: number, z: number) => slab(w, width, r, z)
  const lower = w.Manifold.hull([s(low, rLow, 0), s(mid, rMid, CHAMFER_LOW)])
  const wall = w.Manifold.hull([s(mid, rMid, CHAMFER_LOW), s(mid, rMid, CHAMFER_LOW + WALL)])
  const upper = w.Manifold.hull([s(mid, rMid, CHAMFER_LOW + WALL), s(top, rTop, H)])
  return w.Manifold.union([lower, wall, upper])
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

  const plate = Manifold.cube([sizeX, sizeY, H + floor]).translate([-sizeX / 2, -sizeY / 2, 0])
  const cell = pocket(w, p.unit).translate([0, 0, floor])
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
