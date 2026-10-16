import { applyFit, fitPoints, project, type Camera, type Fit } from './projection'
import { EMPTY, rasterize, type TriMesh } from './raster'
import { TONES } from './shade'
import { smoothMask } from './smooth'
import { tracePath } from './trace'

export interface ArtOptions {
  /** viewBox: ширина и высота, в единицах SVG. */
  width: number
  height: number
  /** Поле вокруг фигуры. */
  pad: number
  /** Во сколько раз растр плотнее viewBox. */
  supersample: number
  /** Допуск упрощения контура, в единицах viewBox. */
  tolerance: number
  /** Радиус сглаживания масок тонов и контура, в единицах viewBox (σ Гаусса); не задан — масок не трогаем. */
  smooth?: number
}

export const defaultArtOptions: ArtOptions = { width: 250, height: 165, pad: 8, supersample: 3, tolerance: 0.35 }

/** Проекции вершин (для подгонки масштаба). */
export function projectedPoints(mesh: TriMesh, cam: Camera) {
  const n = mesh.positions.length / 3
  return Array.from({ length: n }, (_, i) => project(cam, [mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2]]))
}

/** Габарит проекции: ширина и высота в единицах модели. */
export function projectedSize(mesh: TriMesh, cam: Camera) {
  const p = projectedPoints(mesh, cam)
  const xs = p.map((q) => q.x), ys = p.map((q) => q.y)
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

/**
 * Рендер меша в SVG: тоны — вложенные области «тон ≥ k» (path с классом art-t{k}, от тёмного к светлому, без швов между тонами),
 * контур силуэта — art-edge. Цветов в файле нет: классы задаёт theme.css.
 * scale задаёт общий масштаб (одинаковый у разных деталей); если не задан, подбирается по этой детали.
 */
export function renderSvg(mesh: TriMesh, cam: Camera, o: ArtOptions = defaultArtOptions, scale?: number): string {
  const pts = projectedPoints(mesh, cam)
  const own = fitPoints(pts, o.width, o.height, o.pad)
  const fit: Fit = scale === undefined ? own : { scale, offsetX: own.offsetX / own.scale * scale + (o.width / 2) * (1 - scale / own.scale), offsetY: own.offsetY / own.scale * scale + (o.height / 2) * (1 - scale / own.scale) }
  const ss = o.supersample
  const W = Math.round(o.width * ss), H = Math.round(o.height * ss)
  const big: Fit = { scale: fit.scale * ss, offsetX: fit.offsetX * ss, offsetY: fit.offsetY * ss }
  const img = rasterize(mesh, cam, big, W, H)
  const tol = o.tolerance * ss
  const sigma = (o.smooth ?? 0) * ss
  const paths: string[] = []
  for (let k = 0; k < TONES; k++) {
    const m = new Uint8Array(W * H)
    let any = false
    for (let i = 0; i < m.length; i++) if (img.tone[i] !== EMPTY && img.tone[i] >= k) { m[i] = 1; any = true }
    if (!any) continue
    const d = tracePath(smoothMask(m, W, H, sigma), W, H, ss, tol)
    if (d) paths.push(`<path class="art-t${k}" fill-rule="evenodd" d="${d}"/>`)
  }
  const sil = new Uint8Array(W * H)
  for (let i = 0; i < sil.length; i++) if (img.tone[i] !== EMPTY) sil[i] = 1
  const outline = tracePath(smoothMask(sil, W, H, sigma), W, H, ss, tol)
  if (outline) paths.push(`<path class="art-edge" d="${outline}"/>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.width} ${o.height}">${paths.join('')}</svg>\n`
}

export { applyFit }
