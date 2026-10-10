import type { MeshData } from '../../geometry/mesh'
import { useTranslation } from 'react-i18next'
import { IconCheck, IconLoader2 } from '@tabler/icons-react'
import { formatLength, useUnit } from '../../ui/units'

/** Габариты модели X/Y/Z в выбранной единице и состояние расчёта. */
export function MeasurementsBar({ model, busy }: { model: MeshData | null; busy?: boolean }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const dim = (i: number) => (model ? formatLength(model.max[i] - model.min[i], unit) : '–')
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-9 items-center gap-5 border-t border-border bg-bg/90 px-4 font-mono text-xs text-text-muted">
      <span>X {dim(0)}</span><span>Y {dim(1)}</span><span>Z {dim(2)} {t(`units.${unit}`)}</span>
      <span className="flex-1" />
      {busy
        ? <span className="inline-flex items-center gap-1.5"><IconLoader2 size={14} className="animate-spin" />{t('common.generating')}</span>
        : model && <span className="inline-flex items-center gap-1.5 text-success-text"><IconCheck size={14} stroke={1.75} />{t('common.ready')}</span>}
    </div>
  )
}
