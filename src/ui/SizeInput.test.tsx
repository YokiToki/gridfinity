// @vitest-environment jsdom
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../i18n'
import i18n from '../i18n'
import { SizeInput } from './SizeInput'
import type { Align } from '../geometry/sizing'

function Harness({ start = 84 }: { start?: number }) {
  const [mm, setMm] = useState(start)
  const [align, setAlign] = useState<Align>('center')
  return <><SizeInput label="X" valueMm={mm} pitch={42} onChange={setMm} align={align} onAlignChange={setAlign} /><output data-testid="mm">{mm}</output><output data-testid="al">{align}</output></>
}

describe('SizeInput', () => {
  it('2.5 ячейки → 105 мм', async () => {
    await i18n.changeLanguage('en')
    render(<Harness />)
    const units = screen.getByLabelText('X, Units')
    await userEvent.clear(units); await userEvent.type(units, '2.5'); await userEvent.tab()
    expect(screen.getByLabelText('X, Length')).toHaveValue('105')
    expect(screen.getByTestId('mm')).toHaveTextContent('105')
  })
  it('100 мм → ≈ 2.38 ячейки и остаток 16 мм', async () => {
    await i18n.changeLanguage('en')
    render(<Harness />)
    const len = screen.getByLabelText('X, Length')
    await userEvent.clear(len); await userEvent.type(len, '100'); await userEvent.tab()
    expect(screen.getByLabelText('X, Units')).toHaveValue('2.38')
    expect(screen.getByText(/Padding 16 mm/)).toBeInTheDocument()
  })
  it('выбор выравнивания', async () => {
    await i18n.changeLanguage('en')
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'End' }))
    expect(screen.getByTestId('al')).toHaveTextContent('end')
  })
  it('меньше одной ячейки — предупреждение', async () => {
    await i18n.changeLanguage('en')
    render(<Harness start={30} />)
    expect(screen.getByRole('alert')).toHaveTextContent('truncated')
  })
})
