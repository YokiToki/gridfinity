// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Manifold } from 'manifold-3d'
import '../../i18n'
import { UnitContext } from '../../ui/units'
import { MeasurementsBar } from './MeasurementsBar'

const model = { boundingBox: () => ({ min: [0, 0, 0], max: [50.8, 25.4, 8.65] }) } as unknown as Manifold

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
