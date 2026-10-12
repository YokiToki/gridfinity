import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconWand } from '@tabler/icons-react'
import { defaultMount, RING_PRESETS, type KeychainInfo, type KeychainParams, type MountParams, type MountStyle } from '../../geometry/keychain'
import type { FitIssue } from '../../geometry/keychainFit'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { Select } from '../../ui/Select'
import { Toggle } from '../../ui/Toggle'
import { Button } from '../../ui/Button'
import { Banner } from '../../ui/Banner'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { LengthField } from '../../ui/LengthField'
import { formatLength, useUnit } from '../../ui/units'
import { PlacementEditor, type PlacementPatch } from './PlacementEditor'

const STYLES: MountStyle[] = ['none', 'hole', 'eyelet', 'channel']

/** Крепление под кольцо: стиль, диаметры с пресетами по проволоке, Suggest, редактор положения и предупреждения посадки. */
export function MountSection({ params: p, info, error, onMount, onPlace }: {
  params: KeychainParams
  info: KeychainInfo | null
  error: (field: string) => string | undefined
  onMount: (patch: Partial<MountParams>) => void
  onPlace: (patch: PlacementPatch) => void
}) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const [showRejected, setShowRejected] = useState(false)
  const [noSpot, setNoSpot] = useState(false)
  const mo = p.mount
  const mi = info?.mountInfo
  const size = info?.size
  const preset = RING_PRESETS.find((r) => Math.abs(r.diameter - mo.diameter) < 1e-9)?.id ?? 'custom'
  const summary = mo.style === 'none' ? t('keychain.mount.styles.none') : `${t(`keychain.mount.styles.${mo.style}`)} · ${formatLength(mo.diameter, unit)} ${t(`units.${unit}`)}`

  const pick = (pos: { x: number; y: number; exit?: { x: number; y: number } }) => {
    if (!size) return
    const rel = (q: { x: number; y: number }) => ({ x: (q.x + size[0] / 2) / size[0], y: (q.y + size[1] / 2) / size[1] })
    // у канала вместе с внутренним концом выбирается и ближайший выход на край
    onMount({ x: rel(pos).x, y: rel(pos).y, ...(mo.style === 'channel' && pos.exit ? { exitX: rel(pos.exit).x, exitY: rel(pos.exit).y } : {}) })
    setNoSpot(false)
  }
  const suggest = () => {
    const c = mi?.candidates[0]
    if (c) pick(c); else setNoSpot(true)
  }
  const issueText = (i: FitIssue) => t(`keychain.warning.${i.kind}`, {
    feature: i.feature.startsWith('pin') ? t('keychain.editor.pin', { n: i.feature.slice(3) }) : t(`keychain.feature.${i.feature}`),
    actual: formatLength(i.actual, unit), required: formatLength(i.required, unit), u: t(`units.${unit}`),
  })

  return (
    <Section title={t('keychain.mount.title')} summary={summary} modified={isChanged(mo, defaultMount)} onReset={() => onMount({ ...defaultMount })}>
      <SegmentedControl fill ariaLabel={t('keychain.mount.style')} value={mo.style} onChange={(v: MountStyle) => { setNoSpot(false); onMount({ style: v }) }}
        options={STYLES.map((s) => ({ value: s, label: t(`keychain.mount.styles.${s}`) }))} />
      {mo.style === 'channel' && !p.split.enabled && <Banner kind="warn">{t('keychain.mount.channelNeedsSplit')}</Banner>}
      {error('mount.style') && mo.style !== 'channel' && <span className="text-xs text-error-text">{error('mount.style')}</span>}
      {mo.style !== 'none' && (
        <>
          <Select label={t('keychain.mount.preset')} value={preset} options={[...RING_PRESETS.map((r) => ({ value: r.id as string, label: t(`keychain.mount.presets.${r.id}`, { d: formatLength(r.diameter, unit), u: t(`units.${unit}`) }) })), { value: 'custom', label: t('keychain.mount.presets.custom') }]}
            onChange={(v) => { const r = RING_PRESETS.find((x) => x.id === v); if (r) onMount({ diameter: r.diameter }) }} />
          <LengthField label={t(mo.style === 'channel' ? 'keychain.mount.channelDiameter' : 'keychain.mount.diameter')} value={mo.diameter} min={0.5} max={20} step={0.1} error={error('mount.diameter')} onChange={(v) => onMount({ diameter: v })} />
          {mo.style === 'eyelet' && <LengthField label={t('keychain.mount.outer')} value={mo.outer} min={2} max={40} step={0.5} error={error('mount.outer')} onChange={(v) => onMount({ outer: v })} />}
          <LengthField label={t('keychain.mount.minWall')} value={mo.minWall} min={0} max={5} step={0.1} error={error('mount.minWall')} onChange={(v) => onMount({ minWall: v })} />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={suggest} disabled={!mi}><IconWand size={16} stroke={1.75} />{t('keychain.mount.suggest')}</Button>
          </div>
          <Toggle label={t('keychain.mount.showRejected')} checked={showRejected} onChange={setShowRejected} />
          {noSpot && <Banner kind="warn">{t('keychain.mount.noSpot')}</Banner>}
          {info && size && info.preview && <PlacementEditor params={p} info={info} onPlace={onPlace} onPick={pick} rejectedShown={showRejected} />}
          {mi?.issues.filter((i) => !i.feature.startsWith('pin')).map((i, k) => <Banner key={k} kind="warn">{issueText(i)}</Banner>)}
        </>
      )}
    </Section>
  )
}

