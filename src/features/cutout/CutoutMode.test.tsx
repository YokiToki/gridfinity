// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { routes } from '../../app/routes'
import { asciiStl, binaryStl, boxSoup, tSoup } from '../../geometry/stl-fixtures'

const registered: string[] = []
const generate = vi.fn()
vi.mock('../../app/useModel', () => ({
  useModel: (mode: string, params: unknown, opts?: { enabled?: boolean }) => { generate(mode, params, opts); return { model: null, busy: false, pending: false, error: null } },
  getModelClient: () => ({ registerMesh: (id: string) => registered.push(id), generate: async () => null }),
}))
vi.mock('../viewport/Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }))

const open = () => render(<I18nextProvider i18n={i18n}><RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/cutout'] })} /></I18nextProvider>)
const fileOf = (buf: ArrayBuffer, name: string) => new File([buf], name)

describe('режим Cutout: импорт STL', () => {
  beforeEach(async () => { globalThis.indexedDB = new IDBFactory(); localStorage.clear(); registered.length = 0; generate.mockClear(); await i18n.changeLanguage('en') })

  it('открывается: список пуст, 3D-вид есть, генерация идёт для корректных параметров', async () => {
    open()
    expect(await screen.findByText(/No cutouts yet/)).toBeInTheDocument()
    expect(screen.getByTestId('viewport')).toBeInTheDocument()
    await waitFor(() => expect(generate.mock.calls.at(-1)?.[2]).toMatchObject({ enabled: true }))
    expect(generate.mock.calls.at(-1)?.[0]).toBe('cutout')
  })
  it('валидный STL (бинарный и ASCII) добавляет вырез с именем файла и регистрирует сетку', async () => {
    open()
    await screen.findByText(/No cutouts yet/)
    await userEvent.upload(screen.getByTestId('stl-input'), fileOf(binaryStl(tSoup()), 'tool.stl'))
    expect(await screen.findByRole('button', { name: 'Select tool' })).toBeInTheDocument()
    expect(registered).toHaveLength(1)
    expect(screen.getByText('File: tool.stl')).toBeInTheDocument()
    expect(screen.getByText('Size: 60 mm × 60 mm × 10 mm')).toBeInTheDocument()
    await userEvent.upload(screen.getByTestId('stl-input'), fileOf(asciiStl(boxSoup(20, 10, 5)), 'box.STL'))
    expect(await screen.findByRole('button', { name: 'Select box' })).toBeInTheDocument()
    expect(registered).toHaveLength(2)
    const saved = JSON.parse(localStorage.getItem('gridfinity.cutout')!)
    expect(saved.cutouts).toHaveLength(2)
    expect(saved.cutouts[0].source).toMatchObject({ kind: 'mesh', filename: 'tool.stl', unit: 'mm', mode: 'projected' })
    expect(JSON.stringify(saved)).not.toContain('vertProperties') // сетка в IndexedDB, не в localStorage
  })
  it('ошибки: не STL, пустой файл, замкнутый объём отсутствует — сообщение и вырез не добавляется', async () => {
    open()
    await screen.findByText(/No cutouts yet/)
    await userEvent.upload(screen.getByTestId('stl-input'), fileOf(new TextEncoder().encode('hello').buffer as ArrayBuffer, 'a.stl'))
    expect(await screen.findByText('This is not a readable STL file.')).toBeInTheDocument()
    await userEvent.upload(screen.getByTestId('stl-input'), fileOf(binaryStl({ positions: new Float32Array(0) }), 'e.stl'))
    expect(await screen.findByText('The STL file has no triangles.')).toBeInTheDocument()
    const flat = { positions: Float32Array.from([0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 0, 0, 10, 0, 10, 0, 0]) } // плоский «двойной» треугольник без объёма
    await userEvent.upload(screen.getByTestId('stl-input'), fileOf(binaryStl(flat), 'flat.stl'))
    expect(await screen.findByText(/has no volume/)).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('gridfinity.cutout') ?? '{"cutouts":[]}').cutouts).toHaveLength(0)
    expect(registered).toHaveLength(0)
  })
  it('открытая сетка: вырез добавляется с предупреждением', async () => {
    open()
    await screen.findByText(/No cutouts yet/)
    const s = boxSoup(10, 10, 10)
    await userEvent.upload(screen.getByTestId('stl-input'), fileOf(binaryStl({ positions: s.positions.slice(0, 11 * 9) }), 'open.stl'))
    expect(await screen.findByText(/The mesh has holes/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Select open' })).toBeInTheDocument()
  })
  it('после перезагрузки сетка берётся из IndexedDB и снова регистрируется в воркере', async () => {
    const first = open()
    await screen.findByText(/No cutouts yet/)
    await userEvent.upload(screen.getByTestId('stl-input'), fileOf(binaryStl(tSoup()), 'tool.stl'))
    await screen.findByRole('button', { name: 'Select tool' })
    first.unmount()
    registered.length = 0
    open()
    expect(await screen.findByRole('button', { name: 'Select tool' }, { timeout: 5000 })).toBeInTheDocument()
    await waitFor(() => expect(registered).toHaveLength(1), { timeout: 5000 }) // чтение IndexedDB под нагрузкой полного прогона бывает долгим
    expect(screen.queryByText(/not stored on this device/)).toBeNull()
  })
  it('удаление выреза освобождает сетку в хранилище', async () => {
    open()
    await screen.findByText(/No cutouts yet/)
    await userEvent.upload(screen.getByTestId('stl-input'), fileOf(binaryStl(tSoup()), 'tool.stl'))
    await screen.findByRole('button', { name: 'Select tool' })
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Select tool' })).toBeNull())
    const db = await new Promise<IDBDatabase>((res) => { const r = indexedDB.open('gridfinity', 1); r.onsuccess = () => res(r.result) })
    const n = await new Promise<number>((res) => { const r = db.transaction('meshes').objectStore('meshes').count(); r.onsuccess = () => res(r.result) })
    expect(n).toBe(0)
  })
  it('сохранённые параметры без сетки в хранилище: вырез остаётся, предупреждение «не сохранена»', async () => {
    localStorage.setItem('gridfinity.cutout', JSON.stringify({ cutouts: [{ id: 'z', name: 'Gone', source: { kind: 'mesh', meshId: 'nope', filename: 'gone.stl', unit: 'mm', orientation: { faceDown: null, rx: 0, ry: 0, rz: 0 }, mode: 'projected', size: [10, 10, 5], hull: [[-5, -5], [5, -5], [5, 5], [-5, 5]] } }] }))
    open()
    await userEvent.click(await screen.findByRole('button', { name: 'Select Gone' }))
    expect(await screen.findByText(/not stored on this device/)).toBeInTheDocument()
  })
})
