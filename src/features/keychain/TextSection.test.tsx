// @vitest-environment jsdom
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { openSection, renderOpen as render } from '../../ui/renderOpen'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { UnitContext } from '../../ui/units'
import { defaultText, type TextParams } from '../../geometry/text'
import { FONT_LIST } from './fontList'
import { FontError } from './fonts'
import { TextRasterContext } from './useTextRaster'
import { TextSection } from './TextSection'

const added = vi.fn()
vi.mock('./fonts', async (orig) => {
  const real = await orig<typeof import('./fonts')>()
  return { ...real, addUserFontFile: (...a: unknown[]) => added(...a) }
})
vi.mock('./fontStore', () => ({ openFontStore: async () => ({ save: async () => {}, load: async () => undefined, remove: async () => {}, persistent: false }) }))

let latest: TextParams = defaultText
function Harness({ start = {}, splitOn = false, cell = 0.25, minCell = 0.05, clipped = false, fontLost = false, onRaise = () => {}, unit = 'mm' as 'mm' | 'in' }: {
  start?: Partial<TextParams>; splitOn?: boolean; cell?: number; minCell?: number; clipped?: boolean; fontLost?: boolean; onRaise?: (c: number) => void; unit?: 'mm' | 'in'
}) {
  const [t, setT] = useState<TextParams>({ ...defaultText, ...start })
  latest = t
  return (
    <I18nextProvider i18n={i18n}>
      <UnitContext.Provider value={{ unit, setUnit: () => {} }}>
        <TextRasterContext.Provider value={{ raster: null, fontLost, busy: false }}>
          <TextSection value={t} error={() => undefined} splitOn={splitOn} cell={cell} minCell={minCell} clipped={clipped} onChange={(p) => setT((o) => ({ ...o, ...p }))} onRaise={onRaise} />
        </TextRasterContext.Provider>
      </UnitContext.Provider>
    </I18nextProvider>
  )
}
const type = async (label: string, v: string) => { const f = screen.getByLabelText(label); await userEvent.clear(f); await userEvent.type(f, v); await userEvent.tab() }
// секции открыты по умолчанию; после изменения 21 они закрыты — помощник работает в обоих случаях
const open = async () => { const b = screen.queryByRole('button', { name: /^Expand: Text( \(changed\))?$/ }); if (b) await userEvent.click(b) }
const on = (over: Partial<TextParams> = {}) => ({ enabled: true, content: 'ANNA', ...over })

describe('TextSection', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultText; added.mockReset() })

  it('выключена: полей нет, в сводке «Выкл.»; включение показывает поля', async () => {
    render(<Harness />)
    expect(screen.getByText('Off')).toBeInTheDocument()
    await open()
    expect(screen.queryByLabelText('Text')).toBeNull()
    await userEvent.click(screen.getByRole('switch', { name: 'Add text' }))
    expect(latest.enabled).toBe(true)
    for (const l of ['Text', 'Font', 'Letter height (capitals)', 'Letter spacing', 'Line spacing', 'Rotation, °']) expect(screen.getByLabelText(l), l).toBeInTheDocument()
  })
  it('сводка показывает первую строку надписи', () => {
    render(<Harness start={on({ content: 'Привет\nМир' })} />)
    expect(screen.getByText('Привет…')).toBeInTheDocument()
  })
  it('текст в несколько строк попадает в параметры, перевод строки сохраняется', async () => {
    render(<Harness start={on({ content: '' })} />)
    await open()
    const area = screen.getByLabelText('Text')
    fireEvent.change(area, { target: { value: 'ANNA\nАнна' } })
    expect(latest.content).toBe('ANNA\nАнна')
  })
  it('список шрифтов сгруппирован: Sans, Serif, Display, Handwriting, Mono, системные; все семейства на месте', async () => {
    render(<Harness start={on()} />)
    await open()
    const sel = screen.getByLabelText('Font') as HTMLSelectElement
    const groups = [...sel.querySelectorAll('optgroup')].map((g) => g.label)
    expect(groups).toEqual(['Sans-serif', 'Serif', 'Display', 'Handwriting', 'Monospace', 'System'])
    expect([...sel.options].filter((o) => !o.value.startsWith('generic:')).map((o) => o.value)).toEqual(FONT_LIST.map((f) => f.id))
    expect(within(sel).getByRole('option', { name: 'Lobster' })).toBeInTheDocument()
    expect(within(sel).getByRole('option', { name: 'serif' })).toBeInTheDocument()
  })
  it('выбор шрифта; жирный и курсив недоступны там, где у семейства их нет, и сбрасываются', async () => {
    render(<Harness start={on({ font: { id: 'roboto', bold: true, italic: true } })} />)
    await open()
    expect(screen.getByRole('switch', { name: 'Bold' })).toBeEnabled()
    await userEvent.selectOptions(screen.getByLabelText('Font'), 'russo-one')
    expect(latest.font).toEqual({ id: 'russo-one', bold: false, italic: false })
    expect(screen.getByRole('switch', { name: 'Bold' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Italic' })).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Font'), 'oswald')
    expect(screen.getByRole('switch', { name: 'Bold' })).toBeEnabled()
    expect(screen.getByRole('switch', { name: 'Italic' })).toBeDisabled()
    await userEvent.click(screen.getByRole('switch', { name: 'Bold' }))
    expect(latest.font.bold).toBe(true)
  })
  it('собственный шрифт: загрузка файла добавляет его в список и выбирает', async () => {
    added.mockResolvedValue({ id: 'user:abc', bold: false, italic: false, name: 'My.ttf' })
    render(<Harness start={on()} />)
    await open()
    const file = new File([new Uint8Array(20)], 'My.ttf', { type: 'font/ttf' })
    await userEvent.upload(screen.getByTestId('font-input'), file)
    await waitFor(() => expect(latest.font).toEqual({ id: 'user:abc', bold: false, italic: false, name: 'My.ttf' }))
    expect(within(screen.getByLabelText('Font')).getByRole('option', { name: 'My.ttf' })).toBeInTheDocument()
    expect(added).toHaveBeenCalledWith(file, expect.anything(), undefined)
  })
  it('второй собственный шрифт передаёт идентификатор прежнего для удаления', async () => {
    added.mockResolvedValue({ id: 'user:b', bold: false, italic: false, name: 'B.ttf' })
    render(<Harness start={on({ font: { id: 'user:a', bold: false, italic: false, name: 'A.ttf' } })} />)
    await open()
    await userEvent.upload(screen.getByTestId('font-input'), new File([new Uint8Array(20)], 'B.ttf'))
    await waitFor(() => expect(latest.font.id).toBe('user:b'))
    expect(added).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'user:a')
  })
  it.each([['format', 'This file is not a font'], ['decode', 'could not be read'], ['size', 'too large']] as const)('ошибка шрифта %s: баннер, шрифт не меняется', async (code, text) => {
    added.mockRejectedValue(new FontError(code))
    render(<Harness start={on()} />)
    await open()
    await userEvent.upload(screen.getByTestId('font-input'), new File([new Uint8Array(20)], 'x.ttf'))
    expect(await screen.findByText(new RegExp(text))).toBeInTheDocument()
    expect(latest.font.id).toBe('roboto')
  })
  it('успешная загрузка снимает баннер ошибки', async () => {
    added.mockRejectedValueOnce(new FontError('format')).mockResolvedValueOnce({ id: 'user:ok', bold: false, italic: false, name: 'ok.ttf' })
    render(<Harness start={on()} />)
    await open()
    await userEvent.upload(screen.getByTestId('font-input'), new File([new Uint8Array(20)], 'x.ttf'))
    await screen.findByText(/not a font/)
    await userEvent.upload(screen.getByTestId('font-input'), new File([new Uint8Array(20)], 'ok.ttf'))
    await waitFor(() => expect(screen.queryByText(/not a font/)).toBeNull())
  })
  it('потерянный собственный шрифт: предупреждение', async () => {
    render(<Harness start={on({ font: { id: 'user:gone', bold: false, italic: false, name: 'Gone.ttf' } })} fontLost />)
    await open()
    expect(screen.getByText(/no longer in this browser/)).toBeInTheDocument()
  })
  it('размер, интервалы, поворот, выравнивание и режим попадают в параметры', async () => {
    render(<Harness start={on()} />)
    await open()
    await type('Letter height (capitals)', '10')
    await type('Letter spacing', '0.5')
    await type('Line spacing', '1.4')
    await type('Rotation, °', '-30')
    await userEvent.click(screen.getByRole('button', { name: 'Left' }))
    expect(latest).toMatchObject({ size: 10, letterSpacing: 0.5, lineSpacing: 1.4, rotation: -30, align: 'left' })
  })
  it('рельеф показывает «Поднять на», гравировка — «Глубина реза»; значения сохраняются раздельно', async () => {
    render(<Harness start={on()} />)
    await open()
    expect(screen.getByLabelText('Raise by')).toBeInTheDocument()
    expect(screen.queryByLabelText('Cut depth')).toBeNull()
    await type('Raise by', '1')
    await userEvent.click(screen.getByRole('button', { name: 'Engrave' }))
    expect(latest.mode).toBe('engrave')
    expect(screen.queryByLabelText('Raise by')).toBeNull()
    await type('Cut depth', '0.8')
    expect(latest).toMatchObject({ height: 1, depth: 0.8 })
  })
  it('размеры в дюймах: ввод 0.4 in даёт 10.16 мм', async () => {
    render(<Harness start={on()} unit="in" />)
    await open()
    await type('Letter height (capitals)', '0.4')
    expect(latest.size).toBeCloseTo(10.16, 6)
  })
  it('у числовых полей есть кнопки +/−', async () => {
    render(<Harness start={on()} />)
    await open()
    for (const l of ['Letter height (capitals)', 'Letter spacing', 'Line spacing', 'Rotation, °', 'Raise by']) {
      expect(screen.getByRole('button', { name: `Increase: ${l}` }), l).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Decrease: ${l}` }), l).toBeInTheDocument()
    }
  })
  it('подсказка про две половины только когда они включены', async () => {
    const { unmount } = render(<Harness start={on()} />)
    await open()
    expect(screen.queryByText(/top half/)).toBeNull()
    unmount()
    render(<Harness start={on()} splitOn />)
    await open()
    expect(screen.getByText(/only on the top half/)).toBeInTheDocument()
  })
  it('предупреждение «вне материала» из ответа воркера', async () => {
    render(<Harness start={on()} clipped />)
    await open()
    expect(screen.getByText(/outside the material/)).toBeInTheDocument()
  })
  it('тонкие штрихи: предупреждение с шагом сетки и кнопка повышения разрешения', async () => {
    const onRaise = vi.fn()
    render(<Harness start={on({ size: 4 })} onRaise={onRaise} cell={0.25} minCell={0.05} />)
    await open()
    expect(screen.getByText(/thinner than four grid cells \(step 0\.25 mm\)/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Raise resolution \(step 0\.12 mm\)/ }))
    expect(onRaise).toHaveBeenCalledWith(0.12)
  })
  it('нормальный размер или недостижимое разрешение: без предупреждения или без кнопки', async () => {
    const { unmount } = render(<Harness start={on({ size: 10 })} />)
    await open()
    expect(screen.queryByText(/thinner than four/)).toBeNull()
    unmount()
    render(<Harness start={on({ size: 4 })} minCell={0.3} />)
    await open()
    expect(screen.getByText(/thinner than four/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Raise resolution/ })).toBeNull()
  })
  it('сброс секции возвращает умолчания', async () => {
    render(<Harness start={on({ content: 'x', size: 20, mode: 'engrave', align: 'right' })} />)
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Text' }))
    expect(latest).toEqual(defaultText)
  })
})
