import type { Manifold } from 'manifold-3d'
import { getWasm } from './wasm'
import { socketPocket } from './profiles'
import { DEFAULT_PITCH, FLOOR, SOCKET_HEIGHT } from './spec'
import { cellCenters, type Footprint } from './footprint'
import { allPositions, cellWindows, defaultFasteners, fastenerCuts, needsFloor, type FastenerConfig } from './fasteners'
import { resolveAxis, type Align } from './sizing'
import { defaultSplit, MAX_PARTS, resolveCuts, splitParts, type CellRegion, type Part, type SplitGeometry } from './split'
import type { ManifoldToplevel } from 'manifold-3d'

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
  split: SplitGeometry
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
  split: defaultSplit,
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
    if (g.split.enabled) {
      const cuts = resolveCuts(fp, g.split)
      if (cuts.error) bad('split', 'baseplate.error.splitCellTooBig')
      else if (splitParts(fp, cuts.xCuts, cuts.yCuts).length > MAX_PARTS) bad('split', 'baseplate.error.splitTooManyParts')
    }
  }
  return { ok: errors.length === 0, errors }
}

/** Часть плиты, собранная в координатах целой плиты. */
export interface BuiltPart { part: Part; solid: Manifold }

export interface PartExtras { add: Manifold[]; sub: Manifold[] }

/** Плита целиком или одна её часть (регион ячеек и прямоугольник); крайние части сохраняют бортик, отступ и скругления. */
export function buildPlate(w: ManifoldToplevel, g: BaseplateGeometry, part?: Part, extras?: PartExtras): Manifold {
  const { Manifold, CrossSection } = w
  const { fp, sizeX, sizeY, padX, padY, truncX, truncY } = baseplateLayout(g)
  const { total, pocketBottom, hasHoles } = baseplateHeights(g, fp)
  const { floor, rim, paddingDrop, cornerRadius } = g.thickness
  const region: CellRegion | undefined = part ? { i0: part.i0, i1: part.i1, j0: part.j0, j1: part.j1 } : undefined

  // внешний контур со скруглёнными углами; у части он ограничен её прямоугольником
  const r = Math.min(cornerRadius, sizeX / 2, sizeY / 2)
  let outline = r > 0.001
    ? CrossSection.square([sizeX - 2 * r, sizeY - 2 * r], true).offset(r, 'Round', 2, 32)
    : CrossSection.square([sizeX, sizeY], true)
  if (part) outline = outline.intersect(CrossSection.square([part.sizeX, part.sizeY], true).translate([(part.x0 + part.x1) / 2, (part.y0 + part.y1) / 2]))
  let plate = Manifold.extrude(outline, total)

  const cell = socketPocket(w, g.pitch).translate([0, 0, pocketBottom])
  const cells = cellCenters(fp).filter((_, n) => {
    if (!region) return true
    const i = Math.floor(n / fp.ny), j = n % fp.ny
    return i >= region.i0 && i < region.i1 && j >= region.j0 && j < region.j1
  })
  const cuts: Manifold[] = cells.map((c) => cell.translate([c.x, c.y, 0]))
  // под гнёздами ячейки открыты насквозь (выше сплошного пола), материал остаётся только в «ушах» вокруг отверстий
  cuts.push(...cellWindows(w, g.fasteners, fp, pocketBottom, floor, region))
  if (hasHoles) cuts.push(...fastenerCuts(w, g.fasteners, fp, pocketBottom, region).cuts)

  // отступ (остаток вокруг блока ячеек, внутри бортика) можно занизить относительно кромки
  if (paddingDrop > 0 && (padX > 1e-6 || padY > 1e-6 || truncX || truncY)) {
    const z = total - paddingDrop
    const inner = Manifold.cube([sizeX - 2 * rim, sizeY - 2 * rim, paddingDrop + 1]).translate([-(sizeX - 2 * rim) / 2, -(sizeY - 2 * rim) / 2, z])
    const block = Manifold.cube([fp.nx * g.pitch, fp.ny * g.pitch, paddingDrop + 3]).translate([-sizeX / 2 + fp.offsetX, -sizeY / 2 + fp.offsetY, z - 1])
    cuts.push(inner.subtract(block))
  }
  if (extras?.add.length) plate = plate.add(Manifold.union(extras.add))
  if (extras?.sub.length) cuts.push(...extras.sub)
  return plate.subtract(Manifold.union(cuts))
}

/** Вся плита одним телом (разделение не учитывается): для экспорта целиком, тестов и сравнения объёма. */
export async function buildBaseplate(g: BaseplateGeometry, wasmUrl?: string): Promise<Manifold> {
  return buildPlate(await getWasm(wasmUrl), g)
}

/** Части плиты по настройкам разделения; без разделения — одна часть A1 с целой плитой. */
export async function buildBaseplateParts(g: BaseplateGeometry, wasmUrl?: string): Promise<BuiltPart[]> {
  const w = await getWasm(wasmUrl)
  const { fp, sizeX, sizeY } = baseplateLayout(g)
  const cuts = resolveCuts(fp, g.split)
  const parts = splitParts(fp, cuts.xCuts, cuts.yCuts, g.split.maxX, g.split.maxY)
  if (!g.split.enabled || parts.length === 1) {
    const only: Part = { ...parts[0], x0: -sizeX / 2, x1: sizeX / 2, y0: -sizeY / 2, y1: sizeY / 2, sizeX, sizeY }
    return [{ part: only, solid: buildPlate(w, g) }]
  }
  return parts.map((part) => ({ part, solid: buildPlate(w, g, part) }))
}
