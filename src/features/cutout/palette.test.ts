import { describe, expect, it } from 'vitest'
import { CUTOUT_COLORS } from '../../geometry/cutout'
import { cutoutColorName, cutoutColorVar } from './palette'

// CSS в vitest не отдаётся через ?raw (пустая строка), поэтому тема читается файлом; типов Node в проекте нет
type NodeFs = { readFileSync(path: URL, encoding: 'utf8'): string }
const fs = (globalThis as unknown as { process: { getBuiltinModule(id: 'node:fs'): NodeFs } }).process.getBuiltinModule('node:fs')
const css = fs.readFileSync(new URL('../../app/theme.css', import.meta.url), 'utf8')

const token = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]
const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const lum = (hex: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) }
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }

describe('палитра вырезов (1.2)', () => {
  it('в теме есть ровно CUTOUT_COLORS токенов --color-cutout-N, все цвета разные', () => {
    const hexes = Array.from({ length: CUTOUT_COLORS }, (_, i) => token(`color-cutout-${i}`))
    expect(hexes.every(Boolean)).toBe(true)
    expect(new Set(hexes.map((h) => h!.toLowerCase())).size).toBe(CUTOUT_COLORS)
    expect(token(`color-cutout-${CUTOUT_COLORS}`)).toBeUndefined()
  })

  it('каждый цвет не ниже 3:1 по контрасту к фону панелей (--color-surface-1)', () => {
    const bg = token('color-surface-1')!
    for (let i = 0; i < CUTOUT_COLORS; i++) expect(contrast(token(`color-cutout-${i}`)!, bg), `цвет ${i}`).toBeGreaterThanOrEqual(3)
  })

  it('помощник: индекс по модулю числа цветов, пустой и отрицательный не ломают', () => {
    expect(cutoutColorVar(0)).toBe('var(--color-cutout-0)')
    expect(cutoutColorVar(CUTOUT_COLORS)).toBe('var(--color-cutout-0)')
    expect(cutoutColorVar(CUTOUT_COLORS + 2)).toBe('var(--color-cutout-2)')
    expect(cutoutColorVar(undefined)).toBe('var(--color-cutout-0)')
    expect(cutoutColorVar(-1)).toBe(`var(--color-cutout-${CUTOUT_COLORS - 1})`)
    expect(cutoutColorName(3)).toBe('--color-cutout-3')
  })
})
