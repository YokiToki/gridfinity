import { useTranslation } from 'react-i18next'
import { axisMm, type AxisSize } from '../../geometry/baseplate'
import { boxHeightMm, MAX_BOX_SIZE } from '../../geometry/box'
import { binLayout, type BinParams } from '../../geometry/bin'
import { HEIGHT_UNIT } from '../../geometry/spec'
import { Section } from '../../ui/Section'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { SizeInput, type SizeSource } from '../../ui/SizeInput'
import { formatLength, useUnit } from '../../ui/units'

type Patch<T> = (f: (p: T) => T) => void
interface FieldError { field: string; key: string }

/** Размер коробки или выреза: шаг сетки, X/Y в дробных ячейках или мм с выравниванием, высота в единицах по 7 мм или мм. */
export function BoxSizeSection<T extends BinParams>({ params: p, errors, update }: { params: T; errors: FieldError[]; update: Patch<T> }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const l = binLayout(p)
  const err = (field: string) => {
    const e = errors.find((x) => x.field === field)
    return e ? t(e.key, { max: MAX_BOX_SIZE }) : undefined
  }
  const setAxis = (axis: 'x' | 'y') => (mm: number, source: SizeSource, units: number) =>
    update((o) => ({ ...o, [axis]: { ...o[axis], mode: source, value: source === 'units' ? units : mm } as AxisSize }))
  const setAlign = (axis: 'x' | 'y') => (align: AxisSize['align']) => update((o) => ({ ...o, [axis]: { ...o[axis], align } }))
  const hMm = boxHeightMm(p.height)
  const fmt = (mm: number) => formatLength(mm, unit)
  const summary = t('box.size.summary', { x: fmt(l.sizeX), y: fmt(l.sizeY), h: Number((hMm / HEIGHT_UNIT).toFixed(2)) })

  return (
    <Section title={t('box.size.title')} summary={summary} onReset={() => update((o) => ({ ...o, pitch: 42, x: { mode: 'units', value: 2, align: 'center' }, y: { mode: 'units', value: 2, align: 'center' }, height: { mode: 'units', value: 3 } }))}>
      <LengthField label={t('baseplate.size.pitch')} value={p.pitch} min={20} max={60} onChange={(v) => update((o) => ({ ...o, pitch: v }))} />
      {(['x', 'y'] as const).map((axis) => (
        <SizeInput key={axis} axis={axis} label={t(`baseplate.size.${axis}`)} valueMm={axisMm(p[axis], p.pitch)} pitch={p.pitch}
          min={p.pitch} max={MAX_BOX_SIZE} error={err(axis)} onChange={setAxis(axis)} align={p[axis].align} onAlignChange={setAlign(axis)} />
      ))}
      <div className="grid grid-cols-2 gap-2">
        <NumberField stepper label={t('box.size.heightUnits')} unit={`× ${HEIGHT_UNIT} ${t('units.mm')}`} value={hMm / HEIGHT_UNIT} min={0.5} max={30} step={1} digits={2} error={err('height')}
          onChange={(u) => update((o) => ({ ...o, height: { mode: 'units', value: u } }))} />
        <LengthField label={t('box.size.heightLength')} value={hMm} min={3} max={210} step={1}
          onChange={(v) => update((o) => ({ ...o, height: { mode: 'mm', value: v } }))} />
      </div>
    </Section>
  )
}
