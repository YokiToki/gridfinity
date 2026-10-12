import { useTranslation } from 'react-i18next'
import { defaultSplit, type KeychainInfo, type KeychainParams, type SplitParams } from '../../geometry/keychain'
import type { FitIssue } from '../../geometry/keychainFit'
import { Section } from '../../ui/Section'
import { Toggle } from '../../ui/Toggle'
import { Button } from '../../ui/Button'
import { Banner } from '../../ui/Banner'
import { LengthField } from '../../ui/LengthField'
import { NumberField } from '../../ui/NumberField'
import { formatLength, useUnit } from '../../ui/units'

/** Две половины: включение, штифты (число, радиус, зазор, глубина), положения штифтов и размер листа печати. */
export function SplitSection({ params: p, info, error, onSplit }: { params: KeychainParams; info: KeychainInfo | null; error: (field: string) => string | undefined; onSplit: (patch: Partial<SplitParams>) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const s = p.split
  const mi = info?.mountInfo
  const sheet = mi?.sheet
  const summary = !s.enabled ? t('keychain.split.off') : t('keychain.split.summary', { n: s.pins })
  const issueText = (i: FitIssue) => t(`keychain.warning.${i.kind}`, {
    feature: t('keychain.editor.pin', { n: i.feature.slice(3) }), actual: formatLength(i.actual, unit), required: formatLength(i.required, unit), u: t(`units.${unit}`),
  })
  return (
    <Section title={t('keychain.split.title')} summary={summary} defaultOpen={false} onReset={() => onSplit({ ...defaultSplit })}>
      <Toggle label={t('keychain.split.enable')} checked={s.enabled} onChange={(v) => onSplit({ enabled: v })} />
      {s.enabled && (
        <>
          <span className="text-xs text-text-subtle">{t('keychain.split.hint')}</span>
          <NumberField label={t('keychain.split.pins')} value={s.pins} min={0} max={6} step={1} digits={0} error={error('split.pins')} stepper onChange={(v) => onSplit({ pins: v, pinPositions: null })} />
          {s.pins > 0 && (
            <>
              <LengthField label={t('keychain.split.pinRadius')} value={s.pinRadius} min={0.2} max={4} step={0.05} error={error('split.pinRadius')} onChange={(v) => onSplit({ pinRadius: v })} />
              <LengthField label={t('keychain.split.clearance')} value={s.clearance} min={0} max={1} step={0.05} error={error('split.clearance')} onChange={(v) => onSplit({ clearance: v })} />
              <LengthField label={t('keychain.split.pinDepth')} value={s.pinDepth} min={0.2} max={5} step={0.1} error={error('split.pinDepth')} onChange={(v) => onSplit({ pinDepth: v })} />
              <span className="text-xs text-text-subtle">{t('keychain.split.loosePin', { r: formatLength(Math.max(0.05, s.pinRadius - s.clearance), unit), u: t(`units.${unit}`) })}</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-text-muted">{s.pinPositions ? t('keychain.split.manual') : t('keychain.split.auto')}</span>
                <Button className="h-8 px-2 text-xs" disabled={!s.pinPositions} onClick={() => onSplit({ pinPositions: null })}>{t('keychain.split.resetPins')}</Button>
              </div>
            </>
          )}
          <LengthField label={t('keychain.split.gap')} value={s.gap} min={0} max={50} step={1} error={error('split.gap')} onChange={(v) => onSplit({ gap: v })} />
          {sheet && <Banner>{t('keychain.split.sheet', { w: formatLength(sheet.w, unit), h: formatLength(sheet.h, unit), u: t(`units.${unit}`) })}</Banner>}
          {mi?.issues.filter((i) => i.feature.startsWith('pin')).map((i, k) => <Banner key={k} kind="warn">{issueText(i)}</Banner>)}
        </>
      )}
    </Section>
  )
}
