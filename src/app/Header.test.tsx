// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import { routes } from './routes'

vi.mock('../features/viewport/Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }))
vi.mock('./useModel', () => ({
  useModel: () => ({ model: null, busy: false, pending: false, error: null }),
  getModelClient: () => ({ registerMesh: () => {}, generate: async () => null }),
}))

const at = (path: string) => render(<I18nextProvider i18n={i18n}><RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} /></I18nextProvider>)

describe('Header: продукты и режимы', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('en') })

  it('на корне переключателей нет, только логотип', () => {
    at('/')
    expect(screen.queryByRole('navigation', { name: 'Product' })).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Mode' })).toBeNull()
  })
  it('в Gridfinity: активен Gridfinity Master, видны режимы, в логотипе название продукта', async () => {
    at('/gridfinity/baseplate')
    const products = screen.getByRole('navigation', { name: 'Product' })
    expect(within(products).getByRole('link', { name: 'Gridfinity Master' })).toHaveAttribute('aria-current', 'page')
    expect(within(products).getByRole('link', { name: 'Keychain Master' })).not.toHaveAttribute('aria-current')
    const modes = screen.getByRole('navigation', { name: 'Mode' })
    expect(within(modes).getAllByRole('link')).toHaveLength(3)
    expect(screen.getByRole('link', { name: /back to start/ })).toHaveTextContent('Gridfinity Master')
  })
  it('переход в Keychain: переключатель режимов скрыт, активен Keychain Master', async () => {
    at('/gridfinity/box')
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Product' })).getByRole('link', { name: 'Keychain Master' }))
    expect(await screen.findByText(/Choose an image to start/)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Mode' })).toBeNull()
    expect(within(screen.getByRole('navigation', { name: 'Product' })).getByRole('link', { name: 'Keychain Master' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /back to start/ })).toHaveTextContent('Keychain Master')
  })
  it('параметры Baseplate переживают заход в Keychain и возврат; язык и единицы общие', async () => {
    localStorage.setItem('gridfinity.baseplate', JSON.stringify({ x: { mode: 'units', value: 5, align: 'center' } }))
    at('/gridfinity/baseplate')
    expect(await screen.findByText('Size')).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Product' })).getByRole('link', { name: 'Keychain Master' }))
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Product' })).getByRole('link', { name: 'Gridfinity Master' }))
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Mode' })).getByRole('link', { name: 'Baseplate' }))
    expect(JSON.parse(localStorage.getItem('gridfinity.baseplate')!).x.value).toBe(5)
    await userEvent.click(screen.getByRole('button', { name: 'RU' }))
    expect(document.documentElement.lang).toBe('ru')
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Продукт' })).getByRole('link', { name: 'Keychain Master' }))
    expect(screen.getByRole('button', { name: 'RU' })).toHaveAttribute('aria-pressed', 'true')
  })
})
