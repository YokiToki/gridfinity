// @vitest-environment jsdom
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../i18n'
import { NumberField } from './NumberField'
import { LengthField } from './LengthField'
import { SegmentedControl } from './SegmentedControl'
import { Toggle } from './Toggle'
import { UnitContext } from './units'

function Num({ start = 5 }: { start?: number }) {
  const [v, setV] = useState(start)
  return <><NumberField label="N" value={v} min={1} max={10} onChange={setV} /><output data-testid="v">{v}</output></>
}

describe('NumberField', () => {
  it('ограничивает значение сверху и показывает ограниченное', async () => {
    render(<Num />)
    const input = screen.getByLabelText('N')
    await userEvent.clear(input)
    await userEvent.type(input, '99')
    await userEvent.tab()
    expect(screen.getByTestId('v')).toHaveTextContent('10')
    expect(input).toHaveValue('10')
  })
  it('ограничивает значение снизу', async () => {
    render(<Num />)
    const input = screen.getByLabelText('N')
    await userEvent.clear(input)
    await userEvent.type(input, '-4')
    await userEvent.keyboard('{Enter}')
    expect(screen.getByTestId('v')).toHaveTextContent('1')
  })
  it('стрелки на клавиатуре меняют значение', async () => {
    render(<Num />)
    screen.getByLabelText('N').focus()
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowDown}')
    expect(screen.getByTestId('v')).toHaveTextContent('6')
  })
  it('мусорный ввод возвращает прежнее значение', async () => {
    render(<Num />)
    const input = screen.getByLabelText('N')
    await userEvent.clear(input)
    await userEvent.type(input, 'abc')
    await userEvent.tab()
    expect(screen.getByTestId('v')).toHaveTextContent('5')
  })
})

describe('LengthField', () => {
  it('ввод 2 in даёт 50.8 мм в модели', async () => {
    let mm = 0
    render(
      <UnitContext.Provider value={{ unit: 'in', setUnit: () => {} }}>
        <LengthField label="L" value={25.4} min={1} max={600} onChange={(v) => (mm = v)} />
      </UnitContext.Provider>,
    )
    const input = screen.getByLabelText('L')
    expect(input).toHaveValue('1')
    await userEvent.clear(input)
    await userEvent.type(input, '2')
    await userEvent.tab()
    expect(mm).toBeCloseTo(50.8, 6)
  })
})

describe('переключение единиц', () => {
  it('mm → in → mm не вызывает onChange и не меняет показанное значение', () => {
    const calls: number[] = []
    const field = (unit: 'mm' | 'in') => (
      <UnitContext.Provider value={{ unit, setUnit: () => {} }}>
        <LengthField label="L" value={42} min={1} max={600} onChange={(v) => calls.push(v)} />
      </UnitContext.Provider>
    )
    const { rerender } = render(field('mm'))
    expect(screen.getByLabelText('L')).toHaveValue('42')
    rerender(field('in'))
    expect(screen.getByLabelText('L')).toHaveValue('1.654')
    rerender(field('mm'))
    expect(screen.getByLabelText('L')).toHaveValue('42')
    expect(calls).toEqual([])
  })
})

describe('SegmentedControl: длинные подписи', () => {
  const options = [{ value: 'a', label: 'Нет' }, { value: 'b', label: 'Углы' }, { value: 'c', label: 'Все ячейки' }, { value: 'd', label: 'Вручную' }]
  it('подпись растянутого контрола показывается целиком и может переноситься', () => {
    render(<SegmentedControl fill ariaLabel="s" value="a" onChange={() => {}} options={options} />)
    const b = screen.getByRole('button', { name: 'Все ячейки' })
    expect(b).toHaveTextContent('Все ячейки')
    expect(b.className).not.toContain('whitespace-nowrap')
    expect(b.className).toContain('min-w-0')
  })
  it('компактный контрол не переносит подписи', () => {
    render(<SegmentedControl ariaLabel="s" value="a" onChange={() => {}} options={options} />)
    expect(screen.getByRole('button', { name: 'Нет' }).className).toContain('whitespace-nowrap')
  })
})

describe('SegmentedControl и Toggle', () => {
  it('выбор сегмента с клавиатуры', async () => {
    let v = 'a'
    render(<SegmentedControl ariaLabel="s" value="a" onChange={(x) => (v = x)} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />)
    await userEvent.tab(); await userEvent.tab(); await userEvent.keyboard('{Enter}')
    expect(v).toBe('b')
  })
  it('переключатель срабатывает по пробелу', async () => {
    let on = false
    render(<Toggle label="T" checked={false} onChange={(x) => (on = x)} />)
    await userEvent.tab(); await userEvent.keyboard(' ')
    expect(on).toBe(true)
  })
})
