import { expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/** Раскрывает все свёрнутые секции и проверяет: у каждого числового поля есть обе кнопки − / +. */
export async function expectAllNumericSteppers() {
  for (let i = 0; i < 10; i++) {
    const closed = screen.queryAllByRole('button', { name: /^Expand: / })
    if (!closed.length) break
    for (const b of closed) await userEvent.click(b)
  }
  const inputs = screen.getAllByRole('textbox').filter((el) => el.getAttribute('inputmode') === 'decimal')
  expect(inputs.length).toBeGreaterThan(0)
  for (const input of inputs) {
    const label = (input as HTMLInputElement).labels?.[0]?.textContent ?? ''
    expect(label, 'у поля есть подпись').not.toBe('')
    expect(screen.getByRole('button', { name: `Decrease: ${label}` }), label).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Increase: ${label}` }), label).toBeInTheDocument()
  }
}
