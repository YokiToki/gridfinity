// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { UnitContext } from '../../ui/units'
import { defaultKeychain, defaultMount, defaultSplit, type KeychainInfo, type KeychainParams } from '../../geometry/keychain'
import { PlacementEditor, type PlacementPatch } from './PlacementEditor'

const data = new Uint8Array(400)
for (let y = 4; y < 16; y++) for (let x = 4; x < 16; x++) data[y * 20 + x] = 1
const preview = { width: 20, height: 20, data, box: [4, 4, 16, 16] as [number, number, number, number], areas: [], labels: new Uint16Array(0) }
const info = (over: Partial<NonNullable<KeychainInfo['mountInfo']>> = {}): KeychainInfo => ({
  threshold: 100, photoLike: false, preview, size: [70, 40], cell: 0.25,
  mountInfo: { mount: { x: 0, y: 10 }, pins: [], candidates: [{ x: -10, y: 5, margin: 1, height: 3, rim: 5 }], rejected: [{ x: 30, y: 0, reason: 'rim', actual: 0.2, required: 1.2 }], issues: [], ...over },
})
const P = (over: Partial<KeychainParams> = {}): KeychainParams => ({ ...defaultKeychain, imageId: 'i', mount: { ...defaultMount, style: 'hole' }, ...over })

/** Рамка svg 800 × 500 px (jsdom не считает вёрстку): перевод клиентских координат в viewBox идёт по ней. */
const mockRect = () => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ left: 0, top: 0, right: 800, bottom: 500, width: 800, height: 500, x: 0, y: 0, toJSON: () => ({}) }))

const wrap = (ui: React.ReactNode, unit: 'mm' | 'in' = 'mm') => render(<I18nextProvider i18n={i18n}><UnitContext.Provider value={{ unit, setUnit: () => {} }}>{ui}</UnitContext.Provider></I18nextProvider>)

describe('PlacementEditor (3.1)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); vi.restoreAllMocks() })

  it('рисует контур, сетку и крепление в масштабе; без размера и маски ничего не рисует', () => {
    const { container, unmount } = wrap(<PlacementEditor params={P()} info={info()} onPlace={() => {}} onPick={() => {}} rejectedShown={false} />)
    expect(container.querySelector('polygon')).not.toBeNull()
    expect(container.querySelectorAll('line').length).toBeGreaterThan(6)
    expect(screen.getByTestId('mount-handle')).toBeInTheDocument()
    unmount()
    const { container: c2 } = wrap(<PlacementEditor params={P()} info={{ ...info(), size: undefined }} onPlace={() => {}} onPick={() => {}} rejectedShown={false} />)
    expect(c2.querySelector('svg')).toBeNull()
  })
  it('точный ввод: X = 23.6, Y = 28 мм от левого нижнего угла → доли габарита и центр в этой точке', async () => {
    const onPlace = vi.fn<(p: PlacementPatch) => void>()
    wrap(<PlacementEditor params={P()} info={info()} onPlace={onPlace} onPick={() => {}} rejectedShown={false} />)
    const x = screen.getByLabelText('X from the left edge'), y = screen.getByLabelText('Y from the bottom edge')
    await userEvent.clear(x); await userEvent.type(x, '23.6'); await userEvent.tab()
    expect(onPlace).toHaveBeenLastCalledWith({ mount: { x: 23.6 / 70, y: 30 / 40 } }) // Y по старому значению (10 + 20 = 30 мм от низа)
    await userEvent.clear(y); await userEvent.type(y, '28'); await userEvent.tab()
    const last = onPlace.mock.calls.at(-1)![0].mount!
    expect(last.x).toBeCloseTo(((0 + 35) / 70), 6) // X вернулся к значению из info (контролируемое поле)
    expect(last.y).toBeCloseTo(28 / 40, 6)
  })
  it('в дюймах поля и линейки в дюймах, значение сохраняется в мм: 25,4 мм = 1 in', () => {
    wrap(<PlacementEditor params={P()} info={info({ mount: { x: -35 + 25.4, y: -20 + 25.4 } })} onPlace={() => {}} onPick={() => {}} rejectedShown={false} />, 'in')
    expect((screen.getByLabelText('X from the left edge') as HTMLInputElement).value).toBe('1')
    expect((screen.getByLabelText('Y from the bottom edge') as HTMLInputElement).value).toBe('1')
  })
  it('перетаскивание: по отпусканию вызывается onPlace с новым положением в долях габарита (Y вверх)', () => {
    mockRect()
    const onPlace = vi.fn<(p: PlacementPatch) => void>()
    wrap(<PlacementEditor params={P()} info={info()} onPlace={onPlace} onPick={() => {}} rejectedShown={false} />)
    const h = screen.getByTestId('mount-handle')
    // клиентские координаты считаем по фактическому viewBox (y в мм вверх, на экране вниз)
    const svg = h.closest('svg')!
    const [vx, vy, vw, vh] = svg.getAttribute('viewBox')!.split(' ').map(Number)
    const client = (x: number, y: number) => ({ clientX: ((x - vx) / vw) * 800, clientY: ((-y - vy) / vh) * 500 })
    fireEvent.pointerDown(h, { ...client(0, 0), pointerId: 1 })
    fireEvent.pointerMove(svg, { ...client(10, 10), pointerId: 1 }) // +10 мм по X, +10 мм вверх
    expect(onPlace).not.toHaveBeenCalled() // пока тянем — модель не пересобирается
    fireEvent.pointerUp(svg, { pointerId: 1 })
    expect(onPlace).toHaveBeenCalledTimes(1)
    const m = onPlace.mock.calls[0][0].mount!
    expect(m.x).toBeCloseTo((10 + 35) / 70, 2)
    expect(m.y).toBeCloseTo((10 + 20) / 40, 2)
  })
  it('линейки лежат внутри viewBox с отступом от краёв, подписи крупные', () => {
    const { container } = wrap(<PlacementEditor params={P()} info={info()} onPlace={() => {}} onPick={() => {}} rejectedShown={false} />)
    const svg = container.querySelector('svg')!
    const [vx, vy, vw, vh] = svg.getAttribute('viewBox')!.split(' ').map(Number)
    const xs = [...container.querySelectorAll('text[data-ruler="x"]')], ys = [...container.querySelectorAll('text[data-ruler="y"]')]
    expect(xs.length).toBeGreaterThan(2)
    expect(ys.length).toBeGreaterThan(2)
    const fs = Number(xs[0].getAttribute('fontSize') ?? xs[0].getAttribute('font-size'))
    expect(fs).toBeGreaterThanOrEqual(2.6)
    for (const t of xs) { // базовая линия подписи выше нижнего края на запас, сама подпись не вылезает
      const y = Number(t.getAttribute('y'))
      expect(y).toBeLessThan(vy + vh - fs * 0.2)
      expect(y - fs).toBeGreaterThan(vy)
    }
    for (const t of ys) { // правый край подписи левее области чертежа и правее края viewBox
      const x = Number(t.getAttribute('x'))
      expect(x).toBeGreaterThan(vx + fs)
      expect(x).toBeLessThan(vx + vw)
    }
  })
  it('оси толще сетки, подписи основным цветом текста', () => {
    const { container } = wrap(<PlacementEditor params={P()} info={info()} onPlace={() => {}} onPick={() => {}} rejectedShown={false} />)
    const w = (k: string) => [...container.querySelectorAll(`line[data-kind="${k}"]`)].map((l) => Number(l.getAttribute('stroke-width')))
    expect(w('axis').length).toBe(2)
    expect(w('grid').length).toBeGreaterThan(4)
    expect(Math.min(...w('axis'))).toBeGreaterThan(Math.max(...w('grid')) * 2)
    expect(Number(container.querySelector('[data-testid="origin-cross"]')!.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(Math.max(...w('axis')))
    for (const t of container.querySelectorAll('text[data-ruler]')) expect(t.getAttribute('fill')).toBe('var(--color-text)')
  })
  it('привязка к контуру переносит точку на ближайший край силуэта', async () => {
    const onPlace = vi.fn<(p: PlacementPatch) => void>()
    wrap(<PlacementEditor params={P()} info={info({ mount: { x: 0, y: 17 } })} onPlace={onPlace} onPick={() => {}} rejectedShown={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Snap to outline' }))
    const m = onPlace.mock.calls[0][0].mount!
    expect(m.y).toBeCloseTo(1, 1) // верхний край силуэта (y = +20 мм → доля 1)
    expect(m.x).toBeCloseTo(0.5, 1)
  })
  it('подсказанное место выбирается щелчком, отвергнутые видны только по запросу и несут причину', async () => {
    const onPick = vi.fn()
    const { rerender } = wrap(<PlacementEditor params={P()} info={info()} onPlace={() => {}} onPick={onPick} rejectedShown={false} />)
    expect(screen.queryAllByTestId('rejected')).toHaveLength(0)
    await userEvent.click(screen.getByTestId('candidate'))
    expect(onPick).toHaveBeenCalledWith({ x: -10, y: 5, exit: undefined })
    rerender(<I18nextProvider i18n={i18n}><UnitContext.Provider value={{ unit: 'mm', setUnit: () => {} }}><PlacementEditor params={P()} info={info()} onPlace={() => {}} onPick={onPick} rejectedShown /></UnitContext.Provider></I18nextProvider>)
    expect(screen.getAllByTestId('rejected')).toHaveLength(1)
    expect(screen.getByText('Too close to the edge')).toBeInTheDocument()
  })
  it('штифты: перетаскивание штифта сообщает его номер и новое положение; канал показывает выход и внутренний конец', async () => {
    mockRect()
    const onPlace = vi.fn<(p: PlacementPatch) => void>()
    const p = P({ mount: { ...defaultMount, style: 'channel' }, split: { ...defaultSplit, enabled: true, pins: 2 } })
    wrap(<PlacementEditor params={p} info={info({ mount: { x: 0, y: 10, exit: { x: 0, y: 20 } }, pins: [{ x: -10, y: 0, auto: true, used: true }, { x: 10, y: 0, auto: true, used: false }] })} onPlace={onPlace} onPick={() => {}} rejectedShown={false} />)
    expect(screen.getByTestId('exit-handle')).toBeInTheDocument()
    const pin = screen.getByTestId('pin-handle-1')
    fireEvent.pointerDown(pin, { clientX: 400 + 76.19, clientY: 250, pointerId: 1 })
    fireEvent.pointerUp(pin.closest('svg')!, { pointerId: 1 })
    expect(onPlace.mock.calls[0][0].pin).toMatchObject({ index: 1 })
    // выбор цели переключателем: подпись и поля относятся к штифту
    await userEvent.click(screen.getByRole('radio', { name: 'Channel exit' }))
    expect((screen.getByLabelText('Y from the bottom edge') as HTMLInputElement).value).toBe('40')
  })
})
