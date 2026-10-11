// @vitest-environment jsdom
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { defaultCutout, rectCutout, type Cutout, type CutoutParams, type MeshSource, cutoutBounds } from '../../geometry/cutout'
import { defaultOrientation, describeMesh, repairMesh, type IndexedMesh } from '../../geometry/stl-import'
import { boxSoup } from '../../geometry/stl-fixtures'
import { UnitContext } from '../../ui/units'
import { CutoutPanel } from './CutoutPanel'

let latest: CutoutParams = defaultCutout
let selection: string | null = null
const onImport = vi.fn()

function Harness({ start = defaultCutout, meshes = new Map<string, IndexedMesh>(), message = null as null | { kind: 'error' | 'warn' | 'info'; text: string } }) {
  const [p, setP] = useState(start)
  const [sel, setSel] = useState<string | null>(start.cutouts[0]?.id ?? null)
  const [draft, setDraft] = useState<{ id: string; x: number; y: number } | null>(null)
  const [snap, setSnap] = useState(true)
  latest = p
  selection = sel
  return (
    <UnitContext.Provider value={{ unit: 'mm', setUnit: () => {} }}>
      <CutoutPanel params={p} onChange={setP} selectedId={sel} onSelect={setSel} meshes={meshes} onImport={onImport} importMessage={message}
        draft={draft} onDraft={setDraft} snap={snap} onSnap={setSnap} />
    </UnitContext.Provider>
  )
}
const r = (o: Omit<Partial<Cutout>, 'source'> & { source?: Partial<{ width: number; length: number; radius: number }> } = {}) => rectCutout({ clearance: 0, depth: 10, ...o })
const withCuts = (...c: Cutout[]): CutoutParams => ({ ...defaultCutout, cutouts: c })
const type = async (label: string, value: string) => {
  const f = screen.getByLabelText(label)
  await userEvent.clear(f); await userEvent.type(f, value); await userEvent.tab()
}
const rect = (w = 96, h = 96) => () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect

describe('CutoutPanel: список', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultCutout; selection = null; onImport.mockClear() })

  it('пусто: подсказка; «Добавить прямоугольник» ставит вырез по центру и выбирает его', async () => {
    render(<Harness />)
    expect(screen.getByText(/No cutouts yet/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add rectangle' }))
    expect(latest.cutouts).toHaveLength(1)
    expect([latest.cutouts[0].x, latest.cutouts[0].y]).toEqual([0, 0])
    expect(latest.cutouts[0].source).toMatchObject({ kind: 'rect', width: 40, length: 20, radius: 3 })
    expect(selection).toBe(latest.cutouts[0].id)
    expect(screen.getByLabelText('Name')).toHaveValue('Rectangle')
    expect(screen.getByText('1 cutouts')).toBeInTheDocument()
  })
  it('дублирование, порядок, скрытие и удаление', async () => {
    render(<Harness start={withCuts(r({ id: 'a', name: 'A' }), r({ id: 'b', name: 'B' }))} />)
    const list = () => within(screen.getByRole('list', { name: 'Cutouts' }))
    await userEvent.click(list().getAllByRole('button', { name: 'Duplicate' })[0])
    expect(latest.cutouts.map((c) => c.name)).toEqual(['A', 'A copy', 'B'])
    await userEvent.click(list().getAllByRole('button', { name: 'Move down' })[0])
    expect(latest.cutouts.map((c) => c.name)).toEqual(['A copy', 'A', 'B'])
    await userEvent.click(list().getAllByRole('button', { name: 'Hide' })[2])
    expect(latest.cutouts[2].visible).toBe(false)
    expect(list().getAllByRole('button', { name: 'Move up' })[0]).toBeDisabled()
    await userEvent.click(list().getAllByRole('button', { name: 'Delete' })[1])
    expect(latest.cutouts.map((c) => c.name)).toEqual(['A copy', 'B'])
  })
  it('удаление выбранного снимает выбор; переименование', async () => {
    render(<Harness start={withCuts(r({ id: 'a', name: 'A' }))} />)
    await type('Name', 'Pliers')
    expect(latest.cutouts[0].name).toBe('Pliers')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(selection).toBeNull()
    expect(screen.queryByText('Selected cutout')).toBeNull()
  })
  it('импорт: кнопка открывает выбор файла, файл и перетаскивание уходят в onImport, сообщение показывается', async () => {
    const { container } = render(<Harness message={{ kind: 'error', text: 'This is not a readable STL file.' }} />)
    const input = screen.getByTestId('stl-input')
    const file = new File([new Uint8Array(4)], 'x.stl')
    await userEvent.upload(input, file)
    expect(onImport).toHaveBeenCalledWith(file)
    const zone = container.querySelector('[class*="rounded-control"][class*="flex-col"]')!
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    expect(onImport).toHaveBeenCalledTimes(2)
    expect(screen.getByText('This is not a readable STL file.')).toBeInTheDocument()
  })
})

describe('CutoutPanel: свойства и размещение', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultCutout })

  it('размеры прямоугольника, глубина, зазор и поворот вводятся числами; X = 20 сдвигает центр на 20 мм', async () => {
    render(<Harness start={withCuts(r({ id: 'a' }))} />)
    await type('Width', '60'); await type('Length', '25'); await type('Corner radius', '4')
    expect(latest.cutouts[0].source).toMatchObject({ width: 60, length: 25, radius: 4 })
    await type('X from the centre', '20')
    expect(latest.cutouts[0].x).toBe(20)
    await type('Y from the centre', '-7.5')
    expect(latest.cutouts[0].y).toBe(-7.5)
    await type('Rotation, °', '30')
    expect(latest.cutouts[0].rotation).toBe(30)
    await type('Depth', '12'); await type('Clearance', '0.4')
    expect(latest.cutouts[0]).toMatchObject({ depth: 12, clearance: 0.4 })
  })
  it('по центру: габарит выреза встаёт в центр полости', async () => {
    render(<Harness start={withCuts(r({ id: 'a', x: 13, y: -7 }))} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand: Placement' }))
    await userEvent.click(screen.getByRole('button', { name: 'Centre X' }))
    expect([latest.cutouts[0].x, latest.cutouts[0].y]).toEqual([0, -7])
    await userEvent.click(screen.getByRole('button', { name: 'Centre' }))
    expect([latest.cutouts[0].x, latest.cutouts[0].y]).toEqual([0, 0])
  })
  it('к левой стенке с отступом 5 мм', async () => {
    render(<Harness start={withCuts(r({ id: 'a', x: 3 }))} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand: Placement' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Left' }).at(-1)!) // последняя «Left» — в блоке расположения
    expect(cutoutBounds(latest.cutouts[0]).minX).toBeCloseTo(-40.8 + 5, 9)
  })
  it('распределение по X и подгонка габарита', async () => {
    render(<Harness start={withCuts(r({ id: 'a', x: -30 }), r({ id: 'b', x: 10 }))} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand: Placement' }))
    await userEvent.click(screen.getByRole('button', { name: 'Distribute along X' }))
    const [a, b] = latest.cutouts.map(cutoutBounds)
    expect(a.minX).toBeCloseTo(-40.8 + 5, 6)
    expect(b.maxX).toBeCloseTo(40.8 - 5, 6)
    await userEvent.click(screen.getByRole('button', { name: 'Fit footprint' }))
    expect(latest.x.mode).toBe('mm')
    expect(latest.x.value).toBeLessThan(84)
  })
  it('предупреждения: близко к стенке (0.4 мм), друг к другу и ограничение глубины', () => {
    const near = r({ id: 'a', name: 'Near', source: { width: 20, length: 20, radius: 0 }, x: 40.8 - 10 - 0.4, depth: 100 })
    render(<Harness start={withCuts(near, r({ id: 'b', name: 'Other', source: { width: 20, length: 20, radius: 0 }, x: 40.8 - 10 - 0.4 - 20.2 }))} />)
    const text = screen.getAllByRole('alert').map((a) => a.textContent).join(' | ')
    expect(text).toContain('Near: less than 0.8 mm of wall to the outer wall.')
    expect(text).toContain('Near and Other are closer than 0.8 mm.')
    expect(text).toContain('Near: depth is limited to 15.55 mm')
  })
  it('без предупреждений, когда всё в норме', () => {
    render(<Harness start={withCuts(r({ id: 'a' }))} />)
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })
})

describe('CutoutPanel: вид сверху', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultCutout })
  const shape = () => screen.getAllByTestId('cutout-shape')[0]

  it('перетаскивание двигает вырез, поля X/Y обновляются сразу, параметры фиксируются при отпускании', () => {
    render(<Harness start={withCuts(r({ id: 'a', source: { width: 20, length: 10, radius: 0 }, x: 5.3, y: 3.3 }))} />)
    const svg = screen.getByTestId('top-view')
    svg.getBoundingClientRect = rect(93.6, 93.6) // 1 px = 1 мм (81.6 + 12)
    fireEvent.pointerDown(shape(), { clientX: 50, clientY: 50 })
    fireEvent.pointerMove(svg, { clientX: 63.7, clientY: 40.5, altKey: true }) // +13.7 мм по X, +9.5 по Y (вверх)
    expect(screen.getByLabelText('X from the centre')).toHaveValue('19')
    expect(screen.getByLabelText('Y from the centre')).toHaveValue('12.8')
    expect(latest.cutouts[0].x).toBe(5.3) // пока не отпустили — параметры прежние
    fireEvent.pointerUp(svg)
    expect(latest.cutouts[0].x).toBeCloseTo(19, 6)
    expect(latest.cutouts[0].y).toBeCloseTo(12.8, 6)
  })
  it('привязка к центру: рядом с осью вырез встаёт в 0 и показывается направляющая', () => {
    render(<Harness start={withCuts(r({ id: 'a', source: { width: 20, length: 10, radius: 0 }, x: 10, y: 10 }))} />)
    const svg = screen.getByTestId('top-view')
    svg.getBoundingClientRect = rect(93.6, 93.6)
    fireEvent.pointerDown(shape(), { clientX: 50, clientY: 50 })
    fireEvent.pointerMove(svg, { clientX: 50 - 9.2, clientY: 50 + 8.8 }) // x ≈ 0.8, y ≈ 1.2
    expect(screen.getByTestId('guide-x')).toBeInTheDocument()
    expect(screen.getByTestId('guide-y')).toBeInTheDocument()
    fireEvent.pointerUp(svg)
    expect(latest.cutouts[0].x).toBeCloseTo(0, 6)
    expect(latest.cutouts[0].y).toBeCloseTo(0, 6)
    expect(screen.queryByTestId('guide-x')).toBeNull()
  })
  it('Alt и переключатель отключают привязку', async () => {
    render(<Harness start={withCuts(r({ id: 'a', source: { width: 20, length: 10, radius: 0 }, x: 10, y: 10 }))} />)
    const svg = screen.getByTestId('top-view')
    svg.getBoundingClientRect = rect(93.6, 93.6)
    fireEvent.pointerDown(shape(), { clientX: 50, clientY: 50 })
    fireEvent.pointerMove(svg, { clientX: 50 - 9.2, clientY: 50 + 8.8, altKey: true })
    fireEvent.pointerUp(svg)
    expect(latest.cutouts[0].x).toBeCloseTo(0.8, 6)
    await userEvent.click(screen.getByRole('button', { name: 'Expand: Placement' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Snap while dragging' }))
    fireEvent.pointerDown(shape(), { clientX: 50, clientY: 50 })
    fireEvent.pointerMove(svg, { clientX: 49.4, clientY: 50 })
    fireEvent.pointerUp(svg)
    expect(latest.cutouts[0].x).toBeCloseTo(0.8 - 0.6, 6)
  })
  it('клик по контуру выбирает вырез; скрытые не рисуются; зазор увеличивает контур', () => {
    render(<Harness start={withCuts(r({ id: 'a', name: 'A', clearance: 1 }), { ...r({ id: 'b', name: 'B' }), visible: false })} />)
    expect(screen.getAllByTestId('cutout-shape')).toHaveLength(1)
    expect(shape().getAttribute('width')).toBe('42') // 40 + 2·1
    fireEvent.pointerDown(shape())
    expect(selection).toBe('a')
  })
})

describe('CutoutPanel: деталь из STL', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultCutout })
  const mesh = repairMesh(boxSoup(10, 20, 30)).mesh
  const base = (): Cutout => {
    const info = describeMesh(mesh.vertProperties, 'mm', defaultOrientation)
    const source: MeshSource = { kind: 'mesh', meshId: 'm1', filename: 'block.stl', unit: 'mm', orientation: defaultOrientation, mode: 'projected', size: info.size, hull: info.hull }
    return { id: 'a', name: 'Block', source, x: 0, y: 0, rotation: 0, depth: 10, clearance: 0.5, visible: true }
  }
  const start = () => withCuts(base())

  it('файл, размер и режимы: единицы мм ↔ дюймы пересчитывают размер', async () => {
    render(<Harness start={start()} meshes={new Map([['m1', mesh]])} />)
    expect(screen.getByText('File: block.stl')).toBeInTheDocument()
    expect(screen.getByText('Size: 10 mm × 20 mm × 30 mm')).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('group', { name: 'File units' })).getByRole('button', { name: 'inch' }))
    const s = latest.cutouts[0].source as MeshSource
    expect(s.unit).toBe('in')
    expect(s.size[0]).toBeCloseTo(254, 3)
    expect(s.hull.length).toBeGreaterThanOrEqual(4)
  })
  it('режим резки: проекция и настоящее 3D с пояснением про зазор', async () => {
    render(<Harness start={start()} meshes={new Map([['m1', mesh]])} />)
    expect(screen.queryByText(/True 3D follows the part/)).toBeNull()
    await userEvent.click(within(screen.getByRole('group', { name: 'Cutting mode' })).getByRole('button', { name: 'True 3D' }))
    expect((latest.cutouts[0].source as MeshSource).mode).toBe('3d')
    expect(screen.getByText(/True 3D follows the part/)).toBeInTheDocument()
  })
  it('«Положить на грань»: самая большая грань на дно — высота 10, габарит 20 × 30', async () => {
    render(<Harness start={start()} meshes={new Map([['m1', mesh]])} />)
    const select = screen.getByLabelText('Lay flat on') as HTMLSelectElement
    expect([...select.options].map((o) => o.value)).toEqual(['free', '0', '1', '2', '3', '4', '5'])
    await userEvent.selectOptions(select, '0')
    const s = latest.cutouts[0].source as MeshSource
    expect(s.orientation.faceDown).not.toBeNull()
    expect(s.size[2]).toBeCloseTo(10, 3)
    expect(s.size[0] * s.size[1]).toBeCloseTo(600, 2)
    expect(select.value).toBe('0')
    await userEvent.selectOptions(select, 'free')
    expect((latest.cutouts[0].source as MeshSource).orientation.faceDown).toBeNull()
  })
  it('повороты по 90° вокруг осей меняют размеры', async () => {
    render(<Harness start={start()} meshes={new Map([['m1', mesh]])} />)
    await userEvent.click(screen.getByRole('button', { name: 'Rotate Z 90°' }))
    expect((latest.cutouts[0].source as MeshSource).size.map((v) => +v.toFixed(3))).toEqual([20, 10, 30])
    await userEvent.click(screen.getByRole('button', { name: 'Rotate X 90°' }))
    expect((latest.cutouts[0].source as MeshSource).size.map((v) => +v.toFixed(3))).toEqual([30, 10, 20]) // порядок поворотов: X, затем Y, затем Z
  })
  it('сетки нет на устройстве: предупреждение, настройки доступны', () => {
    render(<Harness start={start()} />)
    expect(screen.getByText(/not stored on this device/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Lay flat on')).toBeNull()
  })
  it('русская локаль', async () => {
    await i18n.changeLanguage('ru')
    render(<Harness start={start()} meshes={new Map([['m1', mesh]])} />)
    expect(screen.getByText('Импорт STL')).toBeInTheDocument()
    expect(screen.getByLabelText('Положить на грань')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Режим выреза' })).toBeInTheDocument()
  })
})
