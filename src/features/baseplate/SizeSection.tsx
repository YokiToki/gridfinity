import { useTranslation } from 'react-i18next'
import { axisMm, baseplateLayout, defaultParams, MAX_SIZE, type AxisSize, type BaseplateCore, type BaseplateError } from '../../geometry/baseplate'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { SizeInput, type SizeSource } from '../../ui/SizeInput'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'

type Patch = (f: (g: BaseplateCore) => BaseplateCore) => void

/** Размер плиты: шаг сетки и размер по осям в дробных ячейках или в мм, выравнивание остатка. */
export function SizeSection({ geometry: g, errors, update }: { geometry: BaseplateCore; errors: BaseplateError[]; update: Patch }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const layout = baseplateLayout(g)
  const err = (field: string) => {
    const e = errors.find((x) => x.field === field)
    return e ? t(e.key, { max: MAX_SIZE }) : undefined
  }
  const setAxis = (axis: 'x' | 'y') => (mm: number, source: SizeSource, units: number) =>
    update((o) => ({ ...o, [axis]: { ...o[axis], mode: source, value: source === 'units' ? units : mm } as AxisSize }))
  const setAlign = (axis: 'x' | 'y') => (align: AxisSize['align']) => update((o) => ({ ...o, [axis]: { ...o[axis], align } }))
  const hasPadding = layout.padX > 1e-6 || layout.padY > 1e-6
  const fmt = (mm: number) => formatLength(mm, unit)
  const reset = () => update((o) => ({ ...o, pitch: defaultParams.pitch, x: defaultParams.x, y: defaultParams.y }))

  return (
    <Section title={t('baseplate.size.title')} summary={`${fmt(layout.sizeX)} × ${fmt(layout.sizeY)} ${t(`units.${unit}`)}`}
      modified={isChanged({ pitch: g.pitch, x: g.x, y: g.y }, { pitch: defaultParams.pitch, x: defaultParams.x, y: defaultParams.y })} onReset={reset}>
      <LengthField label={t('baseplate.size.pitch')} value={g.pitch} min={20} max={60} onChange={(v) => update((o) => ({ ...o, pitch: v }))} />
      {(['x', 'y'] as const).map((axis) => (
        <SizeInput key={axis} axis={axis} label={t(`baseplate.size.${axis}`)} valueMm={axisMm(g[axis], g.pitch)} pitch={g.pitch}
          min={1} max={MAX_SIZE} error={err(axis)} onChange={setAxis(axis)} align={g[axis].align} onAlignChange={setAlign(axis)} />
      ))}
      <span className="font-mono text-xs text-text-subtle">{t('baseplate.size.cells', { x: layout.fp.nx, y: layout.fp.ny })}</span>
      {hasPadding && <Banner>{t('baseplate.size.paddingNote')}</Banner>}
    </Section>
  )
}
