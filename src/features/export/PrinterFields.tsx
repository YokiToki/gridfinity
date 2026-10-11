import { useTranslation } from 'react-i18next'
import { CUSTOM_PRINTER, PRINTERS } from '../../data/printers'
import { Select } from '../../ui/Select'
import { LengthField } from '../../ui/LengthField'
import { useExportSettings } from '../../export/settings'

/** Выбор принтера (пресет или свой стол): общий для всех режимов, хранится в настройках экспорта. */
export function PrinterFields({ withMargin = false }: { withMargin?: boolean }) {
  const { t } = useTranslation()
  const [s, update] = useExportSettings()
  const options = [...PRINTERS.map((p) => ({ value: p.id, label: `${p.name} · ${p.x} × ${p.y}` })), { value: CUSTOM_PRINTER, label: t('export.printer.custom') }]
  return (
    <>
      <Select label={t('export.printer.label')} value={s.printerId} options={options} onChange={(id) => update({ printerId: id })} />
      {s.printerId === CUSTOM_PRINTER && (
        <div className="grid grid-cols-2 gap-2">
          <LengthField label={t('export.printer.x')} value={s.customX} min={50} max={1000} onChange={(v) => update({ customX: v })} />
          <LengthField label={t('export.printer.y')} value={s.customY} min={50} max={1000} onChange={(v) => update({ customY: v })} />
        </div>
      )}
      {withMargin && <LengthField label={t('export.margin')} value={s.margin} min={0} max={50} step={1} onChange={(v) => update({ margin: v })} />}
    </>
  )
}
