// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { MeshData } from '../../geometry/mesh'
import '../../i18n'
import { UnitContext } from '../../ui/units'
import { MeasurementsBar } from './MeasurementsBar'

const model = { min: [0, 0, 0], max: [50.8, 25.4, 8.65], volume: 1, numProp: 3, vertProperties: new Float32Array(), triVerts: new Uint32Array() } as MeshData

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
