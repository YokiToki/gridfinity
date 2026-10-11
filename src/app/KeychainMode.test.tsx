// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import { routes } from './routes'

vi.mock('../features/viewport/Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }))

describe('Keychain Master (заглушка)', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('en') })
  it('показывает заглушку с названием продукта и монтирует вьюпорт', () => {
    render(<I18nextProvider i18n={i18n}><RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/keychain'] })} /></I18nextProvider>)
    expect(screen.getByText('Keychain Master is coming soon')).toBeInTheDocument()
    expect(screen.getByTestId('viewport')).toBeInTheDocument()
  })
})
