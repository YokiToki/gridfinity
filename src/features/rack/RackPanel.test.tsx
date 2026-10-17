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
import { loadPersisted } from '../../app/usePersistedState'
import { defaultRackPanel, type RackPanelParams } from '../../geometry/rack/panel'
import { defaultPattern, type PatternParams } from '../../geometry/rack/patterns/types'
import { RackPanel } from './RackPanel'
import { migrateRackPanel } from './migrate'

let latest: RackPanelParams = defaultRackPanel
function Harness({ start = defaultRackPanel, buildError = null as string | null, unit = 'mm' as 'mm' | 'in' }) {
  const [p, setP] = useState(start)
  latest = p
  return <I18nextProvider i18n={i18n}><UnitContext.Provider value={{ unit, setUnit: () => {} }}><RackPanel params={p} onChange={setP} buildError={buildError} /></UnitContext.Provider></I18nextProvider>
}
const sections = () => screen.queryAllByRole('button', { name: /^(Expand|Collapse): / }).map((b) => {
  const name = b.getAttribute('aria-label')!
  return { title: name.replace(/^(Expand|Collapse): /, '').replace(/ \(changed\)$/, ''), changed: / \(changed\)$/.test(name), open: b.getAttribute('aria-expanded') === 'true' }
})
const withPattern = (o: Partial<PatternParams>): RackPanelParams => ({ ...defaultRackPanel, pattern: { ...defaultPattern, ...o } })

describe('RackPanel: секции', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultRackPanel })

  it('по умолчанию четыре секции свёрнуты и не подсвечены', () => {
    render(<Harness />)
    expect(sections().map((s) => s.title)).toEqual(['Size', 'Ears', 'Pattern', 'Back wall'])
    expect(sections().every((s) => !s.open && !s.changed)).toBe(true)
    expect(screen.queryByLabelText('Rack units (U)')).toBeNull()
  })
  it('изменение одной секции подсвечивает только её; сброс снимает подсветку', async () => {
    render(<Harness />)
    await openSection('Size')
    await userEvent.click(screen.getByRole('button', { name: 'Increase: Rack units (U)' }))
    expect(latest.units).toBe(3)
    expect(sections().filter((s) => s.changed).map((s) => s.title)).toEqual(['Size'])
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Size' }))
    expect(latest.units).toBe(defaultRackPanel.units)
    expect(sections().some((s) => s.changed)).toBe(false)
  })
  it.each([
    ['Ears', { ears: { ...defaultRackPanel.ears, shape: 'round' as const } }],
    ['Pattern', { pattern: { ...defaultPattern, kind: 'hex' as const } }],
    ['Back wall', { back: { enabled: true, thickness: 0.6 } }],
  ])('%s подсвечивается отдельно', (title, over) => {
    render(<Harness start={{ ...defaultRackPanel, ...over }} />)
    expect(sections().filter((s) => s.changed).map((s) => s.title)).toEqual([title])
  })
  it('сводка Size: юниты, ширина и высота с допуском; дюймы меняют только показ', () => {
    render(<Harness />)
    expect(screen.getByText('2 U · 254 × 88.45')).toBeInTheDocument()
  })
  it('у каждого числового поля есть кнопки − и + (паз, узор Skadis, задняя стенка)', async () => {
    render(<Harness start={{ ...withPattern({ kind: 'skadis' }), back: { enabled: true, thickness: 0.6 } }} />)
    await expectAllNumericSteppers()
  })
  it.each(['hex', 'pills', 'lines', 'passthrough', 'asanoha', 'hicks'] as const)('у числовых полей узора %s есть кнопки − и +', async (kind) => {
    render(<Harness start={withPattern({ kind })} />)
    await expectAllNumericSteppers()
  })
})

describe('RackPanel: поля зависят от выбора', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  it('вид узора переключает видимые поля', async () => {
    render(<Harness />)
    await openSection('Pattern')
    expect(screen.queryByLabelText('Margin')).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText('Pattern'), 'skadis')
    expect(screen.getByLabelText('Slot width')).toBeInTheDocument(); expect(screen.getByLabelText('Row shift')).toBeInTheDocument()
    expect(screen.queryByLabelText('Wall')).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText('Pattern'), 'hex')
    expect(screen.getByLabelText('Wall')).toBeInTheDocument(); expect(screen.queryByLabelText('Slot width')).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText('Pattern'), 'pills')
    expect(screen.getByRole('switch', { name: 'Edge pills' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Pattern'), 'passthrough')
    expect(screen.getByLabelText('Side border')).toBeInTheDocument(); expect(screen.queryByRole('switch', { name: 'Edge pills' })).toBeNull()
    expect(latest.pattern.kind).toBe('passthrough')
  })
  it('асаноха и Hicks показывают свои поля и подсказки', async () => {
    render(<Harness />)
    await openSection('Pattern')
    await userEvent.selectOptions(screen.getByLabelText('Pattern'), 'asanoha')
    for (const l of ['Width', 'Main stroke width', 'Detail stroke width']) expect(screen.getByLabelText(l)).toBeInTheDocument()
    expect(screen.getByText(/Asanoha is cut through/)).toBeInTheDocument(); expect(screen.queryByLabelText('Whitespace')).toBeNull(); expect(screen.queryByLabelText('Main stroke depth')).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText('Pattern'), 'hicks')
    for (const l of ['Width', 'Stroke', 'Whitespace']) expect(screen.getByLabelText(l)).toBeInTheDocument()
    expect(screen.getByText(/Bridges keep it in one piece/)).toBeInTheDocument(); expect(screen.getByRole('switch', { name: 'Edge cells' })).toBeInTheDocument(); expect(screen.queryByLabelText('Main stroke width')).toBeNull()
    expect(latest.pattern.kind).toBe('hicks')
  })
  it('краевые ячейки Hicks переключаются', async () => {
    render(<Harness start={withPattern({ kind: 'hicks' })} />)
    await openSection('Pattern')
    expect(screen.getByRole('switch', { name: 'Edge cells' })).toBeChecked()
    await userEvent.click(screen.getByRole('switch', { name: 'Edge cells' }))
    expect(latest.pattern.hicks.edgeCells).toBe(false)
  })
  it('настройки других узоров сохраняются при переключении', async () => {
    render(<Harness start={withPattern({ kind: 'hex', hex: { width: 12, wall: 2 } })} />)
    await openSection('Pattern')
    await userEvent.selectOptions(screen.getByLabelText('Pattern'), 'lines')
    await userEvent.selectOptions(screen.getByLabelText('Pattern'), 'hex')
    expect(latest.pattern.hex).toEqual({ width: 12, wall: 2 })
  })
  it('поворот узора переключается', async () => {
    render(<Harness start={withPattern({ kind: 'lines' })} />)
    await openSection('Pattern')
    await userEvent.click(screen.getByRole('switch', { name: 'Rotate 90°' }))
    expect(latest.pattern.rotate).toBe(true)
  })
  it('паз показывает длину, круг её скрывает; «только по краям» оставляет форму и размер', async () => {
    render(<Harness />)
    await openSection('Ears')
    expect(screen.getByLabelText('Ear slot length')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Round' }))
    expect(screen.queryByLabelText('Ear slot length')).toBeNull(); expect(screen.getByLabelText('Diameter')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Edges only' }))
    expect(screen.getByLabelText('Diameter')).toBeInTheDocument()
    expect(latest.ears.positions).toBe('edges')
  })
  it('задняя стенка: поле толщины появляется только при включении', async () => {
    render(<Harness />)
    await openSection('Back wall')
    expect(screen.queryByLabelText('Back wall thickness')).toBeNull()
    await userEvent.click(screen.getByRole('switch', { name: 'Add a back wall' }))
    expect(screen.getByLabelText('Back wall thickness')).toBeInTheDocument()
    expect(latest.back.enabled).toBe(true)
  })
  it('предупреждение о тонкой стенке называет настройку; ошибка построения показана в узоре', async () => {
    render(<Harness start={withPattern({ kind: 'hex', hex: { width: 8, wall: 0.5 } })} buildError="rack.error.disconnected" />)
    await openSection('Pattern')
    expect(screen.getByText(/Wall is below the minimum printable width/)).toBeInTheDocument()
    expect(screen.getByText(/splits the panel into loose pieces/)).toBeInTheDocument()
  })
  it('ошибки параметров видны у поля и общим сообщением', async () => {
    render(<Harness start={{ ...defaultRackPanel, thickness: 20 }} />)
    await openSection('Size')
    expect(screen.getByText('Thickness must be between 1.5 and 8 mm.')).toBeInTheDocument()
    expect(screen.getByText(/out of range/)).toBeInTheDocument()
  })
})

describe('сохранение параметров', () => {
  beforeEach(() => localStorage.clear())
  it('круг «сохранить — загрузить» возвращает те же параметры', () => {
    const p = { ...withPattern({ kind: 'pills', rotate: true }), units: 4, back: { enabled: true, thickness: 1 } }
    localStorage.setItem('rack.panel', JSON.stringify(p))
    expect(loadPersisted('rack.panel', defaultRackPanel, migrateRackPanel)).toEqual(p)
  })
  it('пустое хранилище и битый JSON дают умолчания', () => {
    expect(loadPersisted('rack.panel', defaultRackPanel, migrateRackPanel)).toEqual(defaultRackPanel)
    localStorage.setItem('rack.panel', '{bad')
    expect(loadPersisted('rack.panel', defaultRackPanel, migrateRackPanel)).toEqual(defaultRackPanel)
  })
  it('старое поле pills.height читается как length', () => {
    localStorage.setItem('rack.panel', JSON.stringify({ pattern: { kind: 'pills', pills: { height: 25 } } }))
    expect(loadPersisted('rack.panel', defaultRackPanel, migrateRackPanel).pattern.pills).toMatchObject({ length: 25, width: 6 })
  })
  it('сохранённая панель без настроек асаноха и Hicks загружается с умолчаниями', () => {
    localStorage.setItem('rack.panel', JSON.stringify({ pattern: { kind: 'hex', hex: { width: 10, wall: 2 } } }))
    const p = loadPersisted('rack.panel', defaultRackPanel, migrateRackPanel)
    expect(p.pattern.asanoha).toEqual(defaultPattern.asanoha); expect(p.pattern.hicks).toEqual(defaultPattern.hicks); expect(p.pattern.hex).toEqual({ width: 10, wall: 2 })
    localStorage.setItem('rack.panel', JSON.stringify({ pattern: { kind: 'hicks', hicks: { width: 'x', stroke: 2 }, asanoha: { mainWidth: null } } }))
    const q = loadPersisted('rack.panel', defaultRackPanel, migrateRackPanel)
    expect(q.pattern.hicks).toEqual({ ...defaultPattern.hicks, stroke: 2 }); expect(q.pattern.asanoha.mainWidth).toBe(defaultPattern.asanoha.mainWidth)
  })
  it('старое положение «нет» читается как «только по краям»', () => {
    localStorage.setItem('rack.panel', JSON.stringify({ ears: { positions: 'none' } }))
    expect(loadPersisted('rack.panel', defaultRackPanel, migrateRackPanel).ears.positions).toBe('edges')
  })
  it('частичные и испорченные данные нормализуются, режим не падает', () => {
    localStorage.setItem('rack.panel', JSON.stringify({ units: 'x', pattern: { kind: 'zzz', hex: { width: 'a', wall: 2 }, skadis: null }, ears: { positions: 5 }, back: [] }))
    const p = loadPersisted('rack.panel', defaultRackPanel, migrateRackPanel)
    expect(p.units).toBe(2); expect(p.pattern.kind).toBe('none'); expect(p.pattern.hex).toEqual({ width: 8, wall: 2 })
    expect(p.pattern.skadis).toEqual(defaultPattern.skadis); expect(p.ears).toEqual(defaultRackPanel.ears); expect(p.back).toEqual(defaultRackPanel.back)
  })
})
