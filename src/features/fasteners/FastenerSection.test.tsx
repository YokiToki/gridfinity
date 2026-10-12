// @vitest-environment jsdom
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { openSection, renderOpen as render } from '../../ui/renderOpen'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { defaultFasteners, type FastenerConfig, type Slot } from '../../geometry/fasteners'
import { footprintFromCells } from '../../geometry/footprint'
import { FastenerSection } from './FastenerSection'

const fp = footprintFromCells(2, 2, 42)
let latest: FastenerConfig = defaultFasteners

function Harness({ start = defaultFasteners }: { start?: FastenerConfig }) {
  const [c, setC] = useState(start)
  latest = c
  return <FastenerSection config={c} onChange={setC} footprint={fp} />
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
    await pick(/Magnets: Placement/, 'All cells')
    const d = screen.getByLabelText('Magnet Ø')
    await userEvent.clear(d); await userEvent.type(d, '7'); await userEvent.tab()
    expect(latest.magnetPreset).toBe('custom')
    expect(latest.magnetD).toBe(7)
  })
  it('режим Every cell для винтов: пресет M3 и головка', async () => {
    render(<Harness />)
    await pick(/Screws: Placement/, 'All cells')
    expect(screen.getByLabelText('Screw Ø')).toHaveValue('3')
    await userEvent.selectOptions(screen.getByLabelText('Screw head'), 'counterbore')
    expect(latest.screwHead).toBe('counterbore')
    expect(screen.getByLabelText('Head depth')).toBeInTheDocument()
  })
  it('режим Manual: показывает редактор', async () => {
    render(<Harness />)
    await pick(/Screws: Placement/, 'Manual')
    expect(screen.getByTestId('placement-svg')).toBeInTheDocument()
    expect(screen.getByText(/Nothing selected/)).toBeInTheDocument()
  })
  it('поле «Ear wall» появляется при включённом крепеже и меняет значение', async () => {
    render(<Harness />)
    expect(screen.queryByLabelText('Ear wall')).toBeNull()
    await pick(/Screws: Placement/, 'Corners')
    const f = screen.getByLabelText('Ear wall')
    expect(f).toHaveValue('1.2')
    await userEvent.clear(f); await userEvent.type(f, '2'); await userEvent.tab()
    expect(latest.earWall).toBe(2)
    await userEvent.clear(f); await userEvent.type(f, '9'); await userEvent.tab()
    expect(latest.earWall).toBe(4) // ограничение сверху
  })
  it('сброс секции возвращает значения по умолчанию', async () => {
    render(<Harness />)
    await pick(/Magnets: Placement/, 'Corners')
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Fasteners' }))
    expect(latest).toEqual(defaultFasteners)
  })
  it('предупреждение, что ухо не помещается в ячейку', async () => {
    const c: FastenerConfig = { ...defaultFasteners, magnets: { mode: 'full', slots: [] }, magnetD: 11, magnetPreset: 'custom' }
    render(<Harness start={c} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Magnet: the ear of the hole does not fit inside the cell')
  })
  it('русская локаль', async () => {
    await i18n.changeLanguage('ru')
    render(<Harness />)
    expect(screen.getByText('Крепёж')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Магниты: Расстановка' })).toBeInTheDocument()
  })
})

describe('PlacementEditor: выбор позиций', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  const start = (kind: 'magnets' | 'screws' = 'magnets', mode: 'manual' | 'full' | 'corner' = 'manual', slots: Slot[] = []): FastenerConfig =>
    ({ ...defaultFasteners, [kind]: { mode, slots } })
  const s = (i: number, j: number, sx: 1 | -1, sy: 1 | -1): Slot => ({ i, j, sx, sy })

  it('показывает все 16 позиций выключенными, отверстий нет, подсказка про пустой выбор', () => {
    render(<Harness start={start()} />)
    expect(screen.getAllByRole('switch')).toHaveLength(16)
    expect(screen.queryAllByTestId('hole')).toHaveLength(0)
    expect(screen.getByText(/Nothing selected/)).toBeInTheDocument()
  })
  it('клик по позиции включает её, повторный клик выключает', async () => {
    render(<Harness start={start()} />)
    const target = screen.getByRole('switch', { name: 'Cell 1,1, bottom left' })
    await userEvent.click(target)
    expect(latest.magnets.slots).toEqual([s(0, 0, -1, -1)])
    expect(screen.getByRole('switch', { name: 'Cell 1,1, bottom left' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getAllByTestId('hole')).toHaveLength(1)
    await userEvent.click(screen.getByRole('switch', { name: 'Cell 1,1, bottom left' }))
    expect(latest.magnets.slots).toEqual([])
  })
  it('с клавиатуры: Tab к позиции и Enter / пробел', async () => {
    render(<Harness start={start()} />)
    screen.getAllByRole('switch')[0].focus()
    await userEvent.keyboard('{Enter}')
    expect(latest.magnets.slots).toHaveLength(1)
    await userEvent.keyboard(' ')
    expect(latest.magnets.slots).toHaveLength(0)
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(latest.magnets.slots).toHaveLength(1)
  })
  it('нет произвольной расстановки: ни списка координат, ни кнопки «Add hole»', () => {
    render(<Harness start={start('magnets', 'manual', [s(0, 0, 1, 1)])} />)
    expect(screen.queryByRole('button', { name: 'Add hole' })).toBeNull()
    expect(screen.queryByLabelText(/Hole 1/)).toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
  })
  it('из Full, Corner и None переход в Manual даёт пустой выбор', async () => {
    for (const mode of ['full', 'corner'] as const) {
      const { unmount } = render(<Harness start={start('magnets', mode)} />)
      await pick(/Magnets: Placement/, 'Manual')
      expect(latest.magnets).toEqual({ mode: 'manual', slots: [] })
      expect(screen.queryAllByTestId('hole')).toHaveLength(0)
      unmount()
    }
    render(<Harness />)
    await pick(/Magnets: Placement/, 'Manual')
    expect(latest.magnets).toEqual({ mode: 'manual', slots: [] })
  })
  it('выбор сохраняется при уходе из Manual в Corner', async () => {
    render(<Harness start={start('magnets', 'manual', [s(1, 1, 1, 1)])} />)
    await pick(/Magnets: Placement/, 'Corners')
    expect(latest.magnets).toEqual({ mode: 'corner', slots: [s(1, 1, 1, 1)] })
  })
  it('сводка секции считает выбранные позиции', () => {
    render(<Harness start={start('magnets', 'manual', [s(0, 0, 1, 1), s(1, 1, 1, 1)])} />)
    expect(screen.getByText(/Magnets: 2 selected/)).toBeInTheDocument()
  })
  it('когда ручные оба вида, переключатель выбирает редактируемый', async () => {
    const c: FastenerConfig = { ...defaultFasteners, magnets: { mode: 'manual', slots: [s(0, 0, -1, -1)] }, screws: { mode: 'manual', slots: [] } }
    render(<Harness start={c} />)
    await userEvent.click(screen.getByRole('button', { name: 'Screws' }))
    await userEvent.click(screen.getAllByRole('switch')[3])
    expect(latest.screws.slots).toHaveLength(1)
    expect(latest.magnets.slots).toHaveLength(1)
  })
  it('русская локаль: подписи позиций', async () => {
    await i18n.changeLanguage('ru')
    render(<Harness start={start()} />)
    expect(screen.getByRole('switch', { name: 'Ячейка 1,1, левый низ' })).toBeInTheDocument()
  })
})
