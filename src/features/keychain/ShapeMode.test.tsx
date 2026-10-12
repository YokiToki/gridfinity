// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { routes } from '../../app/routes'
import { defaultKeychain } from '../../geometry/keychain'
import { loadPersisted } from '../../app/usePersistedState'
import { defaultShapeState, migrateShape, shapeParams } from './shapeState'
import { expectAllNumericSteppers } from '../../ui/stepperAssert'
import { maskPreview, type KeychainInfo } from '../../geometry/keychain'
import { defaultShape, shapeMask } from '../../geometry/shapes'
import { PlacementEditor } from './PlacementEditor'
import { UnitContext } from '../../ui/units'

const generate = vi.fn()
vi.mock('../../app/useModel', () => ({
  useModel: (mode: string, params: unknown, opts?: { enabled?: boolean }) => { generate(mode, params, opts); return { model: null, busy: false, pending: false, error: null } },
  getModelClient: () => ({ registerImage: () => {}, registerMesh: () => {}, generate: async () => null }),
}))
vi.mock('../viewport/Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }))

const open = (path: string) => render(<I18nextProvider i18n={i18n}><RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} /></I18nextProvider>)

describe('Форма: панель без секций изображения', () => {
  beforeEach(async () => { localStorage.clear(); generate.mockClear(); await i18n.changeLanguage('en') })

  it('общие секции есть, секций изображения, силуэта и маски нет', async () => {
    open('/keychain/shape')
    for (const name of ['Shape', 'Rim', 'Surface pattern', 'Base plate', 'Ring mount', 'Two halves', 'Resolution']) {
      expect(await screen.findByRole('button', { name: new RegExp(`(Expand|Collapse): ${name}`) }), name).toBeInTheDocument()
    }
    const panel = within(screen.getByRole('complementary', { name: 'Parameters' }))
    expect(panel.queryByText('Image')).toBeNull()
    expect(panel.queryByText('Silhouette')).toBeNull()
    expect(screen.queryByText(/Choose an image to start/)).toBeNull()
    expect(screen.queryByTestId('mask-preview')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Enlarge mask' })).toBeNull()
  })
  it('рельеф и линии детали — только для изображения', async () => {
    open('/keychain/shape')
    await screen.findByRole('radio', { name: 'Rectangle' })
    expect(screen.queryByRole('button', { name: /(Expand|Collapse): Relief/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /(Expand|Collapse): Detail lines/ })).toBeNull()
    expect(screen.queryByLabelText('Plateau height')).toBeNull()
  })
  it('режим Изображение по-прежнему показывает свои секции', async () => {
    open('/keychain/image')
    expect(await screen.findByText(/Choose an image to start/)).toBeInTheDocument()
  })
})

describe('shapeState', () => {
  beforeEach(() => localStorage.clear())
  it('в сохранённом состоянии нет полей изображения', () => {
    expect(Object.keys(defaultShapeState)).not.toContain('imageId')
    expect(Object.keys(defaultShapeState)).not.toContain('silhouette')
    expect(Object.keys(migrateShape({ imageId: 'x', silhouette: { close: 9 }, relief: { hmax: 3 } }))).not.toContain('silhouette')
  })
  it('битые и частичные данные не ломают состояние', () => {
    localStorage.setItem('keychain.shape', JSON.stringify({ relief: null, mount: 'x', pattern: { kind: 'zzz' } }))
    const s = loadPersisted('keychain.shape', defaultShapeState, migrateShape)
    expect(s.relief).toEqual(defaultShapeState.relief)
    expect(s.mount.style).toBe('none')
    expect(s.pattern.kind).toBe('none')
  })
  it('настройки Формы и Изображения независимы', () => {
    localStorage.setItem('keychain.relief', JSON.stringify({ relief: { hmax: 5 } }))
    expect(loadPersisted('keychain.shape', defaultShapeState, migrateShape).relief.hmax).toBe(1)
  })
  it('shapeParams даёт полные параметры с умолчаниями изображения', () => {
    const p = shapeParams({ ...defaultShapeState, relief: { ...defaultShapeState.relief, hmax: 2.5 } })
    expect(p.relief.hmax).toBe(2.5)
    expect(p.imageId).toBe('')
    expect(p.silhouette).toEqual(defaultKeychain.silhouette)
  })
})

describe('Форма: панель и сохранение', () => {
  beforeEach(async () => { localStorage.clear(); generate.mockClear(); await i18n.changeLanguage('en') })

  it('умолчания: прямоугольник 54 × 30, генерация идёт сразу без изображения', async () => {
    open('/keychain/shape')
    expect(await screen.findByRole('radio', { name: 'Rectangle' })).toHaveAttribute('aria-checked', 'true')
    expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe('54')
    expect((screen.getByLabelText('Height') as HTMLInputElement).value).toBe('30')
    const last = generate.mock.calls.at(-1)!
    expect(last[0]).toBe('keychain')
    expect(last[1].origin).toMatchObject({ kind: 'shape', shape: { kind: 'rect', width: 54, height: 30 } })
    expect(last[2]?.enabled).not.toBe(false)
  })
  it('правка фигуры сохраняется под keychain.shape и не трогает keychain.relief', async () => {
    localStorage.setItem('keychain.relief', JSON.stringify({ relief: { hmax: 5 } }))
    const { unmount } = open('/keychain/shape')
    await userEvent.click(await screen.findByRole('radio', { name: 'Circle' }))
    expect(JSON.parse(localStorage.getItem('keychain.shape')!).shape.kind).toBe('circle')
    expect(JSON.parse(localStorage.getItem('keychain.relief')!)).toEqual({ relief: { hmax: 5 } })
    unmount()
    open('/keychain/shape')
    expect(await screen.findByRole('radio', { name: 'Circle' })).toHaveAttribute('aria-checked', 'true')
  })
  it('сохранённая фигура с мусором не ломает режим', async () => {
    localStorage.setItem('keychain.shape', JSON.stringify({ shape: { kind: 'zzz', rim: 7, width: 'x' } }))
    open('/keychain/shape')
    expect(await screen.findByRole('radio', { name: 'Rectangle' })).toHaveAttribute('aria-checked', 'true')
  })
  it('у каждого числового поля панели есть кнопки +/−', async () => {
    open('/keychain/shape')
    await screen.findByRole('radio', { name: 'Rectangle' })
    await expectAllNumericSteppers()
  })
})

describe('Форма: редактор положения рисует контур фигуры', () => {
  const info = (): KeychainInfo => {
    const m = shapeMask(defaultShape)
    const img = { width: m.width, height: m.height, gray: m.mask, alpha: null }
    const preview = maskPreview(img, { mask: m.mask, threshold: 0, areas: [], areaId: new Int32Array(m.mask.length), goneAreas: [], photoLike: false })
    return { threshold: 0, photoLike: false, preview, size: [54, 30], mountInfo: { mount: { x: 0, y: 5 }, pins: [], candidates: [], rejected: [], issues: [] } }
  }
  it('контур — скруглённый прямоугольник: в пределах габарита, углы срезаны', () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}><UnitContext.Provider value={{ unit: 'mm', setUnit: () => {} }}>
        <PlacementEditor params={shapeParams({ ...defaultShapeState, mount: { ...defaultShapeState.mount, style: 'hole' } })} info={info()} onPlace={() => {}} onPick={() => {}} rejectedShown={false} />
      </UnitContext.Provider></I18nextProvider>,
    )
    const poly = container.querySelector('polygon')!
    const pts = poly.getAttribute('points')!.trim().split(/\s+/).map((q) => q.split(',').map(Number))
    expect(pts.length).toBeGreaterThan(8)
    for (const [x, y] of pts) { expect(Math.abs(x)).toBeLessThanOrEqual(27.6); expect(Math.abs(y)).toBeLessThanOrEqual(15.6) }
    // самый дальний от центра угол габарита (27, 15) срезан радиусом 4: ближайшая точка контура заметно дальше нуля
    const nearCorner = Math.min(...pts.map(([x, y]) => Math.hypot(Math.abs(x) - 27, Math.abs(y) - 15)))
    expect(nearCorner).toBeGreaterThan(0.8)
    expect(Math.max(...pts.map((q) => q[0]))).toBeGreaterThan(26)
  })
})
