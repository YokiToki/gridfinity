import { useTranslation } from 'react-i18next'
import { PANEL_LIMITS, type RackPanelParams } from '../../geometry/rack/panel'
import { PATTERN_KINDS, type PatternKind, type PatternParams } from '../../geometry/rack/patterns/types'
import type { Issue } from '../../geometry/rack/patterns/types'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { LengthField } from '../../ui/LengthField'
import { Select } from '../../ui/Select'
import { Toggle } from '../../ui/Toggle'
import { Banner } from '../../ui/Banner'
import type { PanelPatch } from './RackPanel'

/** Поля выбранного узора: ключ в params.pattern[kind], имя поля (rack.field.*), пределы и шаг. */
const FIELDS: Record<Exclude<PatternKind, 'none'>, { key: string; min: number; max: number; step: number }[]> = {
  skadis: [{ key: 'slotWidth', min: 1, max: 30, step: 0.5 }, { key: 'slotLength', min: 1, max: 60, step: 0.5 }, { key: 'pitch', min: 5, max: 120, step: 1 }, { key: 'rowStep', min: 2, max: 60, step: 1 }, { key: 'shift', min: 0, max: 120, step: 1 }],
  hex: [{ key: 'width', min: 2, max: 40, step: 0.5 }, { key: 'wall', min: 0.2, max: 10, step: 0.1 }],
  pills: [{ key: 'width', min: 2, max: 40, step: 0.5 }, { key: 'height', min: 2, max: 80, step: 0.5 }, { key: 'wall', min: 0.2, max: 10, step: 0.1 }],
  lines: [{ key: 'height', min: 1, max: 30, step: 0.5 }, { key: 'wall', min: 0.2, max: 10, step: 0.1 }],
  passthrough: [{ key: 'borderX', min: 0, max: 100, step: 0.5 }, { key: 'borderY', min: 0, max: 40, step: 0.5 }, { key: 'radius', min: 0, max: 20, step: 0.5 }],
}

/** Сквозной узор: вид, поле, поворот и настройки выбранного узора; предупреждения о тонких стенках и ошибка «разрезает панель». */
export function PatternSection({ params: p, defaults, errors, warnings, buildError, update }: {
  params: RackPanelParams; defaults: RackPanelParams; errors: string[]; warnings: Issue[]; /** Ключ ошибки построения (узор разрезал панель). */ buildError: string | null; update: PanelPatch
}) {
  const { t } = useTranslation()
  const pat = p.pattern
  const set = (patch: Partial<PatternParams>) => update((o) => ({ ...o, pattern: { ...o.pattern, ...patch } }))
  const setField = (kind: Exclude<PatternKind, 'none'>, key: string, v: number | boolean) =>
    update((o) => ({ ...o, pattern: { ...o.pattern, [kind]: { ...o.pattern[kind], [key]: v } } }))
  const kind = pat.kind
  const marginError = errors.includes('rack.error.margin') ? t('rack.error.margin') : undefined
  return (
    <Section title={t('rack.pattern.title')} summary={t('rack.pattern.summary', { kind: t(`rack.pattern.kinds.${kind}`) })}
      modified={isChanged(pat, defaults.pattern)} onReset={() => update((o) => ({ ...o, pattern: defaults.pattern }))}>
      <Select label={t('rack.pattern.kind')} value={kind} onChange={(v) => set({ kind: v as PatternKind })}
        options={PATTERN_KINDS.map((k) => ({ value: k, label: t(`rack.pattern.kinds.${k}`) }))} />
      {kind !== 'none' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <LengthField label={t('rack.field.margin')} value={pat.margin} min={PANEL_LIMITS.margin[0]} max={PANEL_LIMITS.margin[1]} step={0.5} error={marginError} onChange={(v) => set({ margin: v })} />
            {FIELDS[kind].map(({ key, min, max, step }) => {
              const group = pat[kind] as unknown as Record<string, number>
              return <LengthField key={key} label={t(`rack.field.${key}`)} value={group[key]} min={min} max={max} step={step} onChange={(v) => setField(kind, key, v)} />
            })}
          </div>
          {kind === 'pills' && <Toggle label={t('rack.field.edgePills')} checked={pat.pills.edgePills} onChange={(v) => setField('pills', 'edgePills', v)} />}
          <Toggle label={t('rack.pattern.rotate')} checked={pat.rotate} onChange={(v) => set({ rotate: v })} />
          <Banner>{t('rack.pattern.help')}</Banner>
          {errors.includes('rack.error.region') && <Banner kind="warn">{t('rack.error.region')}</Banner>}
          {buildError === 'rack.error.disconnected' && <Banner kind="warn">{t('rack.error.disconnected')}</Banner>}
          {warnings.map((w, i) => <Banner key={`${w.setting}${i}`} kind="warn">{t(w.key, { setting: t(`rack.field.${w.setting}`) })}</Banner>)}
        </>
      )}
    </Section>
  )
}
