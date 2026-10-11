// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { routes } from '../../app/routes'
import { resetExportSettings } from '../../export/settings'

const generate = vi.fn()
vi.mock('../../app/useModel', () => ({
  useModel: (mode: string, params: unknown) => { generate(mode, params); return { model: null, busy: false, pending: false, error: null } },
  getModelClient: () => ({ registerMesh: () => {}, generate: async () => null }),
}))
vi.mock('../viewport/Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }))

const open = () => render(<I18nextProvider i18n={i18n}><RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/baseplate'] })} /></I18nextProvider>)

describe('Baseplate: принтер из общих настроек задаёт объём разрезания', () => {
  beforeEach(async () => { localStorage.clear(); resetExportSettings(); generate.mockClear(); await i18n.changeLanguage('en') })
  it('стол 256 с полем 5: область для разрезания 246 мм', async () => {
    localStorage.setItem('gridfinity.export', JSON.stringify({ printerId: 'a1', margin: 5 }))
    localStorage.setItem('gridfinity.baseplate', JSON.stringify({ x: { mode: 'units', value: 8, align: 'center' }, split: { enabled: true, source: 'plate' } }))
    open()
    await screen.findByTestId('viewport')
    const g = generate.mock.calls.at(-1)![1] as { split: { maxX: number; maxY: number } }
    expect(g.split.maxX).toBe(246)
    expect(g.split.maxY).toBe(246)
  })
  it('сменили принтер на A1 mini 180: область 170', async () => {
    localStorage.setItem('gridfinity.export', JSON.stringify({ printerId: 'a1-mini', margin: 5 }))
    localStorage.setItem('gridfinity.baseplate', JSON.stringify({ x: { mode: 'units', value: 8, align: 'center' }, split: { enabled: true, source: 'plate' } }))
    open()
    await screen.findByTestId('viewport')
    expect((generate.mock.calls.at(-1)![1] as { split: { maxX: number } }).split.maxX).toBe(170)
  })
})
