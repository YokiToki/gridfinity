// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { routes } from '../../app/routes'
import { defaultKeychain } from '../../geometry/keychain'
import { loadPersisted } from '../../app/usePersistedState'
import { defaultShapeState, migrateShape, shapeParams } from './shapeState'

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
    for (const name of ['Relief', 'Detail lines', 'Surface pattern', 'Base plate', 'Ring mount', 'Two halves', 'Resolution']) {
      expect(await screen.findByRole('button', { name: new RegExp(`(Expand|Collapse): ${name}`) }), name).toBeInTheDocument()
    }
    const panel = within(screen.getByRole('complementary', { name: 'Parameters' }))
    expect(panel.queryByText('Image')).toBeNull()
    expect(panel.queryByText('Silhouette')).toBeNull()
    expect(screen.queryByText(/Choose an image to start/)).toBeNull()
    expect(screen.queryByTestId('mask-preview')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Enlarge mask' })).toBeNull()
  })
  it('в Рельефе нет выбора источника высоты «яркость»', async () => {
    open('/keychain/shape')
    ;(await screen.findByRole('button', { name: /Expand: Relief/ })).click()
    expect(await screen.findByLabelText('Plateau height')).toBeInTheDocument()
    expect(screen.queryByText('Brightness')).toBeNull()
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
