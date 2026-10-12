// Текстовый слой Keychain: параметры, растр надписи и выборка покрытия по координатам модели. Без React и DOM:
// сама растеризация шрифтом (canvas) живёт в features/keychain/textRaster.ts, воркер получает готовую маску.
import { relToMm } from './anchors'

export type TextAlign = 'left' | 'center' | 'right'
export type TextMode = 'emboss' | 'engrave'

/** Шрифт: идентификатор из списка (`roboto`), системный (`generic:serif`) или пользовательский (`user:<id>`), начертание. */
export interface TextFont {
  id: string
  bold: boolean
  italic: boolean
  /** Подпись пользовательского шрифта (имя файла) для списка. */
  name?: string
}

export interface TextParams {
  enabled: boolean
  /** Содержимое, строки разделены переводом строки. */
  content: string
  font: TextFont
  /** Высота заглавных букв, мм. */
  size: number
  /** Добавка между буквами, мм. */
  letterSpacing: number
  /** Множитель межстрочного интервала (1 — по умолчанию). */
  lineSpacing: number
  align: TextAlign
  /** Поворот, градусы против часовой стрелки. */
  rotation: number
  mode: TextMode
  /** Высота надписи над поверхностью (рельеф), мм. */
  height: number
  /** Глубина гравировки, мм. */
  depth: number
  /** Положение центра надписи: доли габарита силуэта (0 — слева/снизу), Y вверх. */
  x: number
  y: number
  /** Ключ растра в реестре воркера; заполняет рабочее пространство, в сохранённое не попадает. */
  maskId?: string
}

export const defaultText: TextParams = {
  enabled: false, content: '', font: { id: 'roboto', bold: false, italic: false }, size: 8, letterSpacing: 0, lineSpacing: 1,
  align: 'center', rotation: 0, mode: 'emboss', height: 0.6, depth: 0.5, x: 0.5, y: 0.5,
}

/** Разрешение растра надписи: пикселей на мм. */
export const TEXT_PX_PER_MM = 12
export const MAX_TEXT_LINES = 12
export const MAX_TEXT_CHARS = 400

/** Растр надписи: альфа-маска 0…255, строки сверху вниз; центр маски — центр надписи. */
export interface TextRaster { mask: Uint8Array; width: number; height: number; pxPerMm: number }

/** Реестр растров в этом потоке (воркере): параметры ссылаются на растр по maskId. */
export type TextRegistry = Map<string, TextRaster>

/** Ключ растра: только то, что меняет сам растр (не положение, поворот, режим и высоту). */
export function textRasterKey(t: TextParams, fontStamp = ''): string {
  return JSON.stringify([t.content, t.font.id, t.font.bold, t.font.italic, t.size, t.letterSpacing, t.lineSpacing, t.align, fontStamp])
}

/** Размеры надписи в мм (коробка растра). */
export const textBoxMm = (r: TextRaster) => ({ w: r.width / r.pxPerMm, h: r.height / r.pxPerMm })

/** Центр надписи в мм от центра габарита силуэта (Y вверх). */
export const textCenterMm = (t: TextParams, wMm: number, hMm: number) => relToMm(t.x, t.y, wMm, hMm)

/**
 * Покрытие 0…1 в точке (x, y) мм от центра габарита: обратное преобразование (сдвиг, поворот, масштаб) и билинейная выборка маски.
 * Позиция и поворот применяются здесь, в воркере, поэтому перетаскивание не растрирует текст заново.
 */
export function textSampler(r: TextRaster, t: TextParams, wMm: number, hMm: number): (x: number, y: number) => number {
  const c = textCenterMm(t, wMm, hMm)
  const a = (-t.rotation * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a)
  const { mask, width: w, height: h, pxPerMm: k } = r
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : mask[j * w + i] / 255)
  return (x, y) => {
    const dx = x - c.x, dy = y - c.y
    const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca
    const u = lx * k + w / 2 - 0.5, v = h / 2 - ly * k - 0.5
    if (u < -1 || v < -1 || u > w || v > h) return 0
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j
    return at(i, j) * (1 - fu) * (1 - fv) + at(i + 1, j) * fu * (1 - fv) + at(i, j + 1) * (1 - fu) * fv + at(i + 1, j + 1) * fu * fv
  }
}
