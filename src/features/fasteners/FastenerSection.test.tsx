// @vitest-environment jsdom
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { defaultFasteners, type FastenerConfig } from '../../geometry/fasteners'
import { footprintFromCells } from '../../geometry/footprint'
import { FastenerSection } from './FastenerSection'

const fp = footprintFromCells(2, 2, 42)
let latest: FastenerConfig = defaultFasteners

function Harness({ start = defaultFasteners }: { start?: FastenerConfig }) {
  const [c, setC] = useState(start)
  latest = c
  return <FastenerSection config={c} onChange={setC} footprint={fp} />
}

// SVG в jsdom не имеет размеров: задаём прямоугольник 1 px = 1 мм с учётом отступа viewBox (6 мм)
const mockRect = (svg: Element) => {
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 96, height: 96, right: 96, bottom: 96, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
}
const pick = (group: RegExp, name: string) => userEvent.click(within(screen.getByRole('group', { name: group })).getByRole('button', { name }))

describe('FastenerSection', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })

  it('режим None: нет размеров и редактора', () => {
    render(<Harness />)
    expect(screen.queryByLabelText('Magnet Ø')).toBeNull()
    expect(screen.queryByTestId('placement-svg')).toBeNull()
    expect(screen.getByText(/Magnets: none · Screws: none/)).toBeInTheDocument()
  })
  it('режим Corners для магнитов: пресет и размеры', async () => {
    render(<Harness />)
    await pick(/Magnets: Placement/, 'Corners')
    expect(latest.magnets.mode).toBe('corner')
    expect(screen.getByLabelText('Magnet Ø')).toHaveValue('6.5')
    await userEvent.selectOptions(screen.getAllByLabelText('Preset')[0], 'm6x2')
    expect(latest.magnetD).toBe(6)
    expect(latest.magnetDepth).toBe(2)
    expect(screen.getByLabelText('Magnet Ø')).toHaveValue('6')
  })
  it('ручная правка диаметра переключает пресет на Custom', async () => {
    render(<Harness />)
    await pick(/Magnets: Placement/, 'Every cell')
    const d = screen.getByLabelText('Magnet Ø')
    await userEvent.clear(d); await userEvent.type(d, '7'); await userEvent.tab()
    expect(latest.magnetPreset).toBe('custom')
    expect(latest.magnetD).toBe(7)
  })
  it('режим Every cell для винтов: пресет M3 и головка', async () => {
    render(<Harness />)
    await pick(/Screws: Placement/, 'Every cell')
    expect(screen.getByLabelText('Screw Ø')).toHaveValue('3')
    await userEvent.selectOptions(screen.getByLabelText('Screw head'), 'counterbore')
    expect(latest.screwHead).toBe('counterbore')
    expect(screen.getByLabelText('Head depth')).toBeInTheDocument()
  })
  it('режим Manual: показывает редактор', async () => {
    render(<Harness />)
    await pick(/Screws: Placement/, 'Manual')
    expect(screen.getByTestId('placement-svg')).toBeInTheDocument()
    expect(screen.getByText(/No holes yet/)).toBeInTheDocument()
  })
  it('сброс секции возвращает значения по умолчанию', async () => {
    render(<Harness />)
    await pick(/Magnets: Placement/, 'Corners')
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Fasteners' }))
    expect(latest).toEqual(defaultFasteners)
  })
  it('предупреждение о ручном отверстии у края', async () => {
    const c: FastenerConfig = { ...defaultFasteners, magnets: { mode: 'manual', manual: [{ x: 40, y: 0 }] } }
    render(<Harness start={c} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Magnet hole 1 is closer than 0.8 mm to the edge')
  })
  it('русская локаль', async () => {
    await i18n.changeLanguage('ru')
    render(<Harness />)
    expect(screen.getByText('Крепёж')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Магниты: Расстановка' })).toBeInTheDocument()
  })
})

describe('PlacementEditor', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  const start = (kind: 'magnets' | 'screws' = 'magnets', mode: 'manual' | 'full' = 'manual', manual: { x: number; y: number }[] = []): FastenerConfig =>
    ({ ...defaultFasteners, [kind]: { mode, manual } })

  it('клик по точке привязки добавляет отверстие', async () => {
    render(<Harness start={start()} />)
    expect(screen.queryAllByTestId('hole')).toHaveLength(0)
    fireEvent.pointerDown(screen.getAllByTestId('snap')[0])
    expect(screen.getAllByTestId('hole')).toHaveLength(1)
    expect(latest.magnets.manual).toHaveLength(1)
    expect(screen.getAllByTestId('snap')).toHaveLength(15) // занятая точка скрыта
  })
  it('клик по отверстию убирает его', () => {
    render(<Harness start={start('magnets', 'manual', [{ x: -8, y: -8 }])} />)
    const hole = screen.getByTestId('hole')
    fireEvent.pointerDown(hole); fireEvent.pointerUp(hole)
    expect(latest.magnets.manual).toEqual([])
  })
  it('перетаскивание двигает отверстие с привязкой к ближайшей точке', () => {
    render(<Harness start={start('magnets', 'manual', [{ x: -8, y: -8 }])} />)
    mockRect(screen.getByTestId('placement-svg'))
    const hole = screen.getByTestId('hole')
    fireEvent.pointerDown(hole)
    // центр габарита 84×84 → (42,42) мм от угла; цель (8,8) мм от угла = модель (-34,-34); SVG Y вниз
    fireEvent.pointerMove(hole, { clientX: 8 + 6 + 0.5, clientY: 96 - (8 + 6) - 0.5 })
    fireEvent.pointerUp(hole)
    expect(latest.magnets.manual[0].x).toBeCloseTo(-34, 6)
    expect(latest.magnets.manual[0].y).toBeCloseTo(-34, 6)
  })
  it('координаты в списке задаются от угла габарита', async () => {
    render(<Harness start={start('magnets', 'manual', [{ x: -8, y: -8 }])} />)
    const x = screen.getByLabelText('Hole 1 X')
    expect(x).toHaveValue('34') // -8 + 42
    await userEvent.clear(x); await userEvent.type(x, '10'); await userEvent.tab()
    expect(latest.magnets.manual[0].x).toBeCloseTo(-32, 6)
    expect(latest.magnets.manual[0].y).toBeCloseTo(-8, 6)
  })
  it('удаление из списка и кнопка «Add hole»', async () => {
    render(<Harness start={start('magnets', 'manual', [{ x: -8, y: -8 }, { x: 8, y: 8 }])} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove hole 1' }))
    expect(latest.magnets.manual).toEqual([{ x: 8, y: 8 }])
    await userEvent.click(screen.getByRole('button', { name: 'Add hole' }))
    expect(latest.magnets.manual).toHaveLength(2)
  })
  it('Full → Manual сохраняет все стандартные отверстия редактируемыми', async () => {
    render(<Harness start={start('magnets', 'full')} />)
    expect(screen.queryByTestId('placement-svg')).toBeNull()
    await pick(/Magnets: Placement/, 'Manual')
    expect(latest.magnets.manual).toHaveLength(16)
    expect(screen.getAllByTestId('hole')).toHaveLength(16)
    expect(screen.queryAllByTestId('snap')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Remove hole 1' }))
    expect(latest.magnets.manual).toHaveLength(15)
  })
  it('когда ручные оба вида, переключатель выбирает редактируемый', async () => {
    const c: FastenerConfig = { ...defaultFasteners, magnets: { mode: 'manual', manual: [{ x: -8, y: -8 }] }, screws: { mode: 'manual', manual: [] } }
    render(<Harness start={c} />)
    await userEvent.click(screen.getByRole('button', { name: 'Screws' }))
    fireEvent.pointerDown(screen.getAllByTestId('snap')[0])
    expect(latest.screws.manual).toHaveLength(1)
    expect(latest.magnets.manual).toHaveLength(1)
  })
})
