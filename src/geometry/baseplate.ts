import type { Manifold } from 'manifold-3d'
import { getWasm } from './wasm'
import { socketPocket } from './profiles'
import { DEFAULT_PITCH, FLOOR, SOCKET_HEIGHT } from './spec'
import { cellCenters, type Footprint } from './footprint'
import { allPositions, cellWindows, defaultFasteners, fastenerCuts, needsFloor, type FastenerConfig } from './fasteners'
import { resolveAxis, type Align } from './sizing'

/** Размер по оси: в ячейках (дробных) или в мм, плюс выравнивание блока ячеек. */
export interface AxisSize { mode: 'units' | 'mm'; value: number; align: Align }

export interface BaseplateThickness {
  /** Высота профиля от низа гнезда до верха кромки. Не меньше стандартных 4.65 мм; выше — стенки окна идут вертикально. */
  baseHeight: number
  /** Сплошной пол под гнёздами; 0 — открытая рама. */
  floor: number
  /** Ширина внешнего бортика вокруг всей плиты. */
  rim: number
  /** На сколько отступ (плоская вставка вокруг ячеек) ниже кромки; 0 — вровень. */
  paddingDrop: number
  /** Радиус скругления внешних углов плиты. */
  cornerRadius: number
}

export const defaultThickness: BaseplateThickness = { baseHeight: SOCKET_HEIGHT, floor: 0, rim: 0, paddingDrop: 0, cornerRadius: 4 }

/** Всё, что влияет на геометрию модели. */
export interface BaseplateGeometry {
  pitch: number
  x: AxisSize
  y: AxisSize
  thickness: BaseplateThickness
  fasteners: FastenerConfig
}

export interface BaseplatePreview { showPlate: boolean; plateX: number; plateY: number }

export interface BaseplateParams extends BaseplateGeometry { preview: BaseplatePreview }

export const defaultPreview: BaseplatePreview = { showPlate: false, plateX: 256, plateY: 256 }

export const defaultParams: BaseplateParams = {
  pitch: DEFAULT_PITCH,
  x: { mode: 'units', value: 2, align: 'center' },
  y: { mode: 'units', value: 2, align: 'center' },
  thickness: defaultThickness,
  fasteners: defaultFasteners,
  preview: defaultPreview,
}

export const axisMm = (a: AxisSize, pitch: number) => (a.mode === 'units' ? a.value * pitch : a.value)

export interface BaseplateLayout {
  fp: Footprint
  sizeX: number
  sizeY: number
  /** Остаток после целых ячеек по осям (без бортика), мм. */
  padX: number
  padY: number
  /** Размер по оси меньше одной ячейки. */
  truncX: boolean
  truncY: boolean
}

/** Раскладка плиты: целые ячейки, остаток и выравнивание внутри бортика. */
export function baseplateLayout(g: BaseplateGeometry): BaseplateLayout {
  const sx = axisMm(g.x, g.pitch), sy = axisMm(g.y, g.pitch)
  const r = g.thickness.rim
  const ax = resolveAxis(sx - 2 * r, g.pitch, g.x.align)
  const ay = resolveAxis(sy - 2 * r, g.pitch, g.y.align)
  // габарит меньше ячейки: единственная ячейка по центру, края гнезда срезаются плитой
  const offX = r + (ax.truncated ? (sx - 2 * r - g.pitch) / 2 : ax.offset)
  const offY = r + (ay.truncated ? (sy - 2 * r - g.pitch) / 2 : ay.offset)
  const fp: Footprint = { pitch: g.pitch, nx: ax.cells, ny: ay.cells, sizeX: sx, sizeY: sy, offsetX: offX, offsetY: offY }
  return { fp, sizeX: sx, sizeY: sy, padX: ax.padding, padY: ay.padding, truncX: ax.truncated, truncY: ay.truncated }
}

export interface BaseplateHeights {
  /** Полная высота плиты. */
  total: number
  /** Высота низа гнезда (верх ушей). */
  pocketBottom: number
  hasHoles: boolean
}

/** Низ гнезда = (baseHeight − 4.65) + max(пол, уши). Без отверстий уши — 0. */
export function baseplateHeights(g: BaseplateGeometry, fp: Footprint = baseplateLayout(g).fp): BaseplateHeights {
  const hasHoles = needsFloor(allPositions(g.fasteners, fp))
  const pocketBottom = g.thickness.baseHeight - SOCKET_HEIGHT + Math.max(g.thickness.floor, hasHoles ? FLOOR : 0)
  return { total: pocketBottom + SOCKET_HEIGHT, pocketBottom, hasHoles }
}

export interface BaseplateError { field: string; key: string }
export const MAX_SIZE = 1000
export const MAX_CELLS_PER_AXIS = 30

/** Проверка параметров; key — ключ перевода baseplate.error.*, без готового текста. */
export function validateBaseplate(g: BaseplateGeometry): { ok: boolean; errors: BaseplateError[] } {
  const errors: BaseplateError[] = []
  const bad = (field: string, key: string) => errors.push({ field, key })
  const t = g.thickness
  const sx = axisMm(g.x, g.pitch), sy = axisMm(g.y, g.pitch)
  for (const [f, v] of [['x', sx], ['y', sy]] as const) {
    if (!Number.isFinite(v) || v <= 0) bad(f, 'baseplate.error.size')
    else if (v > MAX_SIZE) bad(f, 'baseplate.error.sizeTooLarge')
  }
  const numeric: [string, number][] = [['baseHeight', t.baseHeight], ['floor', t.floor], ['rim', t.rim], ['paddingDrop', t.paddingDrop], ['cornerRadius', t.cornerRadius]]
  for (const [f, v] of numeric) if (!Number.isFinite(v) || v < 0) bad(`thickness.${f}`, 'baseplate.error.negative')
  if (errors.length) return { ok: false, errors }
  if (t.baseHeight < SOCKET_HEIGHT - 1e-9) bad('thickness.baseHeight', 'baseplate.error.baseHeightMin')
  if (sx - 2 * t.rim < 1 || sy - 2 * t.rim < 1) bad('thickness.rim', 'baseplate.error.rimTooLarge')
  if (t.cornerRadius > Math.min(sx, sy) / 2) bad('thickness.cornerRadius', 'baseplate.error.radiusTooLarge')
  if (errors.length === 0) {
    const { fp } = baseplateLayout(g)
    if (fp.nx > MAX_CELLS_PER_AXIS || fp.ny > MAX_CELLS_PER_AXIS) bad(fp.nx > MAX_CELLS_PER_AXIS ? 'x' : 'y', 'baseplate.error.tooManyCells')
    if (t.paddingDrop > baseplateHeights(g, fp).total) bad('thickness.paddingDrop', 'baseplate.error.paddingDropTooLarge')
  }
  return { ok: errors.length === 0, errors }
}

export async function buildBaseplate(g: BaseplateGeometry, wasmUrl?: string): Promise<Manifold> {
  const w = await getWasm(wasmUrl)
  const { Manifold, CrossSection } = w
  const { fp, sizeX, sizeY, padX, padY, truncX, truncY } = baseplateLayout(g)
  const { total, pocketBottom, hasHoles } = baseplateHeights(g, fp)
  const { floor, rim, paddingDrop, cornerRadius } = g.thickness

  // внешний контур со скруглёнными углами, выдавленный на полную высоту
  const r = Math.min(cornerRadius, sizeX / 2, sizeY / 2)
  const outline = r > 0.001
    ? CrossSection.square([sizeX - 2 * r, sizeY - 2 * r], true).offset(r, 'Round', 2, 32)
    : CrossSection.square([sizeX, sizeY], true)
  const plate = Manifold.extrude(outline, total)

  const cell = socketPocket(w, g.pitch).translate([0, 0, pocketBottom])
  const cuts: Manifold[] = cellCenters(fp).map((c) => cell.translate([c.x, c.y, 0]))
  // под гнёздами ячейки открыты насквозь (выше сплошного пола), материал остаётся только в «ушах» вокруг отверстий
  cuts.push(...cellWindows(w, g.fasteners, fp, pocketBottom, floor))
  if (hasHoles) cuts.push(...fastenerCuts(w, g.fasteners, fp, pocketBottom).cuts)

  // отступ (остаток вокруг блока ячеек, внутри бортика) можно занизить относительно кромки
  if (paddingDrop > 0 && (padX > 1e-6 || padY > 1e-6 || truncX || truncY)) {
    const z = total - paddingDrop
    const inner = Manifold.cube([sizeX - 2 * rim, sizeY - 2 * rim, paddingDrop + 1]).translate([-(sizeX - 2 * rim) / 2, -(sizeY - 2 * rim) / 2, z])
    const bx = fp.nx * g.pitch, by = fp.ny * g.pitch
    const x0 = -sizeX / 2 + fp.offsetX, y0 = -sizeY / 2 + fp.offsetY
    const block = Manifold.cube([bx, by, paddingDrop + 3]).translate([x0, y0, z - 1])
    cuts.push(inner.subtract(block))
  }
  return plate.subtract(Manifold.union(cuts))
}
