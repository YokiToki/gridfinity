// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import { routes } from './routes'
import { CONSENT_KEY, resetConsentForTests, setConsent } from './analytics'
import { AnalyticsHost } from './AnalyticsHost'
import { METRIKA_ID } from './site'

vi.mock('../features/viewport/Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }))
vi.mock('./useModel', () => ({
  useModel: () => ({ model: null, busy: false, pending: false, error: null }),
  getModelClient: () => ({ registerMesh: () => {}, generate: async () => null }),
}))

const scripts = () => [...document.querySelectorAll('script')].filter((s) => /mc\.yandex\./.test(s.src))
const at = (path = '/') => render(<I18nextProvider i18n={i18n}><RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} /></I18nextProvider>)
const disableFlag = () => (window as unknown as Record<string, unknown>)[`disableYaCounter${METRIKA_ID}`]
const clearCookies = () => document.cookie.split(';').forEach((c) => { document.cookie = `${c.split('=')[0].trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/` })

beforeEach(async () => {
  localStorage.clear()
  clearCookies()
  delete (window as unknown as Record<string, unknown>)[`disableYaCounter${METRIKA_ID}`]
  resetConsentForTests()
  await i18n.changeLanguage('en')
})
afterEach(() => { vi.restoreAllMocks() })

// Здесь согласие даётся: скрипт Метрики подключается пакетом один раз на страницу, в следующих тестах он уже на месте.
describe('согласие даёт счётчик (3.1, 3.2)', () => {
  it('Accept: ровно один скрипт с международного домена, флаг отключения снят', async () => {
    render(<AnalyticsHost />)
    expect(scripts()).toHaveLength(0)
    act(() => setConsent('granted'))
    await waitFor(() => expect(scripts()).toHaveLength(1))
    expect(scripts()[0].src).toBe('https://mc.yandex.com/metrika/tag.js')
    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted')
    expect(disableFlag()).toBe(false)
  })

  it('повторное монтирование не добавляет второй скрипт', async () => {
    const first = render(<AnalyticsHost />)
    act(() => setConsent('granted'))
    await waitFor(() => expect(scripts()).toHaveLength(1))
    first.unmount()
    render(<AnalyticsHost />)
    await new Promise((r) => setTimeout(r, 50))
    expect(scripts()).toHaveLength(1)
  })

  it('отзыв после согласия ставит флаг отключения счётчика и удаляет cookie _ym_*', async () => {
    render(<AnalyticsHost />)
    act(() => setConsent('granted'))
    await waitFor(() => expect(scripts()).toHaveLength(1))
    document.cookie = '_ym_uid=123; path=/'
    document.cookie = 'other=1; path=/'
    act(() => setConsent('denied'))
    expect(disableFlag()).toBe(true)
    expect(document.cookie).not.toContain('_ym_uid')
    expect(document.cookie).toContain('other=1')
  })

  it('Accept в баннере закрывает его и включает счётчик; после перезагрузки баннера нет, счётчик работает', async () => {
    const first = at()
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(screen.queryByTestId('consent-banner')).toBeNull()
    await waitFor(() => expect(scripts()).toHaveLength(1))
    first.unmount()
    act(() => resetConsentForTests())
    at()
    expect(screen.queryByTestId('consent-banner')).toBeNull()
    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted')
    await waitFor(() => expect(scripts()).toHaveLength(1))
  })

  it('ссылка в подвале открывает выбор заново; новый выбор отзывает прежний', async () => {
    at()
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    await waitFor(() => expect(scripts()).toHaveLength(1))
    await userEvent.click(screen.getByRole('button', { name: 'Analytics settings' }))
    expect(screen.getByTestId('consent-banner')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }))
    expect(screen.queryByTestId('consent-banner')).toBeNull()
    expect(disableFlag()).toBe(true)
    expect(localStorage.getItem(CONSENT_KEY)).toBe('denied')
  })
})
