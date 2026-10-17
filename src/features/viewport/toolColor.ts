import { cutoutColorName } from '../cutout/palette'

/** Цвет по умолчанию (как до палитры): если токена темы нет или он не читается. */
export const TOOL_FALLBACK = 0x35c9e8

/** Цвет инструмента выреза: значение токена `--color-cutout-<i>` (hex, 3 или 6 цифр) или запасной циановый. Источник цвета один — theme.css. */
export function toolColor(index: number | undefined, read: (name: string) => string): number {
  const v = read(cutoutColorName(index)).trim()
  const m = v.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i)
  if (!m) return TOOL_FALLBACK
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1]
  return parseInt(h, 16)
}

/** Чтение переменной CSS с корня документа (в тестах без стилей вернёт пустую строку). */
export const readRootVar = (name: string): string =>
  typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(name)
