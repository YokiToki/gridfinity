import { useTranslation } from 'react-i18next'
import { FILAMENTS, NOZZLES, PROCESSES, printerById } from '../../data/printers'
import { useExportSettings, type Orientation } from '../../export/settings'
import { Section } from '../../ui/Section'
import { Select } from '../../ui/Select'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { LengthField } from '../../ui/LengthField'
import { PrinterFields } from './PrinterFields'

/** Параметры экспорта в панели: принтер, поля и зазор, профили Bambu (только для 3MF и принтеров Bambu), вывод и ориентация. */
export function ExportOptionsSection() {
  const { t } = useTranslation()
  const [s, update] = useExportSettings()
  const printer = printerById(s.printerId)
  const bambu = s.format === '3mf' && !!printer?.bambu
  const summary = `${s.format.toUpperCase()} · ${printer ? printer.name.replace('Bambu Lab ', '') : t('export.printer.custom')}`

  return (
    <Section title={t('export.options')} summary={summary} defaultOpen={false}>
      <PrinterFields withMargin />
      <LengthField label={t('export.gap')} value={s.gap} min={0} max={50} step={1} onChange={(v) => update({ gap: v })} />
      {bambu && (
        <>
          <Select label={t('export.nozzle')} value={String(s.nozzle)} options={NOZZLES.map((n) => ({ value: String(n), label: `${n} mm` }))} onChange={(v) => update({ nozzle: Number(v) })} />
          <Select label={t('export.process')} value={s.process} options={PROCESSES.map((p) => ({ value: p.id, label: p.label }))} onChange={(v) => update({ process: v })} />
          <Select label={t('export.filament')} value={s.filament} options={[{ value: 'none', label: t('export.filamentNone') }, ...FILAMENTS.map((f) => ({ value: f.id, label: f.label }))]} onChange={(v) => update({ filament: v })} />
        </>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted">{t('export.multi.label')}</span>
        <SegmentedControl fill ariaLabel={t('export.multi.label')} value={s.multi} onChange={(v) => update({ multi: v })}
          options={[{ value: 'one', label: t('export.multi.one', { format: s.format.toUpperCase() }) }, { value: 'separate', label: t('export.multi.separate') }]} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted">{t('export.orientation.label')}</span>
        <SegmentedControl fill ariaLabel={t('export.orientation.label')} value={s.orientation} onChange={(v: Orientation) => update({ orientation: v })}
          options={(['auto', 'asis', 'flipped'] as const).map((v) => ({ value: v, label: t(`export.orientation.${v}`) }))} />
        <span className="text-xs text-text-subtle">{t('export.orientation.hint')}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="export-name" className="text-xs text-text-muted">{t('export.fileName')}</label>
        <input id="export-name" value={s.fileName} placeholder={t('export.fileNameAuto')} onChange={(e) => update({ fileName: e.target.value })}
          className="h-8 w-full rounded-control border border-border-strong bg-bg px-2 text-text placeholder:text-text-subtle" />
      </div>
    </Section>
  )
}
