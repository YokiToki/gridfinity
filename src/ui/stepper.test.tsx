// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import '../i18n'
import { NumberField } from './NumberField'
import { LengthField } from './LengthField'
import { UnitContext } from './units'

function Num({ start = 2, min = 0, max = 10, step = 0.5 }: { start?: number; min?: number; max?: number; step?: number }) {
  const [v, setV] = useState(start)
  return <><NumberField label="N" value={v} min={min} max={max} step={step} onChange={setV} /><output data-testid="v">{v}</output></>
}
const inc = () => screen.getByRole('button', { name: 'Increase: N' })
const dec = () => screen.getByRole('button', { name: 'Decrease: N' })
const val = () => Number(screen.getByTestId('v').textContent)

afterEach(() => vi.useRealTimers())

describe('NumberField stepper', () => {
  it('кнопки есть по умолчанию и отключаются через stepper={false}', () => {
    const { unmount } = render(<Num />)
    expect(inc()).toBeTruthy()
    expect(dec()).toBeTruthy()
    unmount()
    render(<NumberField label="N" value={1} min={0} max={2} onChange={() => {}} stepper={false} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('клик меняет значение на шаг', () => {
    render(<Num />)
    fireEvent.pointerDown(inc()); fireEvent.pointerUp(inc())
    expect(val()).toBe(2.5)
    fireEvent.pointerDown(dec()); fireEvent.pointerUp(dec())
    expect(val()).toBe(2)
  })
  it('активация с клавиатуры (click без указателя) тоже шагает', () => {
    render(<Num />)
    fireEvent.click(inc())
    expect(val()).toBe(2.5)
  })
  it('Shift умножает шаг на 10', () => {
    render(<Num />)
    fireEvent.pointerDown(inc(), { shiftKey: true }); fireEvent.pointerUp(inc())
    expect(val()).toBe(7)
  })
  it('удержание повторяет: задержка 400 мс, затем 10 раз в секунду', () => {
    vi.useFakeTimers()
    render(<Num step={1} />)
    fireEvent.pointerDown(inc())
    expect(val()).toBe(3)
    act(() => { vi.advanceTimersByTime(399) })
    expect(val()).toBe(3)
    act(() => { vi.advanceTimersByTime(1) })
    for (let i = 0; i < 3; i++) act(() => { vi.advanceTimersByTime(100) })
    expect(val()).toBe(6)
    fireEvent.pointerUp(inc())
    act(() => { vi.advanceTimersByTime(1000) })
    expect(val()).toBe(6)
  })
  it('на пределе кнопка выключена, значение не выходит за предел', () => {
    render(<Num start={10} />)
    expect(inc()).toBeDisabled()
    expect(dec()).toBeEnabled()
    fireEvent.pointerDown(dec(), { shiftKey: true }); fireEvent.pointerUp(dec())
    expect(val()).toBe(5)
  })
  it('нижний предел', () => {
    render(<Num start={0} />)
    expect(dec()).toBeDisabled()
    expect(inc()).toBeEnabled()
  })
})

describe('LengthField stepper', () => {
  it('в дюймах шаг 1 мм: показ +0.039 in, в модели +1 мм', () => {
    function L() {
      const [mm, setMm] = useState(2)
      return (
        <UnitContext.Provider value={{ unit: 'in', setUnit: () => {} }}>
          <NumberFieldHost mm={mm} setMm={setMm} />
          <output data-testid="mm">{mm}</output>
        </UnitContext.Provider>
      )
    }
    function NumberFieldHost({ mm, setMm }: { mm: number; setMm: (v: number) => void }) {
      return <LengthField label="L" value={mm} min={0} max={600} step={1} onChange={setMm} />
    }
    render(<L />)
    expect(screen.getByLabelText('L')).toHaveValue('0.079')
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Increase: L' }))
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Increase: L' }))
    expect(screen.getByLabelText('L')).toHaveValue('0.118')
    expect(screen.getByTestId('mm')).toHaveTextContent('3')
  })
})
