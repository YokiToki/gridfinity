// @vitest-environment jsdom
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { boxHeightMm, boxLayout, defaultBox, equalDividers, type BoxParams } from '../../geometry/box'
import { loadPersisted } from '../../app/usePersistedState'
import { UnitContext } from '../../ui/units'
import { BoxPanel } from './BoxPanel'
import { expectAllNumericSteppers } from '../../ui/stepperAssert'
import { migrateBox } from './migrate'

let latest: BoxParams = defaultBox

function Harness({ start = defaultBox, unit = 'mm' as 'mm' | 'in' }: { start?: BoxParams; unit?: 'mm' | 'in' }) {
  const [p, setP] = useState(start)
  latest = p
  return <UnitContext.Provider value={{ unit, setUnit: () => {} }}><BoxPanel params={p} onChange={setP} /></UnitContext.Provider>
}
const type = async (label: string, value: string) => {
  const f = screen.getByLabelText(label)
  await userEvent.clear(f); await userEvent.type(f, value); await userEvent.tab()
}
const open = (name: string) => userEvent.click(screen.getByRole('button', { name: `Expand: ${name}` }))
const withGrid = (cols: number, rows: number, removed: string[] = []): BoxParams => {
  const l = boxLayout(defaultBox)
  return { ...defaultBox, compartments: { cols, rows, xDividers: equalDividers(cols, l.cavityX, 1.2), yDividers: equalDividers(rows, l.cavityY, 1.2), removed } }
}

describe('сохранение параметров', () => {
  beforeEach(() => localStorage.clear())
  it('круг «сохранить — загрузить» возвращает те же параметры', () => {
    const p = { ...withGrid(3, 2, ['x:0:0']), lip: 'thin' as const, scoop: { ...defaultBox.scoop, front: true, radius: 10 }, height: { mode: 'mm' as const, value: 30 } }
    localStorage.setItem('gridfinity.box', JSON.stringify(p))
    expect(loadPersisted('gridfinity.box', defaultBox, migrateBox)).toEqual(p)
  })
  it('пустое хранилище, битый JSON и частичные данные', () => {
    expect(loadPersisted('gridfinity.box', defaultBox, migrateBox)).toEqual(defaultBox)
    localStorage.setItem('gridfinity.box', '{bad')
    expect(loadPersisted('gridfinity.box', defaultBox, migrateBox)).toEqual(defaultBox)
    localStorage.setItem('gridfinity.box', JSON.stringify({ lip: 'none', thickness: { floor: 1 }, compartments: { xDividers: [0.5, 'x'] } }))
    const p = loadPersisted('gridfinity.box', defaultBox, migrateBox)
    expect(p.lip).toBe('none')
    expect(p.thickness).toEqual({ ...defaultBox.thickness, floor: 1 })
    expect(p.compartments.xDividers).toEqual([0.5])
    expect(p.scoop).toEqual(defaultBox.scoop)
    localStorage.setItem('gridfinity.box', JSON.stringify({ fasteners: { magnets: { mode: 'full' } } }))
    expect(loadPersisted('gridfinity.box', defaultBox, migrateBox).fasteners.screws).toEqual({ mode: 'none', slots: [] })
  })
})

describe('BoxPanel: размер и высота', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultBox })
  it('сводка по умолчанию 2 × 2 × 3', () => {
    render(<Harness />)
    expect(screen.getByText('84 × 84 × 3 u')).toBeInTheDocument()
  })
  it('высота в единицах и в мм синхронны', async () => {
    render(<Harness />)
    await type('Height, units', '4')
    expect(latest.height).toEqual({ mode: 'units', value: 4 })
    expect(screen.getByLabelText('Height, length')).toHaveValue('28')
    await type('Height, length', '30')
    expect(latest.height).toEqual({ mode: 'mm', value: 30 })
    expect(boxHeightMm(latest.height)).toBe(30)
    expect(screen.getByLabelText('Height, units')).toHaveValue('4.29')
  })
  it('дробный размер 100 мм: 2.38 ячейки', async () => {
    render(<Harness />)
    await type('Width (X), Length', '100')
    expect(latest.x).toEqual({ mode: 'mm', value: 100, align: 'center' })
    expect(screen.getByLabelText('Width (X), Units')).toHaveValue('2.38')
    expect(screen.getByText(/Padding 16 mm/)).toBeInTheDocument()
  })
  it('ограничение: меньше одной ячейки не вводится', async () => {
    render(<Harness />)
    await type('Width (X), Length', '10')
    expect(latest.x.value).toBeGreaterThanOrEqual(42)
  })
  it('сброс секции', async () => {
    render(<Harness />)
    await type('Height, units', '5')
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Size' }))
    expect(latest.height).toEqual({ mode: 'units', value: 3 })
  })
})

describe('BoxPanel: стенки, губа, скругление', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultBox })
  it('толщины: значения, сводка, ошибка «нет полости» у поля', async () => {
    render(<Harness />)
    await open('Walls and floor')
    expect(screen.getByLabelText('Outer wall')).toHaveValue('0.95')
    await type('Outer wall', '2.4')
    expect(latest.thickness.outerWall).toBe(2.4)
    expect(screen.getByText(/Wall 2.4 mm · Floor 0.7 mm/)).toBeInTheDocument()
    await type('Floor', '17')
    expect(screen.getByText('Walls, floor and height leave no room inside')).toBeInTheDocument()
    expect(screen.getByText(/Fix the highlighted values/)).toBeInTheDocument()
  })
  it('губа: три стиля и пояснение зачем она', async () => {
    render(<Harness />)
    await open('Lip')
    expect(screen.getByText(/mates with the foot of a bin stacked above/)).toBeInTheDocument()
    const lip = within(screen.getByRole('group', { name: 'Lip style' }))
    await userEvent.click(lip.getByRole('button', { name: 'Thin' }))
    expect(latest.lip).toBe('thin')
    await userEvent.click(lip.getByRole('button', { name: 'None' }))
    expect(latest.lip).toBe('none')
    expect(screen.getByText('None lip')).toBeInTheDocument()
  })
  it('скругление: стороны и радиус, сообщение об ограничении', async () => {
    render(<Harness start={{ ...defaultBox, height: { mode: 'units', value: 2 } }} />)
    await open('Scoop')
    expect(screen.getByText('Off')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: 'Front' }))
    expect(latest.scoop.front).toBe(true)
    await type('Radius', '50')
    expect(latest.scoop.radius).toBe(50)
    expect(screen.getByText(/limited to 8.55 mm by the cavity depth/)).toBeInTheDocument()
    expect(screen.getByText(/R 50 mm · Front/)).toBeInTheDocument()
  })
})

describe('BoxPanel: отсеки', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultBox })

  it('сетка 3 × 2: две вертикальные и одна горизонтальная перегородка, шесть отсеков', async () => {
    render(<Harness />)
    await open('Compartments')
    await type('Columns', '3')
    await type('Rows', '2')
    expect(latest.compartments.xDividers).toHaveLength(2)
    expect(latest.compartments.yDividers).toHaveLength(1)
    expect(screen.getByText('6 compartments')).toBeInTheDocument()
    expect(screen.getAllByTestId('segment')).toHaveLength(2 * 2 + 1 * 3)
    const l = boxLayout(defaultBox)
    expect(latest.compartments.xDividers).toEqual(equalDividers(3, l.cavityX, 1.2))
  })
  it('слияние: клик по участку перегородки убирает её, повторный клик возвращает', async () => {
    render(<Harness start={withGrid(3, 2)} />)
    await open('Compartments')
    const seg = screen.getByRole('button', { name: 'Divider X1, 1' })
    await userEvent.click(seg)
    expect(latest.compartments.removed).toEqual(['x:0:0'])
    expect(screen.getByText('5 compartments')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Divider X1, 1' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Divider X1, 1' }))
    expect(latest.compartments.removed).toEqual([])
  })
  it('участок перегородки доступен с клавиатуры', async () => {
    render(<Harness start={withGrid(2, 1)} />)
    await open('Compartments')
    screen.getByRole('button', { name: 'Divider X1, 1' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(latest.compartments.removed).toEqual(['x:0:0'])
  })
  it('перетаскивание ручки сдвигает перегородку, соседи ограничивают её', async () => {
    render(<Harness start={withGrid(3, 1)} />)
    await open('Compartments')
    const svg = screen.getByTestId('compartment-svg')
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    const handle = screen.getAllByTestId('handle-x')[0]
    fireEvent.pointerDown(handle)
    fireEvent.pointerMove(svg, { clientX: 20, clientY: 50 })
    expect(latest.compartments.xDividers[0]).toBeCloseTo(0.1, 6)
    fireEvent.pointerMove(svg, { clientX: 190, clientY: 50 }) // далеко за вторую перегородку
    expect(latest.compartments.xDividers[0]).toBeLessThan(latest.compartments.xDividers[1])
    fireEvent.pointerUp(svg)
    fireEvent.pointerMove(svg, { clientX: 100, clientY: 50 })
    expect(latest.compartments.xDividers[0]).toBeLessThan(0.7) // после отпускания не двигается
  })
  it('перетаскивание перегородки по Y и сохранение убранных участков', async () => {
    render(<Harness start={withGrid(2, 2, ['x:0:1'])} />)
    await open('Compartments')
    const svg = screen.getByTestId('compartment-svg')
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    fireEvent.pointerDown(screen.getByTestId('handle-y'))
    fireEvent.pointerMove(svg, { clientX: 50, clientY: 75 }) // y вниз → fraction 0.25
    expect(latest.compartments.yDividers[0]).toBeCloseTo(0.25, 6)
    expect(latest.compartments.removed).toEqual(['x:0:1'])
  })
  it('ручки двигаются стрелками', async () => {
    render(<Harness start={withGrid(2, 1)} />)
    await open('Compartments')
    const before = latest.compartments.xDividers[0]
    screen.getByTestId('handle-x').focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(latest.compartments.xDividers[0]).toBeGreaterThan(before)
  })
  it('«Поровну» возвращает равное деление и очищает слияния', async () => {
    render(<Harness start={{ ...withGrid(3, 1, ['x:0:0']), compartments: { ...withGrid(3, 1, ['x:0:0']).compartments, xDividers: [0.2, 0.8] } }} />)
    await open('Compartments')
    await userEvent.click(screen.getByRole('button', { name: 'Equal division' }))
    expect(latest.compartments.xDividers).toEqual(equalDividers(3, boxLayout(defaultBox).cavityX, 1.2))
    expect(latest.compartments.removed).toEqual([])
  })
  it('узкий отсек: предупреждение с шириной', async () => {
    render(<Harness start={withGrid(8, 1)} />)
    await open('Compartments')
    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toMatch(/Compartment X1 is only .* wide after the dividers/)
  })
  it('крепёж: секция есть и режимы работают', async () => {
    render(<Harness />)
    await userEvent.click(within(screen.getByRole('group', { name: /Magnets: Placement/ })).getByRole('button', { name: 'All cells' }))
    expect(latest.fasteners.magnets.mode).toBe('full')
  })
  it('русская локаль', async () => {
    await i18n.changeLanguage('ru')
    render(<Harness />)
    expect(screen.getByLabelText('Высота, единицы')).toBeInTheDocument()
    expect(screen.getByText('Стенки и пол')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Развернуть: Губа' }))
    expect(screen.getByText(/Губа — кромка сверху коробки/)).toBeInTheDocument()
  })
})

describe('кнопки +/−', () => {
  it('у каждого числового поля панели есть обе кнопки', async () => {
    await i18n.changeLanguage('en')
    render(<Harness />)
    await expectAllNumericSteppers()
  })
})
