import { useTranslation } from 'react-i18next'
import { IconPlus, IconTrash, IconAlertTriangle, IconCheck } from '@tabler/icons-react'
import { baseplateLayout, type BaseplateParams } from '../../geometry/baseplate'
import { MAX_PARTS, resolveCuts, splitParts, defaultSplitSettings, type SplitSettings } from '../../geometry/split'
import type { Part } from '../../geometry/split'
import { toGeometry } from '../../geometry/baseplate'
import { Section } from '../../ui/Section'
import { Toggle } from '../../ui/Toggle'
import { Select } from '../../ui/Select'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'
import { BED_PRESETS, presetFor } from './bedPresets'
import { updateExportSettings } from '../../export/settings'

type Patch = (f: Partial<SplitSettings>) => void

/** Разделение плиты на части под стол: источник размера стола, автоматические или ручные разрезы, список частей. */
export function SplitSection({ params: p, onChange }: { params: BaseplateParams; onChange: Patch }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const s = p.split
  const g = toGeometry(p)
  const { fp } = baseplateLayout(g)
  const cuts = resolveCuts(fp, g.split)
  const parts = s.enabled ? splitParts(fp, cuts.xCuts, cuts.yCuts, g.split.maxX, g.split.maxY) : []
  const fmt = (mm: number) => `${formatLength(mm, unit)} ${t(`units.${unit}`)}`
  const bedX = s.source === 'plate' ? p.preview.plateX : s.bedX
  const bedY = s.source === 'plate' ? p.preview.plateY : s.bedY
  const oversize = parts.filter((x) => x.oversize)
  const tooMany = parts.length > MAX_PARTS

  const sourceValue = s.source === 'plate' ? 'plate' : presetFor(s.bedX, s.bedY)?.id ?? 'custom'
  const sourceOptions = [
    { value: 'plate', label: t('split.sourcePlate', { size: `${p.preview.plateX} × ${p.preview.plateY}` }) },
    ...BED_PRESETS.map((b) => ({ value: b.id, label: `${b.x} × ${b.y} mm` })),
    { value: 'custom', label: t('split.custom') },
  ]
  const setSource = (v: string) => {
    if (v === 'plate') return onChange({ source: 'plate' })
    const b = BED_PRESETS.find((x) => x.id === v)
    onChange(b ? { source: 'custom', bedX: b.x, bedY: b.y } : { source: 'custom', bedX, bedY })
  }
  const setMode = (auto: boolean) => {
    if (auto === s.auto) return
    // при переходе на ручные разрезы начинаем с текущих автоматических
    const cur = resolveCuts(fp, { ...g.split, auto: true })
    onChange(auto ? { auto: true } : { auto: false, xCuts: cur.xCuts, yCuts: cur.yCuts })
  }
  const summary = !s.enabled ? t('split.off') : t('split.summary', { n: parts.length })

  return (
    <Section title={t('split.title')} summary={summary} defaultOpen={s.enabled} onReset={() => onChange({ ...defaultSplitSettings, connector: s.connector })}>
      <Toggle label={t('split.enable')} checked={s.enabled} onChange={(v) => onChange({ enabled: v })} />
      {s.enabled && (
        <>
          <Select label={t('split.source')} value={sourceValue} options={sourceOptions} onChange={setSource} />
          <div className="grid grid-cols-2 gap-2">
            <LengthField label={t('split.bedX')} value={bedX} min={50} max={1000} onChange={(v) => onChange({ source: 'custom', bedX: v, bedY })} />
            <LengthField label={t('split.bedY')} value={bedY} min={50} max={1000} onChange={(v) => onChange({ source: 'custom', bedX, bedY: v })} />
          </div>
          <LengthField label={t('split.margin')} value={s.margin} min={0} max={50} step={1} onChange={(v) => { updateExportSettings({ margin: v }); onChange({ margin: v }) }} />
          <SegmentedControl fill ariaLabel={t('split.mode')} value={s.auto ? 'auto' : 'manual'} onChange={(v) => setMode(v === 'auto')}
            options={[{ value: 'auto', label: t('split.auto') }, { value: 'manual', label: t('split.manual') }]} />
          {!s.auto && (['x', 'y'] as const).map((axis) => (
            <CutList key={axis} axis={axis} cuts={axis === 'x' ? s.xCuts : s.yCuts} cells={axis === 'x' ? fp.nx : fp.ny}
              offset={axis === 'x' ? fp.offsetX : fp.offsetY} pitch={fp.pitch} onChange={(c) => onChange(axis === 'x' ? { xCuts: c } : { yCuts: c })} />
          ))}
          {cuts.error && <Banner kind="error">{t('split.error.cellTooBig')}</Banner>}
          {tooMany && <Banner kind="error">{t('split.error.tooManyParts', { max: MAX_PARTS })}</Banner>}
          {!cuts.error && !tooMany && (
            parts.length <= 1
              ? <Banner>{t('split.single')}</Banner>
              : <PartList parts={parts} fmt={fmt} />
          )}
          {oversize.length > 0 && !cuts.error && <Banner kind="warn">{t('split.oversizeBanner', { n: oversize.length, bed: fmt2(bedX, bedY, fmt) })}</Banner>}
          {parts.length > 1 && !oversize.length && <span className="inline-flex items-center gap-1.5 text-xs text-success-text"><IconCheck size={14} stroke={1.75} />{t('split.fitsAll')}</span>}
          {parts.length > 1 && (
            <>
              <Toggle label={t('split.exploded')} checked={s.exploded} onChange={(v) => onChange({ exploded: v })} />
              {s.exploded && <LengthField label={t('split.gap')} value={s.gap} min={0} max={100} step={1} onChange={(v) => onChange({ gap: v })} />}
            </>
          )}
        </>
      )}
    </Section>
  )
}

const fmt2 = (x: number, y: number, fmt: (mm: number) => string) => `${fmt(x)} × ${fmt(y)}`

function PartList({ parts, fmt }: { parts: Part[]; fmt: (mm: number) => string }) {
  const { t } = useTranslation()
  return (
    <ul aria-label={t('split.parts')} className="m-0 flex list-none flex-col gap-1 p-0">
      {parts.map((x) => (
        <li key={x.label} data-oversize={x.oversize || undefined}
          className={`flex items-center gap-2 rounded-control border px-2 py-1.5 text-xs ${x.oversize ? 'border-error-border bg-error-bg text-error-text' : 'border-border bg-bg text-text-muted'}`}>
          <b className="w-7 font-mono text-text">{x.label}</b>
          <span className="flex-1 font-mono">{t('split.partRow', { cells: `${x.i1 - x.i0} × ${x.j1 - x.j0}`, size: `${fmt(x.sizeX)} × ${fmt(x.sizeY)}` })}</span>
          {x.oversize && <span className="inline-flex items-center gap-1"><IconAlertTriangle size={14} stroke={1.75} aria-hidden />{t('split.oversize')}</span>}
        </li>
      ))}
    </ul>
  )
}

/** Разрезы по одной оси: индекс ячейки, перед которой проходит разрез, позиция от края в мм. */
function CutList({ axis, cuts, cells, offset, pitch, onChange }: { axis: 'x' | 'y'; cuts: number[]; cells: number; offset: number; pitch: number; onChange: (c: number[]) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const sorted = [...cuts].sort((a, b) => a - b)
  const free = Array.from({ length: Math.max(cells - 1, 0) }, (_, i) => i + 1).filter((i) => !cuts.includes(i))
  const set = (i: number, v: number) => onChange(sorted.map((c, k) => (k === i ? v : c)).filter((c, k, a) => a.indexOf(c) === k).sort((a, b) => a - b))
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-text-muted">{t(axis === 'x' ? 'split.cutsX' : 'split.cutsY')}</span>
      {sorted.length === 0 && <span className="text-xs text-text-subtle">{t('split.noCuts')}</span>}
      {sorted.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
          <NumberField stepper label={`${t('split.cutAt', { n: i + 1 })} (${axis.toUpperCase()})`} value={c} min={1} max={Math.max(cells - 1, 1)} digits={0} onChange={(v) => set(i, v)} />
          <span className="pb-2 font-mono text-xs text-text-subtle">{t('split.cutPos', { pos: `${formatLength(offset + c * pitch, unit)} ${t(`units.${unit}`)}` })}</span>
          <button type="button" aria-label={`${t('split.removeCut', { n: i + 1 })} (${axis.toUpperCase()})`} onClick={() => onChange(sorted.filter((_, k) => k !== i))}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-control border-0 bg-transparent text-text-muted hover:bg-surface-3 hover:text-text"><IconTrash size={16} stroke={1.75} /></button>
        </div>
      ))}
      <button type="button" disabled={free.length === 0} aria-label={`${t('split.addCut')} (${axis.toUpperCase()})`} onClick={() => onChange([...sorted, free[0]].sort((a, b) => a - b))}
        className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-border-strong bg-surface-2 px-3 text-text hover:bg-surface-3 disabled:cursor-default disabled:opacity-50">
        <IconPlus size={16} stroke={1.75} />{t('split.addCut')}
      </button>
    </div>
  )
}

