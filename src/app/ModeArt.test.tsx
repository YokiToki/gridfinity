// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import { routes } from './routes'
import { ART } from './ModeArt'
import { MODES } from './modes'

const getModelClient = vi.fn()
vi.mock('./useModel', () => ({ useModel: () => ({ model: null, busy: false, pending: false, error: null }), getModelClient: (...a: unknown[]) => getModelClient(...a) }))
vi.mock('../features/viewport/Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }))

const BUDGET = 60 * 1024

describe('иллюстрации карточек', () => {
  it('у каждого режима есть арт: валидный SVG до 60 КБ, тона классами, без цветов', () => {
    for (const { id } of MODES) {
      const svg = ART[id]
      expect(svg.length, id).toBeGreaterThan(500)
      expect(svg.length, id).toBeLessThanOrEqual(BUDGET)
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
      expect(doc.querySelector('parsererror'), id).toBeNull()
      expect(doc.documentElement.getAttribute('viewBox'), id).toBeTruthy()
      expect(doc.querySelectorAll('[class^="art-t"]').length, id).toBeGreaterThanOrEqual(3)
      expect(doc.querySelector('.art-edge'), id).not.toBeNull()
      expect(svg, id).not.toMatch(/fill="|stroke="|style=/)
    }
  })
})

describe('стартовая страница Gridfinity с рендерами', () => {
  beforeEach(async () => { getModelClient.mockClear(); await i18n.changeLanguage('en') })
  it('каждая карточка содержит декоративный svg с классами арта', () => {
    render(<I18nextProvider i18n={i18n}><RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/gridfinity'] })} /></I18nextProvider>)
    for (const { id } of MODES) {
      const art = screen.getByTestId(`art-${id}`)
      expect(art).toHaveAttribute('aria-hidden', 'true')
      expect(art.querySelector('svg')).not.toBeNull()
      expect(art.querySelector('.art-t3, .art-t2')).not.toBeNull()
      expect(art.querySelector('[fill]:not([fill-rule])')).toBeNull()
    }
  })
  it('воркер не стартует, вьюпорт и WebGL не создаются', () => {
    const worker = vi.fn()
    vi.stubGlobal('Worker', worker)
    render(<I18nextProvider i18n={i18n}><RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/gridfinity'] })} /></I18nextProvider>)
    expect(worker).not.toHaveBeenCalled()
    expect(getModelClient).not.toHaveBeenCalled()
    expect(screen.queryByTestId('viewport')).toBeNull()
    vi.unstubAllGlobals()
  })
})
