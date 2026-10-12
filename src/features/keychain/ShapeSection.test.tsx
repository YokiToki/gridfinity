// @vitest-environment jsdom
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { openSection, renderOpen as render } from '../../ui/renderOpen'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { UnitContext } from '../../ui/units'
import { defaultShape, type ShapeParams } from '../../geometry/shapes'
import { ShapeSection } from './ShapeSection'
import { RimSection } from './RimSection'

let latest: ShapeParams = defaultShape
function Harness({ start = defaultShape, unit = 'mm' as 'mm' | 'in' }: { start?: ShapeParams; unit?: 'mm' | 'in' }) {
  const [s, setS] = useState(start)
  latest = s
  return (
    <I18nextProvider i18n={i18n}>
      <UnitContext.Provider value={{ unit, setUnit: () => {} }}>
        <ShapeSection value={s} error={() => undefined} onChange={(p) => setS((o) => ({ ...o, ...p }))} />
        <RimSection value={s.rim} error={() => undefined} onChange={(p) => setS((o) => ({ ...o, rim: { ...o.rim, ...p } }))} />
      </UnitContext.Provider>
    </I18nextProvider>
  )
}
const type = async (label: string, value: string) => {
  const f = screen.getByLabelText(label)
  await userEvent.clear(f); await userEvent.type(f, value); await userEvent.tab()
}
const kind = (name: string) => userEvent.click(screen.getByRole('radio', { name }))

describe('ShapeSection', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultShape })

  it('пять видов фигур в переключателе, выбранный отмечен', async () => {
    render(<Harness />)
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(['Rectangle', 'Circle', 'Ellipse', 'Capsule', 'Polygon'])
    expect(screen.getByRole('radio', { name: 'Rectangle' })).toHaveAttribute('aria-checked', 'true')
    await kind('Circle')
    expect(latest.kind).toBe('circle')
    expect(screen.getByRole('radio', { name: 'Circle' })).toHaveAttribute('aria-checked', 'true')
  })
  it('прямоугольник: ширина, высота и радиус; сторон и поворота нет', () => {
    render(<Harness />)
    for (const l of ['Width', 'Height', 'Corner radius']) expect(screen.getByLabelText(l)).toBeInTheDocument()
    expect(screen.queryByLabelText('Sides')).toBeNull()
    expect(screen.queryByLabelText('Diameter')).toBeNull()
  })
  it('круг: только диаметр', async () => {
    render(<Harness />)
    await kind('Circle')
    expect(screen.getByLabelText('Diameter')).toBeInTheDocument()
    for (const l of ['Height', 'Corner radius', 'Sides', 'Rotation, °']) expect(screen.queryByLabelText(l)).toBeNull()
    await type('Diameter', '40')
    expect(latest.width).toBe(40)
  })
  it.each(['Ellipse', 'Capsule'])('%s: ширина и высота, без радиуса', async (name) => {
    render(<Harness />)
    await kind(name)
    expect(screen.getByLabelText('Width')).toBeInTheDocument()
    expect(screen.getByLabelText('Height')).toBeInTheDocument()
    expect(screen.queryByLabelText('Corner radius')).toBeNull()
    expect(screen.queryByLabelText('Sides')).toBeNull()
  })
  it('многоугольник: ширина между вершинами, радиус, стороны и поворот; высоты нет', async () => {
    render(<Harness />)
    await kind('Polygon')
    for (const l of ['Width across corners', 'Corner radius', 'Sides', 'Rotation, °']) expect(screen.getByLabelText(l), l).toBeInTheDocument()
    expect(screen.queryByLabelText('Height')).toBeNull()
    await type('Sides', '8')
    expect(latest.sides).toBe(8)
    await type('Sides', '40')
    expect(latest.sides).toBe(12) // зажато в 3…12
    await type('Rotation, °', '30')
    expect(latest.rotation).toBe(30)
  })
  it('радиус больше половины меньшей стороны: показано действующее значение', async () => {
    render(<Harness />)
    expect(screen.queryByTestId('effective-radius')).toBeNull()
    await type('Corner radius', '40')
    expect(latest.radius).toBe(40)
    expect(screen.getByTestId('effective-radius')).toHaveTextContent('Effective radius: 15 mm')
  })
  it('готовый размер заполняет поля', async () => {
    render(<Harness />)
    await userEvent.selectOptions(screen.getByLabelText('Size preset'), 'round')
    expect(latest).toMatchObject({ kind: 'circle', width: 40 })
    await userEvent.selectOptions(screen.getByLabelText('Size preset'), 'wide')
    expect(latest).toMatchObject({ kind: 'rect', width: 70, height: 25 })
    await userEvent.selectOptions(screen.getByLabelText('Size preset'), 'idTag')
    expect(latest).toMatchObject({ kind: 'rect', width: 54, height: 30, radius: 4 })
  })
  it('размеры в дюймах: ввод 2 in даёт 50.8 мм', async () => {
    render(<Harness unit="in" />)
    await type('Width', '2')
    expect(latest.width).toBeCloseTo(50.8, 6)
  })
  it('сброс возвращает фигуру по умолчанию и не трогает бортик', async () => {
    render(<Harness start={{ ...defaultShape, kind: 'capsule', width: 90, rim: { enabled: true, width: 2, height: 1 } }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Shape' }))
    expect(latest).toMatchObject({ kind: 'rect', width: 54, height: 30 })
    expect(latest.rim).toEqual({ enabled: true, width: 2, height: 1 })
  })
})

describe('RimSection', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultShape })
  const open = () => openSection('Rim')

  it('выключен: полей ширины и высоты нет; включение показывает их', async () => {
    render(<Harness />)
    await open()
    expect(screen.queryByLabelText('Rim width')).toBeNull()
    await userEvent.click(screen.getByRole('switch', { name: 'Raised rim along the edge' }))
    expect(latest.rim.enabled).toBe(true)
    expect(screen.getByLabelText('Rim width')).toBeInTheDocument()
    expect(screen.getByLabelText('Rim height')).toBeInTheDocument()
    await type('Rim width', '1.5')
    await type('Rim height', '0.6')
    expect(latest.rim).toMatchObject({ enabled: true, width: 1.5, height: 0.6 })
  })
  it('сводка: «Выкл.» или размеры', async () => {
    render(<Harness start={{ ...defaultShape, rim: { enabled: true, width: 1.2, height: 0.8 } }} />)
    expect(screen.getByText('1.2 × 0.8 mm')).toBeInTheDocument()
  })
})
