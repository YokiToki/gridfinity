import { useTranslation } from 'react-i18next'
import { defaultKeychain, type MaskPreview, type SilhouetteParams } from '../../geometry/keychain'
import { Section } from '../../ui/Section'
import { Toggle } from '../../ui/Toggle'
import { NumberField } from '../../ui/NumberField'

/** Силуэт: порог (авто или вручную), инверсия, смыкание, заливка дырок, пятна, расширение; список дырок с «оставить открытой». */
export function SilhouetteSection({ value: s, threshold, preview, onChange }: { value: SilhouetteParams; threshold: number | null; preview: MaskPreview | null; onChange: (p: Partial<SilhouetteParams>) => void }) {
  const { t } = useTranslation()
  const auto = s.threshold === 'auto'
  const holes = preview?.holes ?? []
  const toggleOpen = (id: number) => onChange({ keepOpen: s.keepOpen.includes(id) ? s.keepOpen.filter((x) => x !== id) : [...s.keepOpen, id] })
  const summary = auto ? t('keychain.silhouette.summaryAuto', { value: threshold ?? '–' }) : t('keychain.silhouette.summary', { value: s.threshold })
  return (
    <Section title={t('keychain.silhouette.title')} summary={summary} onReset={() => onChange({ ...defaultKeychain.silhouette })}>
      <Toggle label={t('keychain.silhouette.auto')} checked={auto} onChange={(v) => onChange({ threshold: v ? 'auto' : (threshold ?? 128) })} />
      <NumberField label={t('keychain.silhouette.threshold')} value={auto ? (threshold ?? 128) : (s.threshold as number)} min={0} max={255} step={1} digits={0} disabled={auto}
        onChange={(v) => onChange({ threshold: v })} />
      <Toggle label={t('keychain.silhouette.invert')} checked={s.invert} onChange={(v) => onChange({ invert: v })} />
      <NumberField label={t('keychain.silhouette.close')} value={s.close} min={0} max={30} step={1} digits={0} unit="px" onChange={(v) => onChange({ close: v })} />
      <NumberField label={t('keychain.silhouette.speck')} value={s.speck} min={0} max={100000} step={50} digits={0} unit="px" onChange={(v) => onChange({ speck: v })} />
      <NumberField label={t('keychain.silhouette.grow')} value={s.grow} min={-30} max={30} step={1} digits={0} unit="px" onChange={(v) => onChange({ grow: v })} />
      <Toggle label={t('keychain.silhouette.fillHoles')} checked={s.fillHoles} onChange={(v) => onChange({ fillHoles: v })} />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-text-muted">{t('keychain.silhouette.holes')}</span>
        {holes.length === 0 && <span className="text-xs text-text-subtle">{t('keychain.silhouette.noHoles')}</span>}
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {holes.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-2 rounded-control border border-border bg-bg px-2 py-1">
              <span className="text-xs">{t('keychain.silhouette.holeRow', { id: h.id, size: h.size })}</span>
              <button type="button" role="switch" aria-checked={s.keepOpen.includes(h.id)} aria-label={t('keychain.silhouette.keepOpen', { id: h.id })} disabled={!s.fillHoles}
                onClick={() => toggleOpen(h.id)}
                className={`inline-flex h-7 cursor-pointer items-center rounded-control border px-2 text-xs disabled:opacity-50 ${s.keepOpen.includes(h.id) ? 'border-accent bg-accent-muted text-white' : 'border-border-strong bg-surface-2 text-text-muted'}`}>
                {t('keychain.silhouette.open')}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
