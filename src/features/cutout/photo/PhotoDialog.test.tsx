// @vitest-environment jsdom
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../../i18n'
import { defaultCutout, type CutoutParams } from '../../../geometry/cutout'
import { paperSize } from '../../../geometry/photo/paper'
import { rectObject, discObject, syntheticPhoto } from '../../../geometry/photo/synthetic'
import { UnitContext } from '../../../ui/units'
import { CutoutPanel } from '../CutoutPanel'
import { ImageError } from '../../keychain/decodeImage'
import { insetCorners } from './usePhotoTrace'

const decode = vi.hoisted(() => vi.fn())
vi.mock('../../keychain/decodeImage', async (orig) => ({ ...(await orig<typeof import('../../keychain/decodeImage')>()), decodeImage: decode }))

const A4 = paperSize('a4', 'landscape')
const W = 800, H = 600
/** Снимок, на котором лист занимает ровно начальные углы мастера (отступ 15 %): перспективы нет, углы верны с первого раза. */
const photo = () => syntheticPhoto({
  paper: A4, quad: insetCorners(W, H), width: W, height: H,
  objects: [rectObject(40, 60, 40, 20), discObject(190, 130, 15)],
})
const goodFile = () => new File(['x'], 'tools.jpg', { type: 'image/jpeg' })

let latest: CutoutParams = defaultCutout
let selection: string | null = null
function Harness() {
  const [p, setP] = useState(defaultCutout)
  const [sel, setSel] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ id: string; x: number; y: number } | null>(null)
  const [snap, setSnap] = useState(true)
  latest = p; selection = sel
  return (
    <UnitContext.Provider value={{ unit: 'mm', setUnit: () => {} }}>
      <CutoutPanel params={p} onChange={setP} selectedId={sel} onSelect={setSel} meshes={new Map()} onImport={() => {}} importMessage={null} draft={draft} onDraft={setDraft} snap={snap} onSnap={setSnap} />
    </UnitContext.Provider>
  )
}
const openCutouts = async () => { await userEvent.click(screen.getByRole('button', { name: /Expand: Cutouts/ })) }
const open = async () => { await openCutouts(); await userEvent.click(screen.getByRole('button', { name: 'From photo' })) }
const load = async () => {
  decode.mockResolvedValue({ image: photo(), original: { width: W, height: H }, downscaled: false })
  await userEvent.upload(screen.getByTestId('photo-input'), goodFile())
  await screen.findByTestId('photo-name')
}

beforeEach(async () => { await i18n.changeLanguage('en'); latest = defaultCutout; selection = null; decode.mockReset() })

describe('окно «Из фото»: снимок и бумага (3.1)', () => {
  it('кнопка открывает окно; Esc закрывает и возвращает фокус на кнопку', async () => {
    render(<Harness />)
    await open()
    expect(screen.getByRole('dialog', { name: 'Cutouts from a photo' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: 'From photo' })).toHaveFocus())
  })

  it('щелчок по затемнению закрывает окно', async () => {
    render(<Harness />)
    await open()
    fireEvent.mouseDown(screen.getByTestId('photo-backdrop'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('неподдерживаемый файл: сообщение, снимка нет, «Далее» недоступна', async () => {
    decode.mockRejectedValue(new ImageError('unsupported', 'bad'))
    render(<Harness />)
    await open()
    await userEvent.upload(screen.getByTestId('photo-input'), new File(['x'], 'doc.pdf', { type: 'application/pdf' }), { applyAccept: false })
    expect(await screen.findByText(/Unsupported file/)).toBeInTheDocument()
    expect(screen.queryByTestId('photo-name')).toBeNull()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('форматы бумаги: A4 альбомный 297 × 210, Letter книжный 215.9 × 279.4, свой размер', async () => {
    render(<Harness />)
    await open()
    expect(screen.getByTestId('paper-size')).toHaveTextContent('297 mm × 210 mm')
    await userEvent.click(screen.getByRole('button', { name: 'US Letter' }))
    await userEvent.click(screen.getByRole('button', { name: 'Portrait' }))
    expect(screen.getByTestId('paper-size')).toHaveTextContent('215.9 mm × 279.4 mm')
    await userEvent.click(screen.getByRole('button', { name: 'Custom' }))
    expect(screen.getByLabelText('Paper width')).toBeInTheDocument()
    const len = screen.getByLabelText('Paper length')
    await userEvent.clear(len); await userEvent.type(len, '500'); await userEvent.tab()
    expect(screen.getByTestId('paper-size')).toHaveTextContent('× 500 mm')
  })

  it('снимок и настройки переживают закрытие и повторное открытие окна', async () => {
    render(<Harness />)
    await open()
    await load()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await userEvent.click(screen.getByRole('button', { name: 'From photo' }))
    expect(screen.getByTestId('photo-name')).toHaveTextContent('tools.jpg')
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })
})

describe('окно «Из фото»: углы листа (3.2)', () => {
  const toStep2 = async () => { render(<Harness />); await open(); await load(); await userEvent.click(screen.getByRole('button', { name: 'Next' })) }
  const corner = (n: number) => screen.getByTestId(`corner-${n}`)
  const pos = (n: number) => [Number(corner(n).getAttribute('data-x')), Number(corner(n).getAttribute('data-y'))]

  it('четыре пронумерованные метки на начальных углах (отступ 15 %), подписи названы по положению', async () => {
    await toStep2()
    expect([1, 2, 3, 4].map(pos)).toEqual([[120, 90], [680, 90], [680, 510], [120, 510]])
    expect(corner(1)).toHaveAccessibleName('Corner 1: top left')
    expect(corner(3)).toHaveAccessibleName('Corner 3: bottom right')
  })

  it('перетаскивание метки двигает угол в пикселях снимка', async () => {
    await toStep2()
    const svg = screen.getByTestId('corner-svg')
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect // масштаб 2
    fireEvent.pointerDown(corner(1), { pointerId: 1 })
    fireEvent.pointerMove(svg, { clientX: 70, clientY: 40 })
    expect(pos(1)).toEqual([140, 80])
    fireEvent.pointerUp(svg)
    fireEvent.pointerMove(svg, { clientX: 10, clientY: 10 })
    expect(pos(1)).toEqual([140, 80]) // после отпускания метка не следует за курсором
  })

  it('стрелки двигают угол на 1 пиксель, Shift со стрелкой — на 10; за край снимка не выходит', async () => {
    await toStep2()
    corner(2).focus()
    await userEvent.keyboard('{ArrowRight}{ArrowDown}')
    expect(pos(2)).toEqual([681, 91])
    await userEvent.keyboard('{Shift>}{ArrowLeft}{ArrowUp}{/Shift}')
    expect(pos(2)).toEqual([671, 81])
    for (let i = 0; i < 12; i++) await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(pos(2)[1]).toBe(0)
  })

  it('«бабочка» (перекрещённые углы) — предупреждение, превью нет, «Далее» недоступна; верный порядок возвращает превью', async () => {
    await toStep2()
    expect(await screen.findByTestId('rectified-canvas')).toBeInTheDocument()
    const svg = screen.getByTestId('corner-svg')
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    fireEvent.pointerDown(corner(1))
    fireEvent.pointerMove(svg, { clientX: 680, clientY: 510 }) // левый верхний угол в правый нижний → самопересечение
    fireEvent.pointerUp(svg)
    expect(screen.getByRole('alert')).toHaveTextContent(/convex quadrilateral|wrong order|too close/)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    fireEvent.pointerDown(corner(1))
    fireEvent.pointerMove(svg, { clientX: 120, clientY: 90 })
    fireEvent.pointerUp(svg)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('зеркальный порядок даёт отдельное сообщение', async () => {
    await toStep2()
    const svg = screen.getByTestId('corner-svg')
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    // отразить расстановку по горизонтали (1↔2, 3↔4): обход получается против часовой стрелки
    const put = (n: number, x: number, y: number) => { fireEvent.pointerDown(corner(n)); fireEvent.pointerMove(svg, { clientX: x, clientY: y }); fireEvent.pointerUp(svg) }
    put(1, 680, 90); put(2, 120, 90); put(3, 120, 510); put(4, 680, 510)
    expect(screen.getByRole('alert')).toHaveTextContent('wrong order')
  })
})

describe('окно «Из фото»: силуэты (3.3) и создание (3.4)', () => {
  const toStep3 = async () => {
    render(<Harness />); await open(); await load()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled(), { timeout: 4000 }) // выпрямление считается после паузы
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('button', { name: /Create 2 cutouts/ }, { timeout: 4000 })
  }

  it('найдено два силуэта с размерами в мм; все выбраны, кнопка показывает число вырезов', async () => {
    await toStep3()
    const items = within(screen.getByRole('list', { name: 'Silhouettes' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Silhouette 1')
    expect(items[0]).toHaveTextContent(/40(\.\d+)? mm × 20(\.\d+)? mm/) // прямоугольник выше на листе, поэтому первый
    expect(items[1]).toHaveTextContent(/30(\.\d+)? mm × 30(\.\d+)? mm/)
    expect(screen.getAllByRole('checkbox').every((c) => (c as HTMLInputElement).checked)).toBe(true)
  }, 20000)

  it('флажок снимает силуэт с выбора, число на кнопке меняется; щелчок по силуэту на листе делает то же', async () => {
    await toStep3()
    const boxes = screen.getAllByRole('checkbox')
    await userEvent.click(boxes[0])
    expect(await screen.findByRole('button', { name: 'Create 1 cutouts' })).toBeInTheDocument()
    // щелчок по силуэту 1 (прямоугольник) на холсте возвращает его
    const canvas = screen.getByTestId('rectified-canvas')
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1188, height: 840, right: 1188, bottom: 840, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    fireEvent.click(canvas, { clientX: 60 * 4, clientY: 70 * 4 }) // центр прямоугольника (60, 70) мм
    expect(await screen.findByRole('button', { name: 'Create 2 cutouts' })).toBeInTheDocument()
    expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).checked).toBe(true)
    fireEvent.click(canvas, { clientX: 5, clientY: 5 }) // щелчок по фону ничего не меняет
    expect(screen.getByRole('button', { name: 'Create 2 cutouts' })).toBeInTheDocument()
  }, 20000)

  it('чувствительность: вручную и «Авто»; поле по краю доступно', async () => {
    await toStep3()
    expect(screen.getByTestId('sens-mode')).toHaveTextContent('automatic')
    const sens = screen.getByLabelText('Sensitivity')
    await userEvent.clear(sens); await userEvent.type(sens, '70'); await userEvent.tab()
    expect(screen.getByTestId('sens-mode')).toHaveTextContent('manual')
    await userEvent.click(screen.getByRole('button', { name: 'Auto' }))
    expect(screen.getByTestId('sens-mode')).toHaveTextContent('automatic')
    expect(screen.getByLabelText('Edge margin')).toBeInTheDocument()
  }, 20000)

  it('нет предметов: предупреждение и недоступная кнопка «Создать»', async () => {
    decode.mockResolvedValue({ image: syntheticPhoto({ paper: A4, quad: insetCorners(W, H), width: W, height: H }), original: { width: W, height: H }, downscaled: false })
    render(<Harness />); await open()
    await userEvent.upload(screen.getByTestId('photo-input'), goodFile())
    await screen.findByTestId('photo-name')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled(), { timeout: 4000 })
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText(/No objects found/, undefined, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create 0 cutouts/ })).toBeDisabled()
  }, 20000)

  it('Создать: два выреза-контура на своих местах, цвета 0 и 1, корпус — целые юниты, окно закрыто, выбран первый, фокус на кнопке', async () => {
    await toStep3()
    await userEvent.click(screen.getByRole('button', { name: 'Create 2 cutouts' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(latest.cutouts).toHaveLength(2)
    expect(latest.cutouts.every((c) => c.source.kind === 'outline')).toBe(true)
    expect(latest.cutouts.map((c) => c.color)).toEqual([0, 1])
    expect(latest.cutouts.map((c) => c.name)).toEqual(['Tool 1', 'Tool 2'])
    expect(selection).toBe(latest.cutouts[0].id)
    // прямоугольник (60, 70) мм и диск (190, 130) мм на листе: диск правее на 130 мм и ниже на 60 мм (ось y вверх)
    const [bar, disc] = latest.cutouts
    expect(disc.x - bar.x).toBeCloseTo(130, 0)
    expect(disc.y - bar.y).toBeCloseTo(-60, 0)
    expect(latest.x.mode).toBe('units')
    expect(latest.y.mode).toBe('units')
    expect(latest.x.value).toBeGreaterThanOrEqual(4) // 130 + запас по x
    await waitFor(() => expect(screen.getByRole('button', { name: 'From photo' })).toHaveFocus())
  }, 30000)

  it('глубина и зазор из окна попадают в вырезы; зазор по умолчанию 0.8 мм', async () => {
    await toStep3()
    expect(screen.getByLabelText('Clearance')).toHaveValue('0.8')
    const depth = screen.getByLabelText('Depth')
    await userEvent.clear(depth); await userEvent.type(depth, '7'); await userEvent.tab()
    await userEvent.click(screen.getByRole('button', { name: 'Create 2 cutouts' }))
    expect(latest.cutouts.every((c) => c.depth === 7 && c.clearance === 0.8)).toBe(true)
  }, 30000)

  it('прежние вырезы остаются, а при повторном создании цвета продолжаются', async () => {
    await toStep3()
    await userEvent.click(screen.getByRole('button', { name: 'Create 2 cutouts' }))
    await userEvent.click(screen.getByRole('button', { name: 'From photo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled(), { timeout: 4000 })
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Create 2 cutouts' }, { timeout: 4000 }))
    expect(latest.cutouts).toHaveLength(4)
    expect(latest.cutouts.map((c) => c.color)).toEqual([0, 1, 2, 3])
  }, 40000)

  it('на русском окно, шаги и кнопки подписаны', async () => {
    await i18n.changeLanguage('ru')
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: /Развернуть: Вырезы/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Из фото' }))
    expect(screen.getByRole('dialog', { name: 'Вырезы из фото' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выбрать фото' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Далее' })).toBeDisabled()
  })
})
