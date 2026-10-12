// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../i18n'
import i18n from '../i18n'
import { isChanged } from './isChanged'
import { Section } from './Section'

describe('Section', () => {
  it('всегда стартует свёрнутой, сводка видна', () => {
    render(<Section title="Размер" summary="2 × 2"><input aria-label="поле" /></Section>)
    expect(screen.getByRole('button', { name: /^Expand: Размер( \(changed\))?$/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('поле')).toBeNull()
    expect(screen.getByText('2 × 2')).toBeInTheDocument()
  })
  it('раскрытие и сворачивание вручную', async () => {
    render(<Section title="S"><input aria-label="поле" /></Section>)
    await userEvent.click(screen.getByRole('button', { name: /^Expand: S( \(changed\))?$/ }))
    expect(screen.getByLabelText('поле')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Collapse: S( \(changed\))?$/ }))
    expect(screen.queryByLabelText('поле')).toBeNull()
  })
  it('modified: сводка оранжевая (text-changed), без него — приглушённая; метка на самом элементе', () => {
    const { rerender } = render(<Section title="S" summary="42" modified />)
    const s = screen.getByText('42')
    expect(s.className).toContain('text-changed')
    expect(s.className).not.toContain('text-text-subtle')
    expect(s).toHaveAttribute('data-modified', 'true')
    rerender(<Section title="S" summary="42" />)
    expect(screen.getByText('42').className).toContain('text-text-subtle')
    expect(screen.getByText('42')).not.toHaveAttribute('data-modified')
  })
  it('изменённое состояние не только цвет: доступное имя кнопки содержит «изменено», на русском тоже', async () => {
    const { rerender } = render(<Section title="S" summary="1" modified />)
    expect(screen.getByRole('button', { name: /^Expand: S\ \(changed\)( \(changed\))?$/ })).toBeInTheDocument()
    await i18n.changeLanguage('ru')
    expect(screen.getByRole('button', { name: 'Развернуть: S (изменено)' })).toBeInTheDocument()
    rerender(<Section title="S" summary="1" />)
    expect(screen.getByRole('button', { name: 'Развернуть: S' })).toBeInTheDocument()
    await i18n.changeLanguage('en')
  })
  it('сброс виден только у раскрытой секции с onReset', async () => {
    render(<Section title="S" onReset={() => {}} />)
    expect(screen.queryByRole('button', { name: /Reset/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /^Expand: S( \(changed\))?$/ }))
    expect(screen.getByRole('button', { name: 'Reset: S' })).toBeInTheDocument()
  })
})

describe('isChanged', () => {
  it('равные простые значения и вложенные объекты — не изменено', () => {
    expect(isChanged(1, 1)).toBe(false)
    expect(isChanged('a', 'a')).toBe(false)
    expect(isChanged({ a: 1, b: { c: [1, 2, { d: true }] } }, { b: { c: [1, 2, { d: true }] }, a: 1 })).toBe(false)
    expect(isChanged(null, null)).toBe(false)
    expect(isChanged([], [])).toBe(false)
  })
  it('любое различие — изменено: число, строка, вложенное поле, длина массива, порядок', () => {
    expect(isChanged(1, 2)).toBe(true)
    expect(isChanged({ a: { b: 1 } }, { a: { b: 2 } })).toBe(true)
    expect(isChanged([1, 2], [1, 2, 3])).toBe(true)
    expect(isChanged([1, 2], [2, 1])).toBe(true)
    expect(isChanged({ a: 1 }, { a: 1, b: 2 })).toBe(true)
    expect(isChanged({ a: 1, b: 2 }, { a: 1 })).toBe(true)
  })
  it('числа сравниваются точно: 0.1 + 0.2 ≠ 0.3, а 1.0 = 1', () => {
    expect(isChanged(0.1 + 0.2, 0.3)).toBe(true)
    expect(isChanged(1.0, 1)).toBe(false)
    expect(isChanged(NaN, NaN)).toBe(false)
    expect(isChanged(0, -0)).toBe(false)
  })
  it('тип важен: 1 ≠ "1", массив ≠ объект, null ≠ объект', () => {
    expect(isChanged(1, '1')).toBe(true)
    expect(isChanged([], {})).toBe(true)
    expect(isChanged(null, {})).toBe(true)
    expect(isChanged({}, null)).toBe(true)
    expect(isChanged(false, 0)).toBe(true)
  })
  it('undefined-поле равно отсутствующему (старая запись без нового поля)', () => {
    expect(isChanged({ a: 1, b: undefined }, { a: 1 })).toBe(false)
    expect(isChanged({ a: 1 }, { a: 1, b: undefined })).toBe(false)
    expect(isChanged({ a: 1, b: undefined }, { a: 1, b: 0 })).toBe(true)
  })
  it('массивы объектов: срезы и позиции', () => {
    expect(isChanged([{ i: 0, j: 0, corner: 'tl' }], [{ i: 0, j: 0, corner: 'tl' }])).toBe(false)
    expect(isChanged([{ i: 0, j: 0, corner: 'tl' }], [{ i: 0, j: 1, corner: 'tl' }])).toBe(true)
  })
})
