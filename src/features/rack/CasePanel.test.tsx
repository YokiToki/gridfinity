// @vitest-environment jsdom
import { useState } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { UnitContext } from '../../ui/units'
import { openSection } from '../../ui/renderOpen'
import { expectAllNumericSteppers } from '../../ui/stepperAssert'
import { defaultRackCase, type RackCaseParams } from '../../geometry/rack/case'
import { CasePanel } from './CasePanel'

let latest: RackCaseParams = defaultRackCase
function Harness({ start = defaultRackCase }: { start?: RackCaseParams }) {
  const [p, setP] = useState(start)
  latest = p
  return <I18nextProvider i18n={i18n}><UnitContext.Provider value={{ unit: 'mm', setUnit: () => {} }}><CasePanel params={p} onChange={setP} /></UnitContext.Provider></I18nextProvider>
}
const sections = () => screen.queryAllByRole('button', { name: /^(Expand|Collapse): / }).map((b) => {
  const name = b.getAttribute('aria-label')!
  return { title: name.replace(/^(Expand|Collapse): /, '').replace(/ \(changed\)$/, ''), changed: / \(changed\)$/.test(name), open: b.getAttribute('aria-expanded') === 'true' }
})
const C = (o: Partial<RackCaseParams>): RackCaseParams => ({ ...defaultRackCase, ...o })

describe('CasePanel', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultRackCase })

  it('пять секций свёрнуты и не подсвечены', () => {
    render(<Harness />)
    expect(sections().map((s) => s.title)).toEqual(['Device', 'Shell', 'Front plate', 'Ears', 'Vents'])
    expect(sections().every((s) => !s.open && !s.changed)).toBe(true)
  })
  it.each([
    ['Device', { gap: 0.6 }], ['Shell', { wall: 2.4 }], ['Front plate', { window: { enabled: false, lip: 3 } }], ['Ears', { ears: { ...defaultRackCase.ears, shape: 'round' as const } }], ['Vents', { vents: { ...defaultRackCase.vents, enabled: true } }],
  ])('изменение %s подсвечивает только её', (title, over) => {
    render(<Harness start={C(over)} />)
    expect(sections().filter((s) => s.changed).map((s) => s.title)).toEqual([title])
  })
  it('у каждого числового поля есть кнопки − и + (все секции раскрыты: keystone, кабель, соты, ручные юниты)', async () => {
    render(<Harness start={C({ keystones: { count: 2, side: 'left' }, cable: { count: 1, diameter: 8 }, vents: { ...defaultRackCase.vents, enabled: true }, units: { auto: false, value: 3 } })} />)
    await expectAllNumericSteppers()
  })
  it('автоматические юниты показывают число и высоту; ручное меньше нужного поднимается с пометкой', async () => {
    render(<Harness />)
    await openSection('Shell')
    expect(screen.getByText('2 U, plate 88.45 mm high')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: 'Automatic rack units' }))
    expect(latest.units).toEqual({ auto: false, value: 2 })
    await userEvent.click(screen.getByRole('button', { name: 'Increase: Rack units' }))
    expect(screen.getByText('3 U, plate 132.9 mm high')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Decrease: Rack units' })); await userEvent.click(screen.getByRole('button', { name: 'Decrease: Rack units' }))
    expect(latest.units.value).toBe(1)
    expect(screen.getByText('Raised to 2 U: the device needs it.')).toBeInTheDocument(); expect(screen.getByText('2 U, plate 88.45 mm high')).toBeInTheDocument()
  })
  it('слишком широкое устройство показывает ошибку с превышением', async () => {
    render(<Harness start={C({ device: { width: 230, depth: 100, height: 40 } })} />)
    await openSection('Device')
    expect(screen.getByText(/The device is 12.55 mm too wide for the 222.25 mm window/)).toBeInTheDocument()
    expect(screen.getByText(/out of range/)).toBeInTheDocument()
  })
  it('поля зависят от выбора: окно, keystone, кабель, соты', async () => {
    render(<Harness />)
    await openSection('Front plate')
    expect(screen.getByLabelText('Front lip')).toBeInTheDocument(); expect(screen.queryByLabelText('Cable hole diameter')).toBeNull()
    await userEvent.click(screen.getByRole('switch', { name: 'Window on the device front' }))
    expect(screen.queryByLabelText('Front lip')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Increase: Keystone jacks' }))
    expect(latest.keystones.count).toBe(1); expect(screen.getByRole('button', { name: 'Below' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Below' }))
    expect(latest.keystones.side).toBe('below')
    await userEvent.click(screen.getByRole('button', { name: 'Two' }))
    expect(latest.cable.count).toBe(2); expect(screen.getByLabelText('Cable hole diameter')).toBeInTheDocument()
    await openSection('Vents')
    expect(screen.queryByLabelText('Vent width')).toBeNull()
    await userEvent.click(screen.getByRole('switch', { name: 'Hexagonal vents on the top and sides' }))
    expect(screen.getByLabelText('Vent width')).toBeInTheDocument(); expect(latest.vents.enabled).toBe(true)
  })
  it('предупреждение о тесноте называет, что не вырезается', async () => {
    render(<Harness start={C({ keystones: { count: 6, side: 'right' } })} />)
    await openSection('Front plate')
    expect(screen.getByText('Keystone openings do not fit on the front plate and are not cut.')).toBeInTheDocument()
  })
  it('тонкая стенка сот предупреждает', async () => {
    render(<Harness start={C({ vents: { ...defaultRackCase.vents, enabled: true, wall: 0.5 } })} />)
    await openSection('Vents')
    expect(screen.getByText(/Vent wall is below the minimum printable width/)).toBeInTheDocument()
  })
})
