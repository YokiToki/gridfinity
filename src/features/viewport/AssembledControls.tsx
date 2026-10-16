import { useTranslation } from 'react-i18next'
import { LengthField } from '../../ui/LengthField'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { OPEN_GAP_MAX, type KeychainView } from './layout'

/** Вид двух половин брелка во вьюпорте: лист печати или собранный, и раздвижка собранных половин. Только выбор вида, модель не пересчитывается. */
export function AssembledControls({ view, openGap, onView, onOpenGap }: {
  view: KeychainView
  openGap: number
  onView: (v: KeychainView) => void
  onOpenGap: (mm: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="absolute top-28 right-4 z-[1] flex flex-col items-end gap-2 md:top-4 md:right-16" data-testid="assembled-controls">
      <SegmentedControl<KeychainView> ariaLabel={t('viewport.view')} value={view} onChange={onView}
        options={[{ value: 'sheet', label: t('viewport.sheet') }, { value: 'assembled', label: t('viewport.assembled') }]} />
      {view === 'assembled' && (
        <div className="w-44 rounded-group border border-border bg-surface-1/90 p-1.5">
          <LengthField label={t('viewport.openGap')} value={openGap} min={0} max={OPEN_GAP_MAX} step={1} onChange={onOpenGap} />
        </div>
      )}
    </div>
  )
}
