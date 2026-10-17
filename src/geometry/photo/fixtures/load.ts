import { decode } from 'jpeg-js'
import { toColorImage, toGrayImage, type ColorImage } from '../../../features/keychain/decodeImage'
import type { GrayImage } from '../../raster/threshold'
import type { Pt } from '../homography'

// Типов Node в проекте нет (@types/node не нужен приложению), поэтому файл читается через встроенный модуль
type NodeFs = { readFileSync(path: URL): Uint8Array }
const fs = (globalThis as unknown as { process: { getBuiltinModule(id: 'node:fs'): NodeFs } }).process.getBuiltinModule('node:fs')

export interface PhotoFixture { name: string; gray: GrayImage; color: ColorImage; /** Руками выбранные углы листа, пиксели: левый верхний, правый верхний, правый нижний, левый нижний. */ corners: Pt[] }

/** Фотографии владельца: инструменты на листе A4 (книжная) на деревянном столе, 480 × 640; метаданных в файлах нет. */
const CORNERS: Record<string, Pt[]> = {
  flash: [[60, 41], [424, 50], [418, 549], [68, 554]],
  noflash: [[54, 36.5], [436.5, 46], [431, 571.5], [61.5, 577.5]],
}

export function loadFixture(name: 'flash' | 'noflash'): PhotoFixture {
  const bytes = fs.readFileSync(new URL(`./${name}.jpg`, import.meta.url))
  const img = decode(bytes, { useTArray: true, formatAsRGBA: true })
  const rgba = new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.byteLength)
  return { name, gray: toGrayImage(rgba, img.width, img.height), color: toColorImage(rgba, img.width, img.height), corners: CORNERS[name] }
}
