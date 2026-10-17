import { describe, expect, it } from 'vitest'
import { readRootVar, toolColor, TOOL_FALLBACK } from './toolColor'

describe('цвет инструмента выреза в 3D (2.3)', () => {
  const theme: Record<string, string> = { '--color-cutout-0': ' #e69f00', '--color-cutout-1': '#56B4E9', '--color-cutout-2': '#0f8' }
  const read = (n: string) => theme[n] ?? ''

  it('берёт значение токена темы: hex из шести и из трёх цифр, регистр и пробелы не важны', () => {
    expect(toolColor(0, read)).toBe(0xe69f00)
    expect(toolColor(1, read)).toBe(0x56b4e9)
    expect(toolColor(2, read)).toBe(0x00ff88)
  })
  it('индекс по модулю числа цветов и без индекса — первый цвет', () => {
    expect(toolColor(7, read)).toBe(0xe69f00)
    expect(toolColor(undefined, read)).toBe(0xe69f00)
  })
  it('нет токена, пустое или нечитаемое значение — прежний голубой, без исключений', () => {
    expect(toolColor(3, read)).toBe(TOOL_FALLBACK)
    expect(toolColor(0, () => '')).toBe(TOOL_FALLBACK)
    expect(toolColor(0, () => 'rgb(1, 2, 3)')).toBe(TOOL_FALLBACK)
    expect(toolColor(0, () => 'var(--x)')).toBe(TOOL_FALLBACK)
  })
  it('чтение переменной без документа возвращает пустую строку', () => {
    expect(readRootVar('--color-cutout-0')).toBe('')
  })
})
