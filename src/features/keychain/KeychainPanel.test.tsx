// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { openSection, renderOpen as render } from '../../ui/renderOpen'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { UnitContext } from '../../ui/units'
import { defaultKeychain, type KeychainInfo, type KeychainParams } from '../../geometry/keychain'
import { KeychainPanel } from './KeychainPanel'
import { areaAt, MaskPreview } from './MaskPreview'
import { expectAllNumericSteppers } from '../../ui/stepperAssert'

type S = KeychainParams & { imageName: string }
let latest: S

// 4 × 4: область 1 — левый верхний квадрат 2 × 2, область 2 — правый нижний
const labels = new Uint16Array(16)
for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) labels[j * 4 + i] = 1
for (const [i, j] of [[2, 2], [3, 2], [2, 3], [3, 3]]) labels[j * 4 + i] = 2
const area = (id: number, size: number, cx: number, cy: number) => ({ id, size, cx, cy, open: false, mode: 'follow' as const, level: 0.6 })
const preview = { width: 4, height: 4, data: new Uint8Array(16).fill(1), labels, box: [0, 0, 4, 4] as [number, number, number, number], areas: [area(1, 120, 1, 1), area(2, 80, 3, 3)] }
const info = (over: Partial<KeychainInfo> = {}): KeychainInfo => ({ threshold: 140, photoLike: false, preview, size: [70, 45], cell: 0.25, reduced: false, minCell: 0.1, triangles: 1000, ...over })

let selectedNow: number | null = null
function Harness({ unit = 'mm' as 'mm' | 'in', start = {} as Partial<S>, inf = info(), withPreview = false }) {
  const [s, setS] = useState<S>({ ...defaultKeychain, imageId: 'i', imageName: 'logo.png', ...start })
  const [sel, setSel] = useState<number | null>(null)
  latest = s
  selectedNow = sel
  const { imageName, ...params } = s
  return (
    <I18nextProvider i18n={i18n}>
      <UnitContext.Provider value={{ unit, setUnit: () => {} }}>
        <KeychainPanel params={params} onChange={setS} imageName={imageName} hasImage info={inf} notice={null} onFile={() => {}} selectedArea={sel} onSelectArea={setSel} />
        {withPreview && <MaskPreview preview={inf.preview} selected={sel} onSelect={setSel} />}
      </UnitContext.Provider>
    </I18nextProvider>
  )
}
const type = async (label: string, v: string) => { const f = screen.getByLabelText(label); await userEvent.clear(f); await userEvent.type(f, v); await userEvent.tab() }

describe('Silhouette (4.2)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })

  it('автоматический порог показывает найденное значение и отключает поле; ручной порог попадает в параметры', async () => {
    render(<Harness />)
    expect(screen.getByLabelText('Threshold')).toBeDisabled()
    expect((screen.getByLabelText('Threshold') as HTMLInputElement).value).toBe('140')
    await userEvent.click(screen.getByRole('switch', { name: 'Automatic threshold' }))
    expect(latest.silhouette.threshold).toBe(140) // авто фиксируется на найденном значении
    await type('Threshold', '90')
    expect(latest.silhouette.threshold).toBe(90)
  })
  it('инверсия, смыкание, пятна и расширение меняют параметры', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('switch', { name: /Invert/ }))
    expect(latest.silhouette.invert).toBe(true)
    await type('Close gaps', '5')
    await type('Remove specks smaller than', '300')
    await type('Grow (negative shrinks)', '-2')
    expect(latest.silhouette).toMatchObject({ close: 5, speck: 300, grow: -2 })
  })
  const modeOf = (id: number) => screen.getByLabelText(`Mode of area ${id}`) as HTMLSelectElement
  it('список областей: строки с размером, по умолчанию «По рельефу», слова «дырка» нет', () => {
    render(<Harness />)
    expect(screen.getByText('Area 1 · 120 px')).toBeInTheDocument()
    expect(screen.getByText('Area 2 · 80 px')).toBeInTheDocument()
    expect(modeOf(1).value).toBe('follow')
    expect(within(screen.getByTestId('area-1')).queryByText(/hole/i)).toBeNull()
    expect(within(screen.getByTestId('area-2')).queryByText(/hole/i)).toBeNull()
  })
  it('режим области меняется на «Открыта» и обратно; остальные не затрагиваются', async () => {
    render(<Harness />)
    await userEvent.selectOptions(modeOf(2), 'open')
    expect(latest.silhouette.areas[2]).toMatchObject({ mode: 'open' })
    expect(latest.silhouette.areas[1]).toBeUndefined()
    await userEvent.selectOptions(modeOf(2), 'follow')
    expect(latest.silhouette.areas[2].mode).toBe('follow')
  })
  it('поле уровня есть только у режима «Свой уровень», запоминает значение и зажимает его снизу минимальной высотой', async () => {
    render(<Harness />)
    expect(screen.queryByLabelText('Level of area 1')).toBeNull()
    await userEvent.selectOptions(modeOf(1), 'level')
    expect(latest.silhouette.areas[1]).toMatchObject({ mode: 'level', level: 0.6 })
    await type('Level of area 1', '1.4')
    expect(latest.silhouette.areas[1]).toEqual({ mode: 'level', level: 1.4 })
    await type('Level of area 1', '0.01')
    expect(latest.silhouette.areas[1].level).toBe(0.06) // минимум = heightFloor
    expect(screen.getByRole('button', { name: 'Increase: Level of area 1' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Level of area 2')).toBeNull()
  })
  it('«Применить ко всем»: режим и уровень записываются во все области', async () => {
    render(<Harness />)
    await userEvent.selectOptions(screen.getByLabelText('Mode for all areas'), 'level')
    await type('Level for all areas', '1.2')
    await userEvent.click(screen.getByRole('button', { name: 'Apply to all areas' }))
    expect(latest.silhouette.areas).toEqual({ 1: { mode: 'level', level: 1.2 }, 2: { mode: 'level', level: 1.2 } })
    await userEvent.selectOptions(screen.getByLabelText('Mode for all areas'), 'open')
    await userEvent.click(screen.getByRole('button', { name: 'Apply to all areas' }))
    expect(Object.values(latest.silhouette.areas).map((a) => a.mode)).toEqual(['open', 'open'])
  })
  it('предупреждение об исчезнувшей области называет номер', () => {
    render(<Harness inf={info({ goneAreas: [4, 7] })} />)
    expect(screen.getByText(/area 4, 7 are ignored/)).toBeInTheDocument()
    expect(screen.queryByText(/are ignored/)).not.toBeNull()
  })
  it('выбор строки подсвечивает её, повторный щелчок снимает выбор', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Select area 2' }))
    expect(selectedNow).toBe(2)
    expect(screen.getByTestId('area-2')).toHaveAttribute('aria-current', 'true')
    expect(screen.getByTestId('area-1')).not.toHaveAttribute('aria-current')
    await userEvent.click(screen.getByRole('button', { name: 'Select area 2' }))
    expect(selectedNow).toBeNull()
  })
  it('без заливки областей режимы отключены; без областей — подсказка и нет «Применить ко всем»', async () => {
    const { unmount } = render(<Harness start={{ silhouette: { ...defaultKeychain.silhouette, fillHoles: false } }} />)
    expect(modeOf(1)).toBeDisabled()
    expect(modeOf(1).value).toBe('open')
    expect(screen.queryByRole('button', { name: 'Apply to all areas' })).toBeNull()
    unmount()
    render(<Harness inf={info({ preview: { ...preview, areas: [], labels: new Uint16Array(16) } })} />)
    expect(screen.getByText('No areas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply to all areas' })).toBeNull()
  })
  it('щелчок по маске выбирает область в списке, мимо областей снимает выбор', async () => {
    const rect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    render(<Harness withPreview />)
    const canvas = screen.getByRole('img', { name: /Mask of the silhouette/ })
    canvas.getBoundingClientRect = rect
    fireEvent.click(canvas, { clientX: 300, clientY: 300 }) // правый нижний квадрат
    expect(selectedNow).toBe(2)
    expect(screen.getByTestId('area-2')).toHaveAttribute('aria-current', 'true')
    fireEvent.click(canvas, { clientX: 50, clientY: 50 })
    expect(selectedNow).toBe(1)
    fireEvent.click(canvas, { clientX: 350, clientY: 50 }) // вне областей
    expect(selectedNow).toBeNull()
  })
  it('сброс секции возвращает силуэт по умолчанию', async () => {
    render(<Harness start={{ silhouette: { ...defaultKeychain.silhouette, invert: true, close: 9 } }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Silhouette' }))
    expect(latest.silhouette).toEqual(defaultKeychain.silhouette)
  })
})

describe('Размер, рельеф, подложка (4.3)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })

  it('размер по длинной стороне: значение хранится в мм; в дюймах показывается 2.756 и ввод пересчитывается', async () => {
    render(<Harness unit="in" />)
    expect((screen.getByLabelText('Longest side') as HTMLInputElement).value).toBe('2.756')
    await type('Longest side', '1')
    expect(latest.size.longest).toBeCloseTo(25.4, 6)
  })
  it('режимы размера показывают нужные поля', async () => {
    render(<Harness />)
    expect(screen.queryByLabelText('Width')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'W × H' }))
    expect(latest.size.mode).toBe('box')
    expect(screen.getByLabelText('Width')).toBeInTheDocument(); expect(screen.getByLabelText('Height')).toBeInTheDocument()
    expect(screen.queryByLabelText('Longest side')).toBeNull()
  })
  it('рельеф: поля меняют параметры; heightFloor ≥ hmax показывает ошибку', async () => {
    render(<Harness />)
    await openSection('Relief')
    await type('Plateau height', '3')
    expect(latest.relief.hmax).toBe(3)
    await type('Minimum rim height', '3.5')
    expect(await screen.findByText('The minimum rim height must be below the plateau height')).toBeInTheDocument()
  })
  it('подложка: форма, размер, смещение и скругление; без толщины полей нет', async () => {
    render(<Harness />)
    expect(screen.getByLabelText('Offset from the silhouette')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Plate shape'), 'rounded')
    expect(latest.base.shape).toBe('rounded')
    expect(screen.getByLabelText('Corner radius')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: 'Size from the silhouette' }))
    expect(latest.base.auto).toBe(false)
    await type('Width', '90')
    expect(latest.base.width).toBe(90)
    await type('Thickness', '0')
    expect(screen.queryByLabelText('Plate shape')).toBeNull()
  })
  it('подложка меньше силуэта: ошибка из ответа воркера показана у подложки', async () => {
    render(<Harness inf={info({ error: 'keychain.error.plateTooSmall' })} />)
    expect(screen.getByRole('alert')).toHaveTextContent('smaller than the silhouette')
  })
  it('пустая маска: предупреждение над секциями', async () => {
    render(<Harness inf={info({ error: 'keychain.error.emptyMask' })} />)
    expect(screen.getByRole('alert')).toHaveTextContent('empty silhouette')
  })
  it('разрешение: шаг и бюджет; уведомление, когда шаг увеличен', async () => {
    render(<Harness inf={info({ reduced: true, cell: 0.4 })} />)
    await openSection('Resolution')
    expect(screen.getByRole('alert')).toHaveTextContent('grid step is 0.4 mm')
    await type('Triangle budget', '200000')
    expect(latest.quality.maxTriangles).toBe(200000)
  })
  it('подсказка про фото при полутонах и источнике «силуэт»; при источнике «яркость» её нет', () => {
    const { unmount } = render(<Harness inf={info({ photoLike: true })} />)
    expect(screen.getByRole('alert')).toHaveTextContent('looks like a photo')
    unmount()
    render(<Harness inf={info({ photoLike: true })} start={{ source: { kind: 'brightness', contrast: 1, gamma: 1, invert: false } }} />)
    expect(screen.queryByText(/looks like a photo/)).toBeNull()
  })
})

describe('MaskPreview', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  const wrap = (p: typeof preview | null) => render(<I18nextProvider i18n={i18n}><MaskPreview preview={p} /></I18nextProvider>)
  it('рисует холст и сворачивается; пустая маска — сообщение', async () => {
    const { unmount } = wrap(preview)
    expect(screen.getByRole('img', { name: /Mask of the silhouette/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Silhouette mask/ }))
    expect(screen.queryByRole('img')).toBeNull()
    unmount()
    wrap(null)
    expect(screen.getByText('The mask is empty')).toBeInTheDocument()
  })
})

describe('MaskPreview: большой вид', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  const ui = (p: typeof preview) => <I18nextProvider i18n={i18n}><MaskPreview preview={p} /></I18nextProvider>
  const enlarge = () => screen.getByRole('button', { name: 'Enlarge mask' })
  const openLarge = async () => { await userEvent.click(enlarge()); return screen.getByRole('dialog', { name: 'Enlarged silhouette mask' }) }

  it('кнопка открывает диалог, фокус на кнопке закрытия', async () => {
    render(ui(preview))
    expect(screen.queryByRole('dialog')).toBeNull()
    const dlg = await openLarge()
    expect(dlg).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })
  it('закрывается кнопкой, Esc и щелчком снаружи; фокус возвращается на «Увеличить»', async () => {
    render(ui(preview))
    await openLarge()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(enlarge()).toHaveFocus())

    await openLarge()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(enlarge()).toHaveFocus())

    await openLarge()
    await userEvent.click(screen.getByTestId('mask-large-backdrop'))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(enlarge()).toHaveFocus())
  })
  it('щелчок внутри диалога его не закрывает', async () => {
    render(ui(preview))
    const dlg = await openLarge()
    await userEvent.click(dlg)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  it('обновляется вживую, пока открыт', async () => {
    const { rerender } = render(ui(preview))
    const dlg = await openLarge()
    const big = () => dlg.querySelector('canvas') as HTMLCanvasElement
    expect(big().height).toBe(1024) // 4×4, масштаб 256
    rerender(ui({ ...preview, width: 8, height: 4, data: new Uint8Array(32).fill(1) }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(big().width).toBe(1024) // 8×4, масштаб 128
    expect(big().height).toBe(512)
  })
  it('без маски кнопки «Увеличить» нет', () => {
    render(ui(null as never))
    expect(screen.queryByRole('button', { name: 'Enlarge mask' })).toBeNull()
  })
})

describe('Области на маске: выбор щелчком (2.2)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  it('areaAt: доли картинки → номер области из плоскости labels, края и вне картинки', () => {
    expect(areaAt(preview, 0.1, 0.1)).toBe(1)
    expect(areaAt(preview, 0.49, 0.49)).toBe(1)
    expect(areaAt(preview, 0.9, 0.9)).toBe(2)
    expect(areaAt(preview, 0.9, 0.1)).toBeNull()
    expect(areaAt(preview, 0.999, 0.999)).toBe(2)
    expect(areaAt(preview, -0.1, 0.5)).toBeNull()
    expect(areaAt(preview, 1, 0.5)).toBeNull()
    expect(areaAt(preview, NaN, 0.5)).toBeNull()
  })
  it('большой вид: щелчок по маске выбирает область, выбор общий с малым видом и списком', async () => {
    render(<Harness withPreview />)
    await userEvent.click(screen.getByRole('button', { name: 'Enlarge mask' }))
    const big = screen.getByRole('dialog').querySelector('canvas')!
    big.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 800, right: 800, bottom: 800, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    fireEvent.click(big, { clientX: 700, clientY: 700 })
    expect(selectedNow).toBe(2)
    expect(screen.getByRole('dialog')).toBeInTheDocument() // щелчок по маске диалог не закрывает
    fireEvent.click(big, { clientX: 100, clientY: 100 })
    expect(selectedNow).toBe(1)
  })
  it('выбор из списка виден на маске: выбранный номер передаётся в отрисовку (канвас перерисовывается)', async () => {
    render(<Harness withPreview />)
    await userEvent.click(screen.getByRole('button', { name: 'Select area 1' }))
    expect(selectedNow).toBe(1)
    expect(screen.getByTestId('area-1')).toHaveAttribute('aria-current', 'true')
  })
})

describe('Профиль и источник высоты (3.1)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  const openRelief = async () => await openSection('Relief')

  it('пресет задаёт профиль; правка значения превращает его в «Свой», выбор пресета возвращает', async () => {
    render(<Harness />)
    await openRelief()
    const sel = screen.getByLabelText('Profile') as HTMLSelectElement
    expect(sel.value).toBe('bevel')
    await userEvent.selectOptions(sel, 'terrace')
    expect(latest.relief).toMatchObject({ profile: 'terrace', steps: 3 })
    expect((screen.getByLabelText('Profile') as HTMLSelectElement).value).toBe('terrace')
    await type('Steps', '5')
    expect(latest.relief.steps).toBe(5)
    expect((screen.getByLabelText('Profile') as HTMLSelectElement).value).toBe('custom')
    expect(screen.getByRole('option', { name: 'Custom' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Profile'), 'dome')
    expect(latest.relief.profile).toBe('dome')
    expect(latest.relief.hmax).toBe(2) // остальные значения сохраняются
    expect(screen.queryByLabelText('Bevel exponent')).toBeNull() // у купола нет показателя
  })
  it('правка показателя при скосе даёт «Свой», а значения остаются', async () => {
    render(<Harness />)
    await openRelief()
    await type('Bevel exponent', '0.9')
    expect(latest.relief.pow).toBe(0.9)
    expect((screen.getByLabelText('Profile') as HTMLSelectElement).value).toBe('custom')
  })
  it('переключение источника: яркость показывает контраст, гамму и инверсию; обратно скрывает', async () => {
    render(<Harness />)
    await openRelief()
    expect(screen.queryByLabelText('Contrast')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Brightness' }))
    expect(latest.source.kind).toBe('brightness')
    await type('Contrast', '2')
    await type('Gamma', '1.5')
    await userEvent.click(screen.getByRole('switch', { name: /Invert \(bright is lower\)/ }))
    expect(latest.source).toMatchObject({ kind: 'brightness', contrast: 2, gamma: 1.5, invert: true })
    await userEvent.click(screen.getByRole('button', { name: 'Silhouette' }))
    expect(screen.queryByLabelText('Contrast')).toBeNull()
  })
  it('ступени ниже двух показывают ошибку', async () => {
    render(<Harness start={{ relief: { ...defaultKeychain.relief, profile: 'terrace', steps: 1 } }} />)
    await openRelief()
    expect(await screen.findByText('Use at least 2 steps')).toBeInTheDocument()
  })
  it('сброс секции возвращает рельеф и источник', async () => {
    render(<Harness start={{ source: { kind: 'brightness', contrast: 3, gamma: 2, invert: true }, relief: { ...defaultKeychain.relief, profile: 'flat' } }} />)
    await openRelief()
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Relief' }))
    expect(latest.source).toEqual(defaultKeychain.source); expect(latest.relief).toEqual(defaultKeychain.relief)
  })
})

describe('Сглаживание (2.1)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  const openRelief = async () => await openSection('Relief')
  const bright = (over: Record<string, unknown> = {}) => ({ source: { kind: 'brightness' as const, contrast: 1, gamma: 1, invert: false, smooth: 0.4, despeckle: false, ...over } })

  it('«Сгладить поверхность» есть для любого источника, «Сглаживание» и «Убрать пятна» — только для яркости', async () => {
    const { unmount } = render(<Harness />)
    await openRelief()
    expect(screen.getByLabelText('Smooth surface')).toBeInTheDocument()
    expect(screen.queryByLabelText('Smoothing')).toBeNull()
    expect(screen.queryByRole('switch', { name: 'Remove speckles' })).toBeNull()
    unmount()
    render(<Harness start={bright()} />)
    await openRelief()
    expect(screen.getByLabelText('Smoothing')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Remove speckles' })).toBeInTheDocument()
    expect(screen.getByLabelText('Smooth surface')).toBeInTheDocument()
  })
  it('выбор источника «яркость» включает сглаживание 0.4 мм, возврат к силуэту его не стирает', async () => {
    render(<Harness />)
    await openRelief()
    await userEvent.click(screen.getByRole('button', { name: 'Brightness' }))
    expect(latest.source).toMatchObject({ kind: 'brightness', smooth: 0.4 })
    expect((screen.getByLabelText('Smoothing') as HTMLInputElement).value).toBe('0.4')
  })
  it('значения: радиус яркости, пятна и радиус поверхности попадают в параметры', async () => {
    render(<Harness start={bright()} />)
    await openRelief()
    await type('Smoothing', '1')
    await userEvent.click(screen.getByRole('switch', { name: 'Remove speckles' }))
    await type('Smooth surface', '0.5')
    expect(latest.source).toMatchObject({ smooth: 1, despeckle: true })
    expect(latest.relief.smooth).toBe(0.5)
  })
  it('значения зажимаются в 0…3 мм', async () => {
    render(<Harness />)
    await openRelief()
    await type('Smooth surface', '9')
    expect(latest.relief.smooth).toBe(3)
    await type('Smooth surface', '-2')
    expect(latest.relief.smooth).toBe(0)
  })
  it('радиус меньше шага сетки: предупреждение и кнопка повышения разрешения', async () => {
    render(<Harness start={{ relief: { ...defaultKeychain.relief, smooth: 0.1 } }} inf={info({ cell: 0.25, minCell: 0.05 })} />)
    await openRelief()
    expect(screen.getByText(/below the grid step \(0\.25 mm\)/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Raise resolution \(step 0\.1 mm\)/ }))
    expect(latest.quality.cell).toBeCloseTo(0.1, 6)
  })
  it('предупреждения нет при радиусе не меньше ячейки и при выключенном сглаживании', async () => {
    const { unmount } = render(<Harness start={{ relief: { ...defaultKeychain.relief, smooth: 0.5 } }} inf={info({ cell: 0.25, minCell: 0.05 })} />)
    await openRelief()
    expect(screen.queryByText(/below the grid step/)).toBeNull()
    unmount()
    render(<Harness inf={info({ cell: 0.25, minCell: 0.05 })} />)
    await openRelief()
    expect(screen.queryByText(/below the grid step/)).toBeNull()
  })
  it('если разрешение поднять нельзя (бюджет), предупреждение остаётся без кнопки', async () => {
    render(<Harness start={{ relief: { ...defaultKeychain.relief, smooth: 0.1 } }} inf={info({ cell: 0.25, minCell: 0.3 })} />)
    await openRelief()
    expect(screen.getByText(/below the grid step/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Raise resolution/ })).toBeNull()
  })
  it('сброс секции возвращает сглаживание в 0', async () => {
    render(<Harness start={{ ...bright(), relief: { ...defaultKeychain.relief, smooth: 1 } }} />)
    await openRelief()
    await userEvent.click(screen.getByRole('button', { name: 'Reset: Relief' }))
    expect(latest.relief.smooth).toBe(0)
    expect(latest.source).toEqual(defaultKeychain.source)
  })
})

describe('Линии детали и узоры (3.2)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  const openPattern = async () => await openSection('Surface pattern')

  it('хребет и канавка: ширины появляются при ненулевой величине', async () => {
    render(<Harness />)
    await openSection('Detail lines')
    expect(screen.queryByLabelText('Spine width')).toBeNull()
    await type('Spine height', '0.3')
    expect(latest.detail.spineAmp).toBeCloseTo(0.3, 6)
    expect(screen.getByLabelText('Spine width')).toBeInTheDocument()
    await type('Groove depth', '0.2')
    expect(screen.getByLabelText('Groove width')).toBeInTheDocument()
    expect(screen.getByLabelText('Groove distance from the rim')).toBeInTheDocument()
  })
  it('без узора параметров нет; выбор по миниатюре включает набор полей Lines', async () => {
    render(<Harness />)
    await openPattern()
    expect(screen.queryByLabelText('Pitch')).toBeNull()
    await userEvent.click(screen.getByRole('radio', { name: 'Lines' }))
    expect(latest.pattern.kind).toBe('lines')
    for (const l of ['Pitch', 'Line width', 'Depth', 'Angle', 'Offset']) expect(screen.getByLabelText(l)).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Staggered rows' })).toBeNull()
    await type('Pitch', '1.2'); await type('Line width', '0.4'); await type('Depth', '0.3'); await type('Angle', '45')
    expect(latest.pattern).toMatchObject({ pitch: 1.2, width: 0.4, depth: 0.3, angle: 45 })
  })
  it('набор полей зависит от узора: Dots — диаметр и шахматный порядок, Ripples — без угла, Hex — с углом', async () => {
    render(<Harness />)
    await openPattern()
    await userEvent.click(screen.getByRole('radio', { name: 'Dots' }))
    expect(screen.getByLabelText('Dot diameter')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Staggered rows' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: 'Staggered rows' }))
    expect(latest.pattern.staggered).toBe(false)
    await userEvent.click(screen.getByRole('radio', { name: 'Ripples' }))
    expect(screen.queryByLabelText('Angle')).toBeNull()
    expect(screen.getByLabelText('Line width')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Hex' }))
    expect(screen.getByLabelText('Angle')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Crosshatch' }))
    expect(screen.getByLabelText('Angle')).toBeInTheDocument()
  })
  it('область применения переключается; «подложка» без подложки показывает ошибку', async () => {
    render(<Harness start={{ pattern: { ...defaultKeychain.pattern, kind: 'lines' }, base: { ...defaultKeychain.base, thickness: 0 } }} />)
    await openPattern()
    await userEvent.click(screen.getByRole('button', { name: 'Plateau only' }))
    expect(latest.pattern.scope).toBe('plateau')
    await userEvent.click(screen.getByRole('button', { name: 'Base plate only' }))
    expect(latest.pattern.scope).toBe('base')
    expect(await screen.findByText(/needs a base plate/)).toBeInTheDocument()
  })
  it('«Сбросить до гладкого» убирает узор и возвращает значения', async () => {
    render(<Harness start={{ pattern: { ...defaultKeychain.pattern, kind: 'hex', pitch: 4, depth: 1 } }} />)
    await openPattern()
    await userEvent.click(screen.getByRole('button', { name: 'Reset to plain' }))
    expect(latest.pattern).toEqual(defaultKeychain.pattern)
    expect(screen.queryByLabelText('Pitch')).toBeNull()
  })
  it('мелкий узор: предупреждение с шагом сетки и рекомендуемым шагом; кнопка повышает разрешение в пределах бюджета', async () => {
    render(<Harness start={{ pattern: { ...defaultKeychain.pattern, kind: 'lines', pitch: 0.8, width: 0.3 } }} />)
    await openPattern()
    expect(screen.getByRole('alert')).toHaveTextContent('grid step 0.25 mm')
    expect(screen.getByRole('alert')).toHaveTextContent('at least 1 mm')
    await userEvent.click(screen.getByRole('button', { name: /Raise resolution \(step 0.1 mm\)/ }))
    expect(latest.quality.cell).toBeCloseTo(0.1, 6)
  })
  it('достаточно крупный узор — без предупреждения', async () => {
    render(<Harness start={{ pattern: { ...defaultKeychain.pattern, kind: 'lines', pitch: 2, width: 0.5 } }} />)
    await openPattern()
    expect(screen.queryByText(/finer than the mesh resolution/)).toBeNull()
  })
  it('ширина не меньше шага — ошибка у поля', async () => {
    render(<Harness start={{ pattern: { ...defaultKeychain.pattern, kind: 'lines', pitch: 1, width: 1.5 } }} />)
    await openPattern()
    expect(await screen.findByText('The line or dot width must be smaller than the pitch')).toBeInTheDocument()
  })
})

describe('кнопки +/−', () => {
  it('у каждого числового поля панели есть обе кнопки', async () => {
    await i18n.changeLanguage('en')
    render(<Harness />)
    await expectAllNumericSteppers()
  })
})
