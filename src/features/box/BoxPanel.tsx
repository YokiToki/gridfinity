import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { boxLayout, boxNotices, compartmentSizes, equalDividers, SCOOP_SIDES, validateBox, type BoxParams } from '../../geometry/box'
import { defaultBoxThickness, defaultCompartments, defaultScoop } from '../../geometry/box'
import type { LipStyle } from '../../geometry/profiles'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { Toggle } from '../../ui/Toggle'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'
import { FastenerSection } from '../fasteners/FastenerSection'
import { BoxSizeSection } from './BoxSizeSection'
import { CompartmentEditor } from './CompartmentEditor'

const NARROW = 15 // мм: уже — предупреждаем

export function BoxPanel({ params: p, onChange }: { params: BoxParams; onChange: Dispatch<SetStateAction<BoxParams>> }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const update = (f: (o: BoxParams) => BoxParams) => onChange(f)
  const { errors } = validateBox(p)
  const l = boxLayout(p)
  const fmt = (mm: number) => `${formatLength(mm, unit)} ${t(`units.${unit}`)}`
  const th = p.thickness
  const setTh = (k: keyof BoxParams['thickness'], v: number) => update((o) => ({ ...o, thickness: { ...o.thickness, [k]: v } }))
  const thErr = (k: string) => { const e = errors.find((x) => x.field === `thickness.${k}`); return e ? t(e.key) : undefined }
  const sides = SCOOP_SIDES.filter((s) => p.scoop[s])
  const sizes = compartmentSizes(p)
  const narrow = [...sizes.widths.map((w, i) => ({ n: `X${i + 1}`, w })), ...sizes.depths.map((w, i) => ({ n: `Y${i + 1}`, w }))].filter((x) => x.w < NARROW)
  const setGrid = (axis: 'cols' | 'rows', n: number) => update((o) => {
    const cols = axis === 'cols' ? n : o.compartments.cols, rows = axis === 'rows' ? n : o.compartments.rows
    const b = boxLayout(o), t_ = o.thickness.innerWall
    return { ...o, compartments: { cols, rows, xDividers: equalDividers(cols, b.cavityX, t_), yDividers: equalDividers(rows, b.cavityY, t_), removed: [] } }
  })
  const notices = boxNotices(p)

  return (
    <>
      <BoxSizeSection params={p} errors={errors} update={update} />
      <Section title={t('box.walls.title')} summary={t('box.walls.summary', { w: fmt(th.outerWall), f: fmt(th.floor) })} modified={isChanged(th, defaultBoxThickness)} onReset={() => update((o) => ({ ...o, thickness: defaultBoxThickness }))}>
        <LengthField label={t('box.walls.outer')} value={th.outerWall} min={0.4} max={10} step={0.05} error={thErr('outerWall')} onChange={(v) => setTh('outerWall', v)} />
        <LengthField label={t('box.walls.inner')} value={th.innerWall} min={0.4} max={10} step={0.05} error={thErr('innerWall')} onChange={(v) => setTh('innerWall', v)} />
        <LengthField label={t('box.walls.floor')} value={th.floor} min={0} max={20} step={0.1} error={thErr('floor')} onChange={(v) => setTh('floor', v)} />
        {errors.length > 0 && <Banner kind="warn">{t('box.error.invalid')}</Banner>}
      </Section>
      <Section title={t('box.lip.title')} summary={t('box.lip.summary', { style: t(`box.lip.${p.lip}`) })} modified={isChanged(p.lip, 'default')} onReset={() => update((o) => ({ ...o, lip: 'default' }))}>
        <SegmentedControl fill ariaLabel={t('box.lip.style')} value={p.lip} onChange={(v: LipStyle) => update((o) => ({ ...o, lip: v }))}
          options={(['default', 'thin', 'none'] as const).map((v) => ({ value: v, label: t(`box.lip.${v}`) }))} />
        <Banner>{t('box.lip.help')}</Banner>
      </Section>
      <Section title={t('box.scoop.title')} summary={sides.length ? t('box.scoop.summary', { r: fmt(p.scoop.radius), sides: sides.map((s) => t(`box.scoop.${s}`)).join(', ') }) : t('box.scoop.off')} modified={isChanged(p.scoop, defaultScoop)}
        onReset={() => update((o) => ({ ...o, scoop: defaultScoop }))}>
        <div className="grid grid-cols-2 gap-x-3">
          {SCOOP_SIDES.map((s) => <Toggle key={s} label={t(`box.scoop.${s}`)} checked={p.scoop[s]} onChange={(v) => update((o) => ({ ...o, scoop: { ...o.scoop, [s]: v } }))} />)}
        </div>
        <LengthField label={t('box.scoop.radius')} value={p.scoop.radius} min={0} max={100} step={0.5} onChange={(v) => update((o) => ({ ...o, scoop: { ...o.scoop, radius: v } }))} />
        {notices.includes('box.notice.scoopClamped') && <Banner kind="warn">{t('box.notice.scoopClamped', { value: fmt(l.scoopRadius) })}</Banner>}
      </Section>
      <Section title={t('box.compartments.title')} summary={t('box.compartments.summary', { n: (p.compartments.xDividers.length + 1) * (p.compartments.yDividers.length + 1) - p.compartments.removed.length })} modified={isChanged(p.compartments, defaultCompartments)}
        onReset={() => update((o) => ({ ...o, compartments: { cols: 1, rows: 1, xDividers: [], yDividers: [], removed: [] } }))}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField stepper label={t('box.compartments.cols')} value={p.compartments.cols} min={1} max={20} digits={0} onChange={(v) => setGrid('cols', v)} />
          <NumberField stepper label={t('box.compartments.rows')} value={p.compartments.rows} min={1} max={20} digits={0} onChange={(v) => setGrid('rows', v)} />
        </div>
        <CompartmentEditor params={p} onChange={(compartments) => update((o) => ({ ...o, compartments }))} />
        {narrow.map((x) => <Banner key={x.n} kind="warn">{t('box.compartments.narrow', { n: x.n, w: fmt(x.w) })}</Banner>)}
      </Section>
      <FastenerSection config={p.fasteners} footprint={l.fp} onChange={(f) => update((o) => ({ ...o, fasteners: f }))} />
    </>
  )
}
