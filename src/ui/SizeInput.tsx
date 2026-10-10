import { useTranslation } from 'react-i18next'
import { NumberField } from './NumberField'
import { LengthField } from './LengthField'
import { SegmentedControl } from './SegmentedControl'
import { Banner } from './Banner'
import { formatLength, useUnit } from './units'
import { mmToUnits, resolveAxis, unitsToMm, type Align } from '../geometry/sizing'

export type SizeSource = 'units' | 'mm'

/**
 * Размер по одной оси: ячейки (дробные) и длина синхронизированы. Значение приходит и уходит в мм;
 * source и units говорят, какое из полей правили, чтобы вызывающий мог хранить размер в ячейках или в мм.
 * Показывает остаток после целых ячеек и выбор выравнивания (слева/по центру/справа или спереди/по центру/сзади).
 */
export function SizeInput({ label, axis = 'x', valueMm, pitch, onChange, align, onAlignChange, min = 1, max = 600, error }: {
  label: string
  axis?: 'x' | 'y'
  valueMm: number
  pitch: number
  onChange: (mm: number, source: SizeSource, units: number) => void
  align: Align
  onAlignChange: (a: Align) => void
  /** Допустимый диапазон в мм. */
  min?: number
  max?: number
  error?: string
}) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const layout = resolveAxis(valueMm, pitch, align)
  const labels = axis === 'x' ? 'sizeInput.alignX' : 'sizeInput.alignY'
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <NumberField label={`${label}, ${t('sizeInput.units')}`} unit={t('units.cells')} value={mmToUnits(valueMm, pitch)}
          min={mmToUnits(min, pitch)} max={mmToUnits(max, pitch)} step={0.5} digits={2} error={error}
          onChange={(u) => onChange(unitsToMm(u, pitch), 'units', u)} />
        <LengthField label={`${label}, ${t('sizeInput.length')}`} value={valueMm} min={min} max={max} onChange={(v) => onChange(v, 'mm', mmToUnits(v, pitch))} />
      </div>
      <SegmentedControl fill ariaLabel={`${label}: ${t('sizeInput.align')}`} value={align} onChange={onAlignChange}
        options={[{ value: 'start', label: t(`${labels}.start`) }, { value: 'center', label: t(`${labels}.center`) }, { value: 'end', label: t(`${labels}.end`) }]} />
      {layout.truncated
        ? <Banner kind="warn">{t('sizeInput.truncated')}</Banner>
        : layout.padding > 0 && <span className="font-mono text-xs text-text-subtle">{t('sizeInput.padding', { value: `${formatLength(layout.padding, unit)} ${t(`units.${unit}`)}` })}</span>}
    </div>
  )
}
