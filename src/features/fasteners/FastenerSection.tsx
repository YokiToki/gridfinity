import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  checkFasteners, CUSTOM, defaultFasteners, FASTENER_MODES, MAGNET_PRESETS, SCREW_PRESETS, switchMode, validSlots, withMagnetPreset, withScrewPreset,
  type FastenerConfig, type FastenerKind, type FastenerMode, type ScrewHead,
} from '../../geometry/fasteners'
import type { Footprint } from '../../geometry/footprint'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { LengthField } from '../../ui/LengthField'
import { Select } from '../../ui/Select'
import { Banner } from '../../ui/Banner'
import { PlacementEditor } from './PlacementEditor'

type Kind = 'magnets' | 'screws'

/** Секция «Крепёж»: режимы и размеры магнитов и винтов, предупреждения и редактор ручной расстановки. */
export function FastenerSection({ config, onChange, footprint, children }: {
  config: FastenerConfig
  onChange: (c: FastenerConfig) => void
  footprint: Footprint
  /** Дополнительные заметки режима (например, про добавленный пол). */
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const set = (patch: Partial<FastenerConfig>) => onChange({ ...config, ...patch })
  const setKind = (kind: Kind, mode: FastenerMode) => set({ [kind]: switchMode(config[kind], mode) } as Partial<FastenerConfig>)
  const summaryOf = (k: FastenerKind) => (k.mode === 'manual' ? t('fastener.summary.manual', { n: validSlots(k.slots, footprint).length }) : t(`fastener.summary.${k.mode}`))
  const summary = `${t('fastener.magnets')}: ${summaryOf(config.magnets)} · ${t('fastener.screws')}: ${summaryOf(config.screws)}`
  const warnings = checkFasteners(config, footprint)
  const modeOptions = FASTENER_MODES.map((m) => ({ value: m, label: t(`fastener.mode.${m}`) }))
  const manual = config.magnets.mode === 'manual' || config.screws.mode === 'manual'
  const numeric = (min: number, max: number) => ({ min, max })

  return (
    <Section title={t('fastener.title')} summary={summary} modified={isChanged(config, defaultFasteners)} onReset={() => onChange(defaultFasteners)}>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-text-muted">{t('fastener.magnets')}</span>
        <SegmentedControl fill ariaLabel={`${t('fastener.magnets')}: ${t('fastener.mode.label')}`} value={config.magnets.mode} onChange={(m) => setKind('magnets', m)} options={modeOptions} />
        {config.magnets.mode !== 'none' && (
          <>
            <Select label={t('fastener.preset')} value={config.magnetPreset} onChange={(id) => onChange(withMagnetPreset(config, id))}
              options={[...MAGNET_PRESETS.map((p) => ({ value: p.id, label: `${p.d} × ${p.depth} mm` })), { value: CUSTOM, label: t('fastener.custom') }]} />
            <div className="grid grid-cols-2 gap-2">
              <LengthField label={t('fastener.magnetD')} value={config.magnetD} {...numeric(1, 20)} step={0.1} onChange={(v) => set({ magnetD: v, magnetPreset: CUSTOM })} />
              <LengthField label={t('fastener.magnetDepth')} value={config.magnetDepth} {...numeric(0.5, 6)} step={0.1} onChange={(v) => set({ magnetDepth: v, magnetPreset: CUSTOM })} />
            </div>
          </>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-text-muted">{t('fastener.screws')}</span>
        <SegmentedControl fill ariaLabel={`${t('fastener.screws')}: ${t('fastener.mode.label')}`} value={config.screws.mode} onChange={(m) => setKind('screws', m)} options={modeOptions} />
        {config.screws.mode !== 'none' && (
          <>
            <Select label={t('fastener.preset')} value={config.screwPreset} onChange={(id) => onChange(withScrewPreset(config, id))}
              options={[...SCREW_PRESETS.map((p) => ({ value: p.id, label: `M${p.d}` })), { value: CUSTOM, label: t('fastener.custom') }]} />
            <LengthField label={t('fastener.screwD')} value={config.screwD} {...numeric(1, 10)} step={0.1} onChange={(v) => set({ screwD: v, screwPreset: CUSTOM })} />
            <Select label={t('fastener.head.label')} value={config.screwHead} onChange={(v) => set({ screwHead: v as ScrewHead })}
              options={(['none', 'countersink', 'counterbore'] as const).map((h) => ({ value: h, label: t(`fastener.head.${h}`) }))} />
            {config.screwHead !== 'none' && (
              <div className="grid grid-cols-2 gap-2">
                <LengthField label={t('fastener.headD')} value={config.headD} {...numeric(config.screwD, 20)} step={0.1} onChange={(v) => set({ headD: v })} />
                {config.screwHead === 'counterbore' && <LengthField label={t('fastener.headDepth')} value={config.headDepth} {...numeric(0.5, 6)} step={0.1} onChange={(v) => set({ headDepth: v })} />}
              </div>
            )}
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LengthField label={t('fastener.tolerance')} value={config.tolerance} min={0} max={1} step={0.05} onChange={(v) => set({ tolerance: v })} />
        {(config.magnets.mode !== 'none' || config.screws.mode !== 'none') && (
          <LengthField label={t('fastener.earWall')} value={config.earWall} min={0.4} max={4} step={0.1} onChange={(v) => set({ earWall: v })} />
        )}
      </div>
      {warnings.map((w) => (
        <Banner key={`${w.kind}-${w.key}-${w.index}`} kind="warn">{t(w.key, { kind: t(`fastener.kinds.${w.kind}`), n: w.index + 1 })}</Banner>
      ))}
      {children}
      {manual && <PlacementEditor config={config} onChange={onChange} footprint={footprint} />}
    </Section>
  )
}
