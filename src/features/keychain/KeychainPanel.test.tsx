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

type S = KeychainParams & { imageName: string }
let latest: S

const preview = { width: 4, height: 4, data: new Uint8Array(16).fill(1), holes: [{ id: 1, size: 120, cx: 1, cy: 1, open: false }, { id: 2, size: 80, cx: 3, cy: 3, open: false }] }
const info = (over: Partial<KeychainInfo> = {}): KeychainInfo => ({ threshold: 140, photoLike: false, preview, size: [70, 45], cell: 0.25, reduced: false, triangles: 1000, ...over })

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
  it('подсказка про фото при полутонах', () => {
    render(<Harness inf={info({ photoLike: true })} />)
    expect(screen.getByRole('alert')).toHaveTextContent('looks like a photo')
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
