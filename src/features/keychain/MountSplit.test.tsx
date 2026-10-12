// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { UnitContext } from '../../ui/units'
import { defaultKeychain, defaultMount, defaultSplit, type KeychainInfo, type KeychainParams } from '../../geometry/keychain'
import { KeychainPanel } from './KeychainPanel'
import { migrateKeychain } from './migrate'

type S = KeychainParams & { imageName: string }
let latest: S

const data = new Uint8Array(400).fill(1)
const preview = { width: 20, height: 20, data, box: [0, 0, 20, 20] as [number, number, number, number], holes: [] }
const info = (mi: Partial<NonNullable<KeychainInfo['mountInfo']>> = {}): KeychainInfo => ({
  threshold: 140, photoLike: false, preview, size: [70, 45], cell: 0.25, reduced: false, minCell: 0.1, triangles: 1000,
  mountInfo: { mount: { x: 0, y: 10 }, pins: [], candidates: [{ x: -10, y: 5, margin: 1, height: 3, rim: 5 }], rejected: [], issues: [], ...mi },
})

function Harness({ start = {} as Partial<S>, inf = info(), unit = 'mm' as 'mm' | 'in' }) {
  const [s, setS] = useState<S>({ ...defaultKeychain, imageId: 'i', imageName: 'a.png', ...start })
  latest = s
  const { imageName, ...params } = s
  return (
    <I18nextProvider i18n={i18n}>
      <UnitContext.Provider value={{ unit, setUnit: () => {} }}>
        <KeychainPanel params={params} onChange={setS} imageName={imageName} hasImage info={inf} notice={null} onFile={() => {}} />
      </UnitContext.Provider>
    </I18nextProvider>
  )
}
const type = async (label: string, v: string) => { const f = screen.getByLabelText(label); await userEvent.clear(f); await userEvent.type(f, v); await userEvent.tab() }
const open = (name: string) => userEvent.click(screen.getByRole('button', { name: `Expand: ${name}` }))

describe('MountSection (3.2)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })

  it('по умолчанию крепления нет и редактора нет; стиль «Отверстие» включает поля и редактор', async () => {
    render(<Harness />)
    await open('Ring mount')
    expect(screen.queryByLabelText('Hole diameter')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Hole' }))
    expect(latest.mount.style).toBe('hole')
    expect(screen.getByLabelText('Hole diameter')).toBeInTheDocument()
    expect(screen.getByTestId('placement-editor')).toBeInTheDocument()
    expect(screen.queryByLabelText('Eyelet outer diameter')).toBeNull()
  })
  it('ушко показывает внешний диаметр; канал — диаметр канала', async () => {
    render(<Harness start={{ mount: { ...defaultMount, style: 'eyelet' } }} />)
    await open('Ring mount')
    expect(screen.getByLabelText('Eyelet outer diameter')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Channel' }))
    expect(screen.getByLabelText('Channel diameter')).toBeInTheDocument()
    expect(screen.queryByLabelText('Eyelet outer diameter')).toBeNull()
  })
  it('канал без разделения: объяснение; с разделением объяснения нет', async () => {
    const { unmount } = render(<Harness start={{ mount: { ...defaultMount, style: 'channel' } }} />)
    await open('Ring mount')
    expect(screen.getByRole('alert')).toHaveTextContent('needs the two-halves mode')
    unmount()
    render(<Harness start={{ mount: { ...defaultMount, style: 'channel' }, split: { ...defaultSplit, enabled: true } }} />)
    await open('Ring mount')
    expect(screen.queryByText(/needs the two-halves mode/)).toBeNull()
  })
  it('пресеты проволоки задают диаметр; нестандартный показывается как «Свой размер»', async () => {
    render(<Harness start={{ mount: { ...defaultMount, style: 'hole' } }} />)
    await open('Ring mount')
    await userEvent.selectOptions(screen.getByLabelText('Ring wire'), 'heavy')
    expect(latest.mount.diameter).toBe(5)
    await type('Hole diameter', '4.4')
    expect((screen.getByLabelText('Ring wire') as HTMLSelectElement).value).toBe('custom')
  })
  it('Suggest ставит крепление на лучшее место (доли габарита), «нет места» — сообщение про ушко', async () => {
    const { unmount } = render(<Harness start={{ mount: { ...defaultMount, style: 'hole' } }} />)
    await open('Ring mount')
    await userEvent.click(screen.getByRole('button', { name: 'Suggest a place' }))
    expect(latest.mount.x).toBeCloseTo((-10 + 35) / 70, 6)
    expect(latest.mount.y).toBeCloseTo((5 + 22.5) / 45, 6)
    unmount()
    render(<Harness start={{ mount: { ...defaultMount, style: 'hole' } }} inf={info({ candidates: [] })} />)
    await open('Ring mount')
    await userEvent.click(screen.getByRole('button', { name: 'Suggest a place' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Try the eyelet style')
  })
  it('Suggest для канала ставит и внутренний конец, и ближайший выход на край', async () => {
    render(<Harness start={{ mount: { ...defaultMount, style: 'channel' }, split: { ...defaultSplit, enabled: true } }} inf={info({ candidates: [{ x: -10, y: 5, margin: 1, height: 3, rim: 5, exit: { x: -10, y: 20 } }] })} />)
    await open('Ring mount')
    await userEvent.click(screen.getByRole('button', { name: 'Suggest a place' }))
    expect(latest.mount.exitX).toBeCloseTo((-10 + 35) / 70, 6)
    expect(latest.mount.exitY).toBeCloseTo((20 + 22.5) / 45, 6)
  })
  it('предупреждения посадки: имя элемента и значения в текущей единице (дюймы)', async () => {
    render(<Harness start={{ mount: { ...defaultMount, style: 'hole' } }} unit="in" inf={info({ issues: [{ feature: 'hole', kind: 'thinWall', actual: 0.5, required: 1.2 }] })} />)
    await open('Ring mount')
    expect(screen.getByRole('alert')).toHaveTextContent('The hole leaves a wall of 0.02 in, less than the required 0.047 in')
  })
  it('канал не открывается наружу: предупреждение', async () => {
    render(<Harness start={{ mount: { ...defaultMount, style: 'channel' }, split: { ...defaultSplit, enabled: true } }} inf={info({ issues: [{ feature: 'channel', kind: 'noBreach', actual: 0, required: 0 }] })} />)
    await open('Ring mount')
    expect(screen.getByText(/does not open to the outside/)).toBeInTheDocument()
  })
  it('сброс секции возвращает крепление по умолчанию', async () => {
    render(<Harness start={{ mount: { ...defaultMount, style: 'eyelet', outer: 12, x: 0.1 } }} />)
    await open('Ring mount')
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Ring mount' }))
    expect(latest.mount).toEqual(defaultMount)
  })
})

describe('SplitSection (3.3)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })

  it('выключено: полей штифтов нет; включение показывает их', async () => {
    render(<Harness />)
    await open('Two halves')
    expect(screen.queryByLabelText('Pins')).toBeNull()
    await userEvent.click(screen.getByRole('switch', { name: 'Print as two halves' }))
    expect(latest.split.enabled).toBe(true)
    for (const l of ['Pins', 'Pin hole radius', 'Pin clearance', 'Hole depth in each half', 'Gap between parts']) expect(screen.getByLabelText(l)).toBeInTheDocument()
  })
  it('радиус, зазор, глубина и число штифтов меняют параметры; число штифтов сбрасывает ручные положения', async () => {
    render(<Harness start={{ split: { ...defaultSplit, enabled: true, pinPositions: [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }, { x: 0.5, y: 0.5 }] } }} />)
    await open('Two halves')
    expect(screen.getByText('Pin positions: manual')).toBeInTheDocument()
    await type('Pin hole radius', '1')
    await type('Pin clearance', '0.15')
    await type('Hole depth in each half', '1.2')
    expect(latest.split).toMatchObject({ pinRadius: 1, clearance: 0.15, pinDepth: 1.2 })
    await type('Pins', '2')
    expect(latest.split.pins).toBe(2)
    expect(latest.split.pinPositions).toBeNull()
    expect(screen.getByText('Pin positions: automatic')).toBeInTheDocument()
  })
  it('радиус свободного штифта = радиус отверстия − зазор (0,9 − 0,1 = 0,8)', async () => {
    render(<Harness start={{ split: { ...defaultSplit, enabled: true } }} />)
    await open('Two halves')
    expect(screen.getByText('Loose pin radius: 0.8 mm')).toBeInTheDocument()
  })
  it('«Вернуть автоматически» очищает ручные положения', async () => {
    render(<Harness start={{ split: { ...defaultSplit, enabled: true, pins: 1, pinPositions: [{ x: 0.2, y: 0.5 }] } }} />)
    await open('Two halves')
    await userEvent.click(screen.getByRole('button', { name: 'Back to automatic' }))
    expect(latest.split.pinPositions).toBeNull()
  })
  it('размер листа печати показан в текущей единице; предупреждения штифтов — в этой же секции', async () => {
    render(<Harness start={{ split: { ...defaultSplit, enabled: true } }} inf={info({ sheet: { w: 154, h: 60 }, issues: [{ feature: 'pin2', kind: 'pinTooBig', actual: 0.4, required: 1.2 }] })} />)
    await open('Two halves')
    expect(screen.getByText('Print sheet: 154 × 60 mm')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Pin 2 would break the surface')
  })
  it('сетка параметров не пускает неверные значения: зазор больше радиуса — ошибка', async () => {
    render(<Harness start={{ split: { ...defaultSplit, enabled: true, clearance: 1.5 } }} />)
    await open('Two halves')
    expect(await screen.findByText('The clearance must be smaller than the pin radius')).toBeInTheDocument()
  })
})

describe('миграция креплений (3.3)', () => {
  it('старая запись получает крепление «нет» и выключенные половины', () => {
    const m = migrateKeychain({ imageId: 'i', relief: { hmax: 2 } })
    expect(m.mount).toEqual(defaultMount); expect(m.split).toEqual(defaultSplit)
  })
  it('сохранённое сливается с умолчаниями, битый стиль и положения штифтов заменяются', () => {
    const m = migrateKeychain({ mount: { style: 'zzz', x: 0.3 }, split: { enabled: true, pinPositions: [{ x: 1, y: 'a' }] } })
    expect(m.mount).toMatchObject({ style: 'none', x: 0.3, diameter: 4 })
    expect((m.split as { pinPositions: unknown }).pinPositions).toBeNull()
    const ok = migrateKeychain({ split: { pinPositions: [{ x: 0.1, y: 0.2 }] } })
    expect((ok.split as { pinPositions: unknown }).pinPositions).toEqual([{ x: 0.1, y: 0.2 }])
  })
})
