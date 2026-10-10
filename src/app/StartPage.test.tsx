// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import { routes } from './routes'
import { recordSession } from './lastSession'

// WebGL в jsdom недоступен
vi.mock('../features/viewport/Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }))

const renderAt = (path: string) => render(
  <I18nextProvider i18n={i18n}><RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} /></I18nextProvider>,
)

describe('StartPage', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('en') })

  it('каждая карточка ведёт на свой маршрут', () => {
    renderAt('/')
    expect(screen.getByTestId('card-box')).toHaveAttribute('href', '/box')
    expect(screen.getByTestId('card-baseplate')).toHaveAttribute('href', '/baseplate')
    expect(screen.getByTestId('card-cutout')).toHaveAttribute('href', '/cutout')
  })
  it('вьюпорт и панель параметров не рендерятся', () => {
    renderAt('/')
    expect(screen.queryByLabelText('3D preview')).toBeNull()
    expect(screen.queryByLabelText('Parameters')).toBeNull()
  })
  it('неизвестный путь показывает стартовую страницу', () => {
    renderAt('/nope')
    expect(screen.getByRole('heading', { name: 'What are you printing?' })).toBeInTheDocument()
  })
  it('клавиша 3 открывает Cutout', async () => {
    renderAt('/')
    await userEvent.keyboard('3')
    expect(await screen.findByText('Cutout is coming soon')).toBeInTheDocument()
  })
  it('плашка «Продолжить» скрыта без сохранённой сессии и видна с ней', () => {
    const { unmount } = renderAt('/')
    expect(screen.queryByText(/Continue:/)).toBeNull()
    unmount()
    recordSession('baseplate', '6 × 4')
    renderAt('/')
    expect(screen.getByText(/Continue: Baseplate 6 × 4/)).toBeInTheDocument()
  })
  it('заглушка Box показывает вьюпорт', async () => {
    renderAt('/box')
    expect(await screen.findByLabelText('3D preview')).toBeInTheDocument()
  })
})
