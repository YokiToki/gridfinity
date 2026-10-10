// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { result } from '../../geometry/testing'
import '../../i18n'
import { UnitContext } from '../../ui/units'
import { MeasurementsBar } from './MeasurementsBar'

const model = result(1, { min: [0, 0, 0], max: [50.8, 25.4, 8.65] })

describe('MeasurementsBar', () => {
  it('показывает габариты в мм', () => {
    render(<MeasurementsBar model={model} />)
    expect(screen.getByText('X 50.8')).toBeInTheDocument()
  })
  it('показывает габариты в дюймах', () => {
    render(<UnitContext.Provider value={{ unit: 'in', setUnit: () => {} }}><MeasurementsBar model={model} /></UnitContext.Provider>)
    expect(screen.getByText('X 2')).toBeInTheDocument()
    expect(screen.getByText('Y 1')).toBeInTheDocument()
  })
})

describe('MeasurementsBar: дюймы', () => {
  it('84 мм → 3.307 in', () => {
    const m = result(1, { min: [0, 0, 0], max: [84, 84, 4.65] })
    render(<UnitContext.Provider value={{ unit: 'in', setUnit: () => {} }}><MeasurementsBar model={m} /></UnitContext.Provider>)
    expect(screen.getByText('X 3.307')).toBeInTheDocument()
    expect(screen.getByText(/Z 0.183 in/)).toBeInTheDocument()
  })
})
