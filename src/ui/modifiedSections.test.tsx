// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import { UnitContext } from './units'
import { defaultBox, type BoxParams } from '../geometry/box'
import { defaultParams, type BaseplateParams } from '../geometry/baseplate'
import { defaultCutout, rectCutout, type CutoutParams } from '../geometry/cutout'
import { defaultKeychain, type KeychainInfo, type KeychainParams } from '../geometry/keychain'
import { defaultFasteners } from '../geometry/fasteners'
import { defaultText } from '../geometry/text'
import { defaultShape } from '../geometry/shapes'
import { BoxPanel } from '../features/box/BoxPanel'
import { BaseplatePanel } from '../features/baseplate/BaseplatePanel'
import { CutoutPanel } from '../features/cutout/CutoutPanel'
import { KeychainPanel } from '../features/keychain/KeychainPanel'
import { ShapePanel } from '../features/keychain/ShapePanel'
import { defaultShapeState, shapeParams, type ShapeState } from '../features/keychain/shapeState'
import { ExportOptionsSection } from '../features/export/ExportOptionsSection'
import { resetExportSettings, updateExportSettings } from '../export/settings'

const noop = () => {}
const wrap = (ui: ReactNode, unit: 'mm' | 'in' = 'mm') => render(<I18nextProvider i18n={i18n}><UnitContext.Provider value={{ unit, setUnit: noop }}>{ui}</UnitContext.Provider></I18nextProvider>)
/** Секции панели: название и признак «изменено» по доступному имени кнопки. */
const sections = () => screen.queryAllByRole('button', { name: /^(Expand|Collapse): / }).map((b) => {
  const name = b.getAttribute('aria-label')!
  return { title: name.replace(/^(Expand|Collapse): /, '').replace(/ \(changed\)$/, ''), changed: / \(changed\)$/.test(name), open: b.getAttribute('aria-expanded') === 'true' }
})
const changed = () => sections().filter((s) => s.changed).map((s) => s.title)

describe('все секции свёрнуты, подсвечена только изменённая', () => {
  beforeEach(async () => { await i18n.changeLanguage('en'); localStorage.clear(); resetExportSettings() })

  describe('Box', () => {
    const box = (over: Partial<BoxParams> = {}, unit: 'mm' | 'in' = 'mm') => wrap(<BoxPanel params={{ ...defaultBox, ...over }} onChange={noop} />, unit)
    it('умолчания: секции свёрнуты, ни одна не подсвечена; полей внутри нет', () => {
      box()
      const s = sections()
      expect(s.length).toBeGreaterThanOrEqual(5)
      expect(s.every((x) => !x.open && !x.changed)).toBe(true)
      expect(screen.queryByLabelText('Cell size')).toBeNull()
    })
    it.each([
      ['размер', { x: { mode: 'units' as const, value: 3, align: 'center' as const } }, 'Size'],
      ['стенки', { thickness: { ...defaultBox.thickness, floor: 1.2 } }, 'Walls and floor'],
      ['губа', { lip: 'thin' as const }, 'Lip'],
      ['скругление', { scoop: { ...defaultBox.scoop, front: true } }, 'Scoop'],
      ['отсеки', { compartments: { ...defaultBox.compartments, cols: 2 } }, 'Compartments'],
      ['крепёж', { fasteners: { ...defaultFasteners, magnets: { ...defaultFasteners.magnets, mode: 'corner' as const } } }, 'Fasteners'],
    ])('%s: подсвечена ровно эта секция', (_n, over, title) => {
      box(over as Partial<BoxParams>)
      expect(changed()).toEqual([title])
      expect(sections().every((x) => !x.open)).toBe(true)
    })
    it('дюймы ничего не меняют: на умолчаниях и на изменённом наборе подсветка та же', () => {
      const a = box({ lip: 'thin' }, 'mm'); const mm = changed(); a.unmount()
      box({ lip: 'thin' }, 'in')
      expect(changed()).toEqual(mm)
    })
    it('Reset изменённой секции возвращает приглушённую сводку (сводка = те же умолчания, что пишет Reset)', async () => {
      let p: BoxParams = { ...defaultBox, lip: 'thin' }
      const { rerender } = wrap(<BoxPanel params={p} onChange={(f) => { p = typeof f === 'function' ? f(p) : f }} />)
      await userEvent.click(screen.getByRole('button', { name: 'Expand: Lip (changed)' }))
      await userEvent.click(screen.getByRole('button', { name: /Reset: Lip/ }))
      rerender(<I18nextProvider i18n={i18n}><UnitContext.Provider value={{ unit: 'mm', setUnit: noop }}><BoxPanel params={p} onChange={noop} /></UnitContext.Provider></I18nextProvider>)
      expect(changed()).toEqual([])
    })
  })

  describe('Baseplate', () => {
    const plate = (over: Partial<BaseplateParams> = {}) => wrap(<BaseplatePanel params={{ ...defaultParams, ...over }} onChange={noop} />)
    it('умолчания: всё свёрнуто, ничего не подсвечено', () => {
      plate()
      expect(sections().length).toBeGreaterThanOrEqual(5)
      expect(sections().every((x) => !x.open && !x.changed)).toBe(true)
    })
    it.each([
      ['размер', { pitch: 40 }, 'Size'],
      ['толщины', { thickness: { ...defaultParams.thickness, floor: 3 } }, 'Thickness'],
      ['разделение: включено — секция свёрнута, но подсвечена', { split: { ...defaultParams.split, enabled: true } }, 'Split to fit bed'],
      ['стол: показан — секция свёрнута, но подсвечена', { preview: { ...defaultParams.preview, showPlate: true } }, 'Build plate'],
      ['крепёж', { fasteners: { ...defaultFasteners, screws: { ...defaultFasteners.screws, mode: 'corner' as const } } }, 'Fasteners'],
    ])('%s', (_n, over, title) => {
      plate(over as Partial<BaseplateParams>)
      expect(changed()).toContain(title)
      expect(changed()).toHaveLength(1)
      expect(sections().every((x) => !x.open)).toBe(true)
    })
  })

  describe('Cutout', () => {
    const cut = (p: CutoutParams = defaultCutout, sel: string | null = null) => wrap(
      <CutoutPanel params={p} onChange={noop} selectedId={sel} onSelect={noop} meshes={new Map()} onImport={noop} importMessage={null} draft={null} onDraft={noop} snap onSnap={noop} />)
    it('умолчания: все свёрнуты, не подсвечены; список, свойства и вид — без подсветки в любом случае', () => {
      cut()
      expect(sections().every((x) => !x.open && !x.changed)).toBe(true)
    })
    it('список выреза и выбранный вырез не подсвечиваются, даже когда непусты', () => {
      const c = rectCutout({ name: 'Tool' })
      cut({ ...defaultCutout, cutouts: [c] }, c.id)
      expect(changed()).toEqual([])
      expect(sections().map((s) => s.title)).toContain('Selected cutout')
    })
    it.each([
      ['стенки', { thickness: { ...defaultCutout.thickness, floor: 1.4 } }, 'Walls and floor'],
      ['губа', { lip: 'none' as const }, 'Lip'],
    ])('%s: подсвечена эта секция', (_n, over, title) => {
      cut({ ...defaultCutout, ...over } as CutoutParams)
      expect(changed()).toEqual([title])
    })
  })

  describe('Keychain: Изображение', () => {
    const preview = { width: 4, height: 4, data: new Uint8Array(16).fill(1), labels: new Uint16Array(16), box: [0, 0, 4, 4] as [number, number, number, number], areas: [] }
    const info = (): KeychainInfo => ({ threshold: 140, photoLike: false, preview, size: [70, 45], cell: 0.25, reduced: false, minCell: 0.1, triangles: 1000 })
    const kc = (over: Partial<KeychainParams> = {}) => wrap(
      <KeychainPanel params={{ ...defaultKeychain, imageId: 'i', ...over }} onChange={noop} imageName="logo.png" hasImage info={info()} notice={null} onFile={noop} />)
    it('умолчания: свёрнуты, имя файла в сводке «Изображения» не подсвечивается', () => {
      kc()
      expect(sections().length).toBeGreaterThanOrEqual(9)
      expect(sections().every((x) => !x.open && !x.changed)).toBe(true)
    })
    it.each([
      ['силуэт', { silhouette: { ...defaultKeychain.silhouette, close: 7 } }, 'Silhouette'],
      ['области силуэта', { silhouette: { ...defaultKeychain.silhouette, areas: { 1: { mode: 'open' as const, level: 0.6 } } } }, 'Silhouette'],
      ['размер', { size: { ...defaultKeychain.size, longest: 50 } }, 'Size'],
      ['рельеф', { relief: { ...defaultKeychain.relief, hmax: 3 } }, 'Relief'],
      ['сглаживание поверхности входит в рельеф', { relief: { ...defaultKeychain.relief, smooth: 0.5 } }, 'Relief'],
      ['источник яркости входит в рельеф', { source: { ...defaultKeychain.source, kind: 'brightness' as const } }, 'Relief'],
      ['линии детали', { detail: { ...defaultKeychain.detail, spineAmp: 0.4 } }, 'Detail lines'],
      ['узор', { pattern: { ...defaultKeychain.pattern, kind: 'lines' as const } }, 'Surface pattern'],
      ['надпись', { text: { ...defaultText, enabled: true } }, 'Text'],
      ['подложка', { base: { ...defaultKeychain.base, thickness: 3 } }, 'Base plate'],
      ['крепление', { mount: { ...defaultKeychain.mount, style: 'hole' as const } }, 'Ring mount'],
      ['две половины', { split: { ...defaultKeychain.split, enabled: true } }, 'Two halves'],
      ['разрешение', { quality: { ...defaultKeychain.quality, cell: 0.5 } }, 'Resolution'],
    ])('%s: подсвечена ровно одна секция', (_n, over, title) => {
      kc(over as Partial<KeychainParams>)
      expect(changed()).toEqual([title])
      expect(sections().every((x) => !x.open)).toBe(true)
    })
  })

  describe('Keychain: Форма', () => {
    const shape = (over: Partial<ShapeState> = {}) => {
      const st = { ...defaultShapeState, ...over }
      return wrap(<ShapePanel state={st} params={shapeParams(st)} info={null} onChange={noop} />)
    }
    it('умолчания Формы (подложка 1.6 мм) не подсвечивают «Подложку»; свёрнуто всё', () => {
      shape()
      expect(sections().map((s) => s.title)).toEqual(['Shape', 'Rim', 'Surface pattern', 'Text', 'Base plate', 'Ring mount', 'Two halves', 'Resolution'])
      expect(sections().every((x) => !x.open && !x.changed)).toBe(true)
    })
    it.each([
      ['фигура', { shape: { ...defaultShape, width: 80 } }, 'Shape'],
      ['бортик', { shape: { ...defaultShape, rim: { ...defaultShape.rim, enabled: true } } }, 'Rim'],
      ['подложка толще умолчания формы', { base: { ...defaultShapeState.base, thickness: 2 } }, 'Base plate'],
      ['надпись', { text: { ...defaultText, enabled: true } }, 'Text'],
    ])('%s', (_n, over, title) => {
      shape(over as Partial<ShapeState>)
      expect(changed()).toEqual([title])
    })
  })

  describe('Параметры экспорта', () => {
    it('умолчания не подсвечены, изменённый зазор подсвечивает секцию', () => {
      const a = wrap(<ExportOptionsSection />)
      expect(sections()).toEqual([{ title: 'Export options', changed: false, open: false }])
      a.unmount()
      updateExportSettings({ gap: 33 })
      wrap(<ExportOptionsSection />)
      expect(changed()).toEqual(['Export options'])
    })
  })
})
