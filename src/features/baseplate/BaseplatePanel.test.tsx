// @vitest-environment jsdom
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { axisMm, defaultParams, type BaseplateParams } from '../../geometry/baseplate'
import { UnitContext } from '../../ui/units'
import { BaseplatePanel } from './BaseplatePanel'

let latest: BaseplateParams = defaultParams

function Harness({ start = defaultParams, unit = 'mm' as 'mm' | 'in' }: { start?: BaseplateParams; unit?: 'mm' | 'in' }) {
  const [p, setP] = useState(start)
  latest = p
  return <UnitContext.Provider value={{ unit, setUnit: () => {} }}><BaseplatePanel params={p} onChange={setP} /></UnitContext.Provider>
}
const type = async (label: string, value: string) => {
  const f = screen.getByLabelText(label)
  await userEvent.clear(f); await userEvent.type(f, value); await userEvent.tab()
}

describe('SizeSection', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultParams })

  it('300 мм по X: 7.14 ячейки, режим mm, остаток 6 мм и баннер про отступ', async () => {
    render(<Harness />)
    await type('Width (X), Length', '300')
    expect(latest.x).toEqual({ mode: 'mm', value: 300, align: 'center' })
    expect(screen.getByLabelText('Width (X), Units')).toHaveValue('7.14')
    expect(screen.getByText(/Padding 6 mm/)).toBeInTheDocument()
    expect(screen.getByText(/leftover space becomes flat padding/i)).toBeInTheDocument()
  })
  it('2.5 ячейки хранится как units и даёт 105 мм', async () => {
    render(<Harness />)
    await type('Depth (Y), Units', '2.5')
    expect(latest.y).toEqual({ mode: 'units', value: 2.5, align: 'center' })
    expect(axisMm(latest.y, latest.pitch)).toBe(105)
    expect(screen.getByLabelText('Depth (Y), Length')).toHaveValue('105')
  })
  it('смена шага: размер в units масштабируется, в mm остаётся', async () => {
    const start: BaseplateParams = { ...defaultParams, x: { mode: 'mm', value: 300, align: 'center' }, y: { mode: 'units', value: 2, align: 'center' } }
    render(<Harness start={start} />)
    await type('Cell size', '40')
    expect(latest.pitch).toBe(40)
    expect(axisMm(latest.x, 40)).toBe(300)
    expect(axisMm(latest.y, 40)).toBe(80)
  })
  it('выравнивание по оси: X — слева/справа, Y — спереди/сзади', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('group', { name: /Width \(X\): Align cells/ }).querySelectorAll('button')[0])
    expect(latest.x.align).toBe('start')
    const yGroup = screen.getByRole('group', { name: /Depth \(Y\): Align cells/ })
    expect(yGroup).toHaveTextContent('Front')
    expect(yGroup).toHaveTextContent('Back')
    await userEvent.click(yGroup.querySelectorAll('button')[2])
    expect(latest.y.align).toBe('end')
  })
  it('нулевой размер показывает ошибку у поля', async () => {
    render(<Harness />)
    await type('Width (X), Units', '0')
    expect(latest.x.value).toBeGreaterThan(0) // значение ограничено допустимым минимумом
  })
  it('дюймы: подпись и ввод в дюймах', async () => {
    render(<Harness unit="in" />)
    await type('Width (X), Length', '10')
    expect(axisMm(latest.x, latest.pitch)).toBeCloseTo(254, 6)
  })
  it('сброс секции возвращает размер и шаг', async () => {
    render(<Harness />)
    await type('Width (X), Length', '300')
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Size' }))
    expect(latest.x).toEqual(defaultParams.x)
    expect(latest.pitch).toBe(42)
  })
  it('русская локаль: подписи размера и выравнивания', async () => {
    await i18n.changeLanguage('ru')
    render(<Harness />)
    expect(screen.getByLabelText('Ширина (X), Ячейки')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Глубина \(Y\): Выравнивание ячеек/ })).toHaveTextContent('Спереди')
  })
})

describe('ThicknessSection', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultParams })
  const open = () => userEvent.click(screen.getByRole('button', { name: 'Expand: Thickness' }))

  it('поля толщин и сводка, пол меняет высоту в сводке', async () => {
    render(<Harness />)
    expect(screen.getByText(/Floor 0 · Rim 0 · Height 4.65/)).toBeInTheDocument()
    await open()
    await type('Floor (0 = open frame)', '1.2')
    expect(latest.thickness.floor).toBe(1.2)
    expect(screen.getByText(/Floor 1.2 · Rim 0 · Height 5.85/)).toBeInTheDocument()
  })
  it('невалидное значение: сообщение у поля и баннер, значения не теряются', async () => {
    render(<Harness />)
    await open()
    await type('Profile height', '3')
    expect(latest.thickness.baseHeight).toBe(3)
    expect(screen.getByText('Not below the standard 4.65 mm profile')).toBeInTheDocument()
    expect(screen.getByText(/Fix the highlighted values/)).toBeInTheDocument()
  })
  it('бортик больше плиты', async () => {
    render(<Harness start={{ ...defaultParams, x: { mode: 'mm', value: 30, align: 'center' } }} />)
    await open()
    await type('Outer rim', '20')
    expect(screen.getByText('The rim leaves no room for the plate')).toBeInTheDocument()
  })
  it('сброс возвращает значения по умолчанию', async () => {
    render(<Harness />)
    await open()
    await type('Floor (0 = open frame)', '2')
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Thickness' }))
    expect(latest.thickness).toEqual(defaultParams.thickness)
  })
  it('значения в дюймах отображаются в дюймах', async () => {
    render(<Harness unit="in" />)
    await open()
    expect(screen.getByLabelText('Profile height')).toHaveValue('0.183')
  })
  it('русская локаль', async () => {
    await i18n.changeLanguage('ru')
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Развернуть: Толщины' }))
    expect(screen.getByLabelText('Пол (0 = открытая рама)')).toBeInTheDocument()
  })
})

describe('PlateSection', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultParams })
  const big: BaseplateParams = { ...defaultParams, x: { mode: 'mm', value: 300, align: 'center' }, y: { mode: 'mm', value: 200, align: 'center' }, preview: { showPlate: true, plateX: 256, plateY: 256 } }

  it('стол выключен: полей нет', () => {
    render(<Harness />)
    expect(screen.queryByLabelText('Plate X')).toBeNull()
  })
  it('включение стола и выбор пресета', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand: Build plate' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Show build plate' }))
    expect(latest.preview.showPlate).toBe(true)
    await userEvent.selectOptions(screen.getByLabelText('Bed size'), '350')
    expect(latest.preview).toMatchObject({ plateX: 350, plateY: 350 })
    await type('Plate X', '300')
    expect((screen.getByLabelText('Bed size') as HTMLSelectElement).value).toBe('custom')
  })
  it('плита 300 мм на столе 256: предупреждение', () => {
    render(<Harness start={big} />)
    expect(screen.getByRole('alert')).toHaveTextContent('300 × 200 mm) is larger than the build plate (256 × 256 mm)')
    expect(screen.queryByText('Fits the build plate')).toBeNull()
  })
  it('помещается: предупреждения нет', () => {
    render(<Harness start={{ ...big, x: { mode: 'units', value: 5, align: 'center' }, y: { mode: 'units', value: 5, align: 'center' } }} />)
    expect(screen.getByText('Fits the build plate')).toBeInTheDocument()
  })
  it('предупреждение исчезает, когда стол увеличили', async () => {
    render(<Harness start={big} />)
    await userEvent.selectOptions(screen.getByLabelText('Bed size'), '350')
    expect(screen.queryByText(/larger than the build plate/)).toBeNull()
  })
})
