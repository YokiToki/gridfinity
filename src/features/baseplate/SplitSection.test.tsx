// @vitest-environment jsdom
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { defaultParams, type BaseplateParams } from '../../geometry/baseplate'
import { defaultSplitSettings } from '../../geometry/split'
import { defaultConnector } from '../../geometry/connectors'
import { result } from '../../geometry/testing'
import { UnitContext } from '../../ui/units'
import { BaseplatePanel } from './BaseplatePanel'

let latest: BaseplateParams = defaultParams

const big = (over: Partial<BaseplateParams['split']> = {}): BaseplateParams => ({
  ...defaultParams,
  x: { mode: 'mm', value: 300, align: 'center' }, y: { mode: 'mm', value: 200, align: 'center' },
  preview: { showPlate: true, plateX: 256, plateY: 256 },
  split: { ...defaultSplitSettings, enabled: true, ...over },
})

function Harness({ start = big() }: { start?: BaseplateParams }) {
  const [p, setP] = useState(start)
  latest = p
  return <UnitContext.Provider value={{ unit: 'mm', setUnit: () => {} }}><BaseplatePanel params={p} onChange={setP} /></UnitContext.Provider>
}

describe('SplitSection', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultParams })

  it('выключено: показывает только переключатель, в сводке «Off»', () => {
    render(<Harness start={{ ...big(), split: defaultSplitSettings }} />)
    expect(screen.getByText('Off')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Parts' })).toBeNull()
  })
  it('включение разделения: плита 300×200 на столе 256 даёт две части с размерами', async () => {
    render(<Harness start={{ ...big(), split: defaultSplitSettings }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand: Split to fit bed' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Split into parts' }))
    expect(latest.split.enabled).toBe(true)
    const list = screen.getByRole('list', { name: 'Parts' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((i) => i.querySelector('b')?.textContent)).toEqual(['A1', 'B1'])
    expect(items[0]).toHaveTextContent('4 × 4 cells')
    expect(items[0]).toHaveTextContent('171 mm × 200 mm')
    expect(screen.getByText('All parts fit the bed')).toBeInTheDocument()
    expect(screen.getByText('2 parts')).toBeInTheDocument()
  })
  it('источник размера стола: из превью, пресет и свои значения (редактируемые)', async () => {
    render(<Harness />)
    expect(screen.getByLabelText('Bed width')).toHaveValue('256')
    await userEvent.selectOptions(screen.getByLabelText('Printer bed'), '180')
    expect(latest.split).toMatchObject({ source: 'custom', bedX: 180, bedY: 180 })
    // 180 − 2·5 = 170: части 3 × 4 ячейки по X (3 + ...)
    expect(within(screen.getByRole('list', { name: 'Parts' })).getAllByRole('listitem').length).toBeGreaterThan(2)
    const w = screen.getByLabelText('Bed width')
    await userEvent.clear(w); await userEvent.type(w, '400'); await userEvent.tab()
    expect(latest.split.bedX).toBe(400)
    expect((screen.getByLabelText('Printer bed') as HTMLSelectElement).value).toBe('custom')
    await userEvent.selectOptions(screen.getByLabelText('Printer bed'), 'plate')
    expect(latest.split.source).toBe('plate')
  })
  it('отступ от краёв уменьшает объём печати', async () => {
    render(<Harness start={big({ margin: 0 })} />)
    expect(screen.getByText('2 parts')).toBeInTheDocument()
    const m = screen.getByLabelText('Edge margin')
    await userEvent.clear(m); await userEvent.type(m, '40'); await userEvent.tab()
    expect(latest.split.margin).toBe(40)
  })
  it('ручные разрезы: старт с автоматических, добавление, перенос и удаление', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Manual cuts' }))
    expect(latest.split.auto).toBe(false)
    expect(latest.split.xCuts).toEqual([4])
    expect(screen.getByText(/171 mm from the edge/)).toBeInTheDocument() // 3 + 4·42
    await userEvent.click(screen.getByRole('button', { name: 'Increase: Cut 1, before cell (X)' }))
    expect(latest.split.xCuts).toEqual([5])
    await userEvent.click(screen.getByRole('button', { name: 'Add cut (Y)' }))
    expect(latest.split.yCuts).toEqual([1])
    await userEvent.click(screen.getByRole('button', { name: 'Remove cut 1 (Y)' }))
    expect(latest.split.yCuts).toEqual([])
    await userEvent.click(screen.getByRole('button', { name: 'Automatic' }))
    expect(latest.split.auto).toBe(true)
  })
  it('часть больше стола подсвечивается и предупреждает, экспорт не блокируется', async () => {
    render(<Harness start={big({ auto: false, xCuts: [1] })} />)
    const items = within(screen.getByRole('list', { name: 'Parts' })).getAllByRole('listitem')
    expect(items[0]).not.toHaveAttribute('data-oversize')
    expect(items[1]).toHaveAttribute('data-oversize', 'true')
    expect(items[1]).toHaveTextContent('Larger than the bed')
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toContain('1 part(s) exceed the bed')
    expect(screen.queryByText('All parts fit the bed')).toBeNull()
  })
  it('одна ячейка больше стола: ошибка', async () => {
    render(<Harness start={big({ source: 'custom', bedX: 50, bedY: 50, margin: 10 })} />)
    expect(screen.getByText(/A single cell does not fit the bed/)).toBeInTheDocument()
  })
  it('плита помещается: одна часть и пояснение', () => {
    render(<Harness start={{ ...big(), x: { mode: 'units', value: 2, align: 'center' }, y: { mode: 'units', value: 2, align: 'center' } }} />)
    expect(screen.getByText(/One part: the plate already fits the bed/)).toBeInTheDocument()
    expect(screen.queryByText('Show parts separated')).toBeNull()
  })
  it('разнесённый вид и зазор', async () => {
    render(<Harness />)
    expect(latest.split.exploded).toBe(true)
    const gap = screen.getByLabelText('Gap between parts')
    await userEvent.clear(gap); await userEvent.type(gap, '25'); await userEvent.tab()
    expect(latest.split.gap).toBe(25)
    await userEvent.click(screen.getByRole('switch', { name: 'Show parts separated' }))
    expect(latest.split.exploded).toBe(false)
    expect(screen.queryByLabelText('Gap between parts')).toBeNull()
  })
  it('русская локаль', async () => {
    await i18n.changeLanguage('ru')
    render(<Harness />)
    expect(screen.getByRole('switch', { name: 'Разделить на части' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Части' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Разрезы' })).getByRole('button', { name: 'Вручную' })).toBeInTheDocument()
  })
})

describe('ConnectorsSection', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultParams })

  it('скрыта без разделения и при одной части', () => {
    render(<Harness start={{ ...big(), split: defaultSplitSettings }} />)
    expect(screen.queryByRole('button', { name: /Connectors/ })).toBeNull()
    expect(screen.queryByText('Connectors')).toBeNull()
  })
  const expand = () => userEvent.click(screen.getByRole('button', { name: 'Expand: Connectors' }))

  it('тип соединителя меняет настройки, отверстия: пресет и размеры', async () => {
    render(<Harness />)
    await expand()
    await userEvent.click(screen.getByRole('button', { name: 'End-face holes' }))
    expect(latest.split.connector.type).toBe('holes')
    expect(screen.getByLabelText('Hole Ø')).toHaveValue('1.9')
    expect((screen.getByLabelText('Hole preset') as HTMLSelectElement).value).toBe('filament')
    await userEvent.selectOptions(screen.getByLabelText('Hole preset'), 'pin3')
    expect(latest.split.connector).toMatchObject({ preset: 'pin3', diameter: 3.1 })
    const c = screen.getByLabelText('Per edge')
    await userEvent.clear(c); await userEvent.type(c, '3'); await userEvent.tab()
    expect(latest.split.connector.count).toBe(3)
  })
  it('отверстие шире ребра: предупреждение', async () => {
    render(<Harness start={big({ connector: { ...defaultConnector, type: 'holes', preset: 'custom', diameter: 6 } })} />)
    expect(screen.getByRole('group', { name: 'Connector warnings' })).toHaveTextContent('the hole is wider than the rib')
  })
  it('пресеты: пруток, штифты, два магнита; M3 и 6×2 нет', async () => {
    render(<Harness start={big({ connector: { ...defaultConnector, type: 'holes' } })} />)
    const options = [...(screen.getByLabelText('Hole preset') as HTMLSelectElement).options].map((o) => o.textContent)
    expect(options).toEqual(['1.75 mm filament', '2 mm pin', '3 mm pin', '3 × 2 mm magnet', '2.8 × 0.75 mm magnet', 'Custom'])
    await userEvent.selectOptions(screen.getByLabelText('Hole preset'), 'magnet2_8x0_75')
    expect(latest.split.connector).toMatchObject({ diameter: 2.95, depth: 0.85 })
    expect(screen.getByText('Effective depth: 0.85 mm')).toBeInTheDocument()
  })
  it('реальная глубина показывается; ограничение длиной части отмечено', async () => {
    render(<Harness start={big({ connector: { ...defaultConnector, type: 'holes', depth: 500 } })} />)
    expect(screen.getByText(/Effective depth: .* \(limited by the part length\)/)).toBeInTheDocument()
  })
  it('торец без рёбер: сообщение, что отверстий нет', async () => {
    const one: BaseplateParams = { ...big({ connector: { ...defaultConnector, type: 'holes' } }), y: { mode: 'units', value: 1, align: 'center' } }
    render(<Harness start={one} />)
    expect(screen.getByRole('group', { name: 'Connector warnings' })).toHaveTextContent('no rib ends on this face')
  })
  it('ласточкин хвост: поля размеров и зазор', async () => {
    render(<Harness />)
    await expand()
    await userEvent.click(screen.getByRole('button', { name: 'Dovetail' }))
    expect(latest.split.connector.type).toBe('dovetail')
    expect(screen.getByLabelText('Fit clearance')).toHaveValue('0.2')
    expect(screen.getByLabelText('Neck width')).toBeInTheDocument()
    expect(screen.getByLabelText('Key height')).toHaveValue('2')
    expect(screen.queryByLabelText('Hole Ø')).toBeNull()
  })
  it('тип на отдельном разрезе переопределяется', async () => {
    render(<Harness start={big({ auto: false, xCuts: [2, 5], connector: { ...defaultConnector, type: 'holes' } })} />)
    const sel = screen.getByLabelText(/Cut X2 \(A1–B1\)/)
    await userEvent.selectOptions(sel, 'none')
    expect(latest.split.connector.overrides).toEqual({ 'x:2': 'none' })
    await userEvent.selectOptions(sel, '')
    expect(latest.split.connector.overrides).toEqual({})
  })
  it('сброс секции возвращает значения по умолчанию', async () => {
    render(<Harness start={big({ connector: { ...defaultConnector, type: 'dovetail', count: 4 } })} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Connectors' }))
    expect(latest.split.connector).toEqual(defaultConnector)
  })
})
