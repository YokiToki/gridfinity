import { useTranslation } from 'react-i18next'
import { baseplateHeights, defaultThickness, type BaseplateError, type BaseplateCore, type BaseplateThickness } from '../../geometry/baseplate'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'

type Patch = (f: (g: BaseplateCore) => BaseplateCore) => void

const FIELDS: { key: keyof BaseplateThickness; min: number; max: number; step: number }[] = [
  { key: 'baseHeight', min: 0, max: 30, step: 0.5 },
  { key: 'floor', min: 0, max: 20, step: 0.1 },
  { key: 'rim', min: 0, max: 20, step: 0.1 },
  { key: 'paddingDrop', min: 0, max: 30, step: 0.1 },
  { key: 'cornerRadius', min: 0, max: 30, step: 0.5 },
]

/** Толщины и высоты плиты со сбросом и сообщениями об ошибках у полей. */
export function ThicknessSection({ geometry: g, errors, update }: { geometry: BaseplateCore; errors: BaseplateError[]; update: Patch }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const fmt = (mm: number) => formatLength(mm, unit)
  const th = g.thickness
  const total = baseplateHeights(g).total
  const summary = t('baseplate.thickness.summary', { floor: fmt(th.floor), rim: fmt(th.rim), height: fmt(total) })
  const set = (key: keyof BaseplateThickness, v: number) => update((o) => ({ ...o, thickness: { ...o.thickness, [key]: v } }))
  const hasError = errors.some((e) => e.field.startsWith('thickness.'))

  return (
    <Section title={t('baseplate.thickness.title')} summary={summary} modified={isChanged(th, defaultThickness)} onReset={() => update((o) => ({ ...o, thickness: defaultThickness }))}>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map(({ key, min, max, step }) => {
          const e = errors.find((x) => x.field === `thickness.${key}`)
          return <LengthField key={key} label={t(`baseplate.thickness.${key}`)} value={th[key]} min={min} max={max} step={step}
            error={e ? t(e.key) : undefined} onChange={(v) => set(key, v)} />
        })}
      </div>
      {hasError && <Banner kind="warn">{t('baseplate.error.invalid')}</Banner>}
    </Section>
  )
}
