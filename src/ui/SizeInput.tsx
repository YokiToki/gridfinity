import { useTranslation } from 'react-i18next'
import { NumberField } from './NumberField'
import { LengthField } from './LengthField'
import { SegmentedControl } from './SegmentedControl'
import { Banner } from './Banner'
import { formatLength, useUnit } from './units'
import { mmToUnits, resolveAxis, unitsToMm, type Align } from '../geometry/sizing'

/**
 * Размер по одной оси: ячейки (дробные) и длина синхронизированы. Значение хранится в мм.
 * Показывает остаток после целых ячеек и выбор выравнивания.
 */
export function SizeInput({ label, valueMm, pitch, onChange, align, onAlignChange, min = 1, max = 600 }: {
  label: string
  valueMm: number
  pitch: number
  onChange: (mm: number) => void
  align: Align
  onAlignChange: (a: Align) => void
  /** Допустимый диапазон в мм. */
  min?: number
  max?: number
}) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const layout = resolveAxis(valueMm, pitch, align)
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <NumberField label={`${label}, ${t('sizeInput.units')}`} unit={t('units.cells')} value={mmToUnits(valueMm, pitch)}
          min={mmToUnits(min, pitch)} max={mmToUnits(max, pitch)} step={0.5} digits={2}
          onChange={(u) => onChange(unitsToMm(u, pitch))} />
        <LengthField label={`${label}, ${t('sizeInput.length')}`} value={valueMm} min={min} max={max} onChange={onChange} />
      </div>
      <SegmentedControl fill ariaLabel={`${label}: ${t('sizeInput.align')}`} value={align} onChange={onAlignChange}
        options={[{ value: 'start', label: t('sizeInput.start') }, { value: 'center', label: t('sizeInput.center') }, { value: 'end', label: t('sizeInput.end') }]} />
      {layout.truncated
        ? <Banner kind="warn">{t('sizeInput.truncated')}</Banner>
        : layout.padding > 0 && <span className="font-mono text-xs text-text-subtle">{t('sizeInput.padding', { value: `${formatLength(layout.padding, unit)} ${t(`units.${unit}`)}` })}</span>}
    </div>
  )
}
