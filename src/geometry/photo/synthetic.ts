import type { GrayImage } from '../raster/threshold'
import { applyH, homography, invertH, type Pt } from './homography'
import type { Paper } from './paper'

/** Предмет на листе для тестов: принадлежность точке листа (мм от левого верхнего угла, y вниз) и яркость. */
export interface SyntheticObject { inside: (x: number, y: number) => boolean; gray: number; /** Цвет предмета для цветных снимков; без него предмет серый (gray, gray, gray). */ rgb?: [number, number, number] }

export interface SyntheticOptions {
  paper: Paper
  /** Углы листа на снимке (пиксели), по часовой стрелке от левого верхнего. */
  quad: Pt[]
  width: number
  height: number
  objects?: SyntheticObject[]
  paperGray?: number
  backgroundGray?: number
  /** Множитель освещения листа в точке листа (мм), 1 — ровный свет. */
  light?: (x: number, y: number) => number
}

/**
 * Тестовый «снимок»: лист с предметами, увиденный через заданный четырёхугольник (перспектива). Строится обратным отображением
 * (для каждого пикселя снимка — точка листа), поэтому дыр нет. Только для тестов и проверок в браузере.
 */
export function syntheticPhoto(o: SyntheticOptions): GrayImage {
  const rect: Pt[] = [[0, 0], [o.paper.width, 0], [o.paper.width, o.paper.height], [0, o.paper.height]]
  const h = homography(rect, o.quad)
  const inv = h && invertH(h)
  if (!inv) throw new Error('degenerate quad')
  const gray = new Uint8Array(o.width * o.height)
  for (let j = 0; j < o.height; j++) {
    for (let i = 0; i < o.width; i++) {
      const [x, y] = applyH(inv, [i + 0.5, j + 0.5])
      let v = o.backgroundGray ?? 60
      if (x >= 0 && y >= 0 && x <= o.paper.width && y <= o.paper.height) {
        const obj = o.objects?.find((s) => s.inside(x, y))
        v = obj ? obj.gray : (o.paperGray ?? 235) * (o.light ? o.light(x, y) : 1)
      }
      gray[j * o.width + i] = Math.max(0, Math.min(255, Math.round(v)))
    }
  }
  return { width: o.width, height: o.height, gray, alpha: null }
}

/** Прямоугольник на листе: левый верхний угол (x, y) и размеры, мм. */
export const rectObject = (x: number, y: number, w: number, h: number, gray = 40): SyntheticObject => ({ inside: (px, py) => px >= x && px <= x + w && py >= y && py <= y + h, gray })
/** Круг на листе: центр и радиус, мм. */
export const discObject = (cx: number, cy: number, r: number, gray = 40): SyntheticObject => ({ inside: (px, py) => Math.hypot(px - cx, py - cy) <= r, gray })
/** Буква «Г»: вертикальная перекладина и горизонтальная внизу; несимметрична, поэтому зеркальность видна. */
export const lObject = (x: number, y: number, size: number, thick: number, gray = 40): SyntheticObject => ({
  inside: (px, py) => px >= x && px <= x + size && py >= y && py <= y + size && (px <= x + thick || py >= y + size - thick), gray,
})

/** Стандартный наклонённый кадр: лист примерно в середине, виден под углом (перспектива заметна). */
export const tiltedQuad = (width: number, height: number): Pt[] => [
  [width * 0.18, height * 0.14], [width * 0.86, height * 0.2], [width * 0.92, height * 0.86], [width * 0.1, height * 0.8],
]

export interface SyntheticColorOptions extends SyntheticOptions {
  /** Цвет листа при ровном свете; по умолчанию серый paperGray. */
  paperRgb?: [number, number, number]
  /** Цвет стола вокруг листа. */
  backgroundRgb?: [number, number, number]
  /**
   * Тень на листе: множитель яркости 0…1 в точке листа (мм). Тень умножает цвет листа почти одинаково по каналам, у неё лёгкий
   * синий оттенок (свет от неба), как у настоящей: красный и зелёный ослабляются сильнее синего.
   */
  shadow?: (x: number, y: number) => number
  /** Синий оттенок тени, 0…1: насколько меньше ослабляется синий канал. */
  shadowBlue?: number
  /** Шум яркости, ±уровни (детерминированный). */
  noise?: number
}

/** Цветной тестовый «снимок» (см. syntheticPhoto): лист с предметами, мягкая тень и свет; результат — RGB. */
export function syntheticColorPhoto(o: SyntheticColorOptions): { rgb: Uint8Array; width: number; height: number } {
  const rect: Pt[] = [[0, 0], [o.paper.width, 0], [o.paper.width, o.paper.height], [0, o.paper.height]]
  const h = homography(rect, o.quad)
  const inv = h && invertH(h)
  if (!inv) throw new Error('degenerate quad')
  const paper = o.paperRgb ?? [o.paperGray ?? 235, o.paperGray ?? 235, o.paperGray ?? 235]
  const bg = o.backgroundRgb ?? [o.backgroundGray ?? 60, o.backgroundGray ?? 60, o.backgroundGray ?? 60]
  const rgb = new Uint8Array(o.width * o.height * 3)
  let seed = 12345
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5 }
  for (let j = 0; j < o.height; j++) {
    for (let i = 0; i < o.width; i++) {
      const [x, y] = applyH(inv, [i + 0.5, j + 0.5])
      let c: [number, number, number] = bg
      if (x >= 0 && y >= 0 && x <= o.paper.width && y <= o.paper.height) {
        const obj = o.objects?.find((s) => s.inside(x, y))
        if (obj) c = obj.rgb ?? [obj.gray, obj.gray, obj.gray]
        else {
          const light = o.light ? o.light(x, y) : 1
          const sh = o.shadow ? o.shadow(x, y) : 1
          const blue = 1 - (1 - sh) * (1 - (o.shadowBlue ?? 0.25))
          c = [paper[0] * light * sh, paper[1] * light * sh, paper[2] * light * blue]
        }
      }
      const n = o.noise ? rnd() * 2 * o.noise : 0
      const k = (j * o.width + i) * 3
      for (let ch = 0; ch < 3; ch++) rgb[k + ch] = Math.max(0, Math.min(255, Math.round(c[ch] + n)))
    }
  }
  return { rgb, width: o.width, height: o.height }
}

/** Яркость цветного снимка (Rec. 601, как toGrayImage) для пары с rectify. */
export function grayOfRgb(rgb: Uint8Array, width: number, height: number): GrayImage {
  const gray = new Uint8Array(width * height)
  for (let i = 0; i < gray.length; i++) gray[i] = Math.round(0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2])
  return { width, height, gray, alpha: null }
}
