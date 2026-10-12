// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import { routes } from './routes'

vi.mock('../features/viewport/Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }))
vi.mock('./useModel', () => ({
  useModel: () => ({ model: null, busy: false, pending: false, error: null }),
  getModelClient: () => ({ registerMesh: () => {}, generate: async () => null }),
}))

function at(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<I18nextProvider i18n={i18n}><RouterProvider router={router} /></I18nextProvider>)
  return router
}

describe('маршруты', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('en') })

  it.each([['/box', '/gridfinity/box'], ['/baseplate', '/gridfinity/baseplate'], ['/cutout', '/gridfinity/cutout']])('старый адрес %s ведёт на %s', async (from, to) => {
    const router = at(from)
    expect(await screen.findByLabelText('3D preview')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(to)
  })
  it('прямая ссылка на режим открывает его без захода в другие', async () => {
    const router = at('/gridfinity/baseplate')
    expect(await screen.findByText('Size')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/gridfinity/baseplate')
  })
  it('/gridfinity — выбор режима, /keychain — раздел брелоков, / — выбор продукта', () => {
    const a = at('/gridfinity')
    expect(screen.getByRole('heading', { name: 'Choose a Gridfinity part' })).toBeInTheDocument()
    expect(a.state.location.pathname).toBe('/gridfinity')
  })
  it('неизвестные пути ведут на корень, неизвестный режим — на выбор режима', () => {
    expect(at('/nope').state.location.pathname).toBe('/')
  })
  it('неизвестный режим Gridfinity возвращает к выбору режима', () => {
    expect(at('/gridfinity/zzz').state.location.pathname).toBe('/gridfinity')
  })
  it('/keychain — выбор режима, режимы открываются по прямым ссылкам', async () => {
    const a = at('/keychain')
    expect(screen.getByRole('heading', { name: 'Choose a keychain start' })).toBeInTheDocument()
    expect(screen.getByTestId('card-image')).toHaveAttribute('href', '/keychain/image')
    expect(screen.getByTestId('card-shape')).toHaveAttribute('href', '/keychain/shape')
    expect(a.state.location.pathname).toBe('/keychain')
  })
  it.each([['/keychain/image', /Choose an image to start/], ['/keychain/shape', /Shape is coming soon/]])('прямая ссылка %s', async (path, text) => {
    const r = at(path)
    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(r.state.location.pathname).toBe(path)
  })
  it('неизвестный путь в Keychain ведёт на выбор режима', () => {
    expect(at('/keychain/zzz').state.location.pathname).toBe('/keychain')
  })
})
