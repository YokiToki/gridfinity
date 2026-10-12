// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { UnitContext } from '../../ui/units'
import { defaultKeychain, type KeychainInfo, type KeychainParams } from '../../geometry/keychain'
import { KeychainPanel } from './KeychainPanel'
import { MaskPreview } from './MaskPreview'
import { expectAllNumericSteppers } from '../../ui/stepperAssert'

type S = KeychainParams & { imageName: string }
let latest: S

const preview = { width: 4, height: 4, data: new Uint8Array(16).fill(1), box: [0, 0, 4, 4] as [number, number, number, number], holes: [{ id: 1, size: 120, cx: 1, cy: 1, open: false }, { id: 2, size: 80, cx: 3, cy: 3, open: false }] }
const info = (over: Partial<KeychainInfo> = {}): KeychainInfo => ({ threshold: 140, photoLike: false, preview, size: [70, 45], cell: 0.25, reduced: false, minCell: 0.1, triangles: 1000, ...over })

function Harness({ unit = 'mm' as 'mm' | 'in', start = {} as Partial<S>, inf = info() }) {
  const [s, setS] = useState<S>({ ...defaultKeychain, imageId: 'i', imageName: 'logo.png', ...start })
  latest = s
  const { imageName, ...params } = s
  return (
    <I18nextProvider i18n={i18n}>
      <UnitContext.Provider value={{ unit, setUnit: () => {} }}>
        <KeychainPanel params={params} onChange={setS} imageName={imageName} hasImage info={inf} notice={null} onFile={() => {}} />
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
  it('список дырок: переключатель «оставить открытой» меняет keepOpen и снимается обратно', async () => {
    render(<Harness />)
    expect(screen.getByText('Hole 1 · 120 px')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: 'Keep hole 2 open' }))
    expect(latest.silhouette.keepOpen).toEqual([2])
    await userEvent.click(screen.getByRole('switch', { name: 'Keep hole 2 open' }))
    expect(latest.silhouette.keepOpen).toEqual([])
  })
  it('без заливки дырок переключатели отключены; без дырок — подсказка', async () => {
    const { unmount } = render(<Harness start={{ silhouette: { ...defaultKeychain.silhouette, fillHoles: false } }} />)
    expect(screen.getByRole('switch', { name: 'Keep hole 1 open' })).toBeDisabled()
    unmount()
    render(<Harness inf={info({ preview: { ...preview, holes: [] } })} />)
    expect(screen.getByText('No holes')).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: 'Expand: Relief' }))
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
    await userEvent.click(screen.getByRole('button', { name: 'Expand: Resolution' }))
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

describe('Профиль и источник высоты (3.1)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  const openRelief = async () => userEvent.click(screen.getByRole('button', { name: 'Expand: Relief' }))

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

describe('Линии детали и узоры (3.2)', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })
  const openPattern = async () => userEvent.click(screen.getByRole('button', { name: 'Expand: Surface pattern' }))

  it('хребет и канавка: ширины появляются при ненулевой величине', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand: Detail lines' }))
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
