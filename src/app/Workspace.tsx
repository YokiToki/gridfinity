import { useRef, useState, type ReactNode, type PointerEvent } from 'react'
import type { ModelResult } from '../geometry/model'
import { useTranslation } from 'react-i18next'
import { IconChevronDown, IconFocusCentered, IconShape } from '@tabler/icons-react'
import { Viewport, type BuildPlate } from '../features/viewport/Viewport'
import { usePersistedState } from './usePersistedState'
import { ExportOptionsSection } from '../features/export/ExportOptionsSection'
import { MeasurementsBar } from '../features/viewport/MeasurementsBar'

/** Раскладка режима: панель параметров, закреплённый блок экспорта и 3D-вид. На узком экране панель — нижняя шторка. */
export function Workspace({ panel, footer, model, plate, gap, busy }: {
  panel: ReactNode
  footer?: ReactNode
  model: ModelResult | null
  plate?: BuildPlate | null
  /** Зазор между частями в разнесённом виде, мм (0 — собрано). */
  gap?: number
  busy?: boolean
}) {
  const { t } = useTranslation()
  const [view, setView] = usePersistedState('gridfinity.viewport', { tools: true })
  const hasTools = (model?.tools?.length ?? 0) > 0
  const fitRef = useRef<() => void>(() => {})
  const [drawerTop, setDrawerTop] = useState(300) // отступ верха шторки на мобильном, px
  const drag = useRef<{ y: number; top: number; moved: boolean } | null>(null)

  const onDown = (e: PointerEvent) => {
    drag.current = { y: e.clientY, top: drawerTop, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dy = e.clientY - d.y
    if (Math.abs(dy) > 3) d.moved = true
    setDrawerTop(Math.min(window.innerHeight - 140, Math.max(120, d.top + dy)))
  }
  const onUp = () => {
    if (drag.current && !drag.current.moved) setDrawerTop((v) => (v > window.innerHeight - 200 ? 300 : window.innerHeight - 140))
    drag.current = null
  }

  return (
    <div className="relative flex min-h-0 flex-1">
      <aside
        aria-label={t('shell.parameters')}
        style={{ '--dt': `${drawerTop}px` } as React.CSSProperties}
        className="absolute top-(--dt) right-0 bottom-0 left-0 z-10 flex min-h-0 flex-col rounded-t-2xl border border-b-0 border-border-strong bg-surface-1 shadow-float md:static md:z-auto md:w-[380px] md:flex-none md:rounded-none md:border-0 md:border-r md:border-border md:shadow-none md:top-auto"
      >
        <button type="button" aria-label={t('shell.dragDrawer')} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          className="flex h-7 flex-none cursor-grab touch-none items-center justify-center border-0 bg-transparent md:hidden">
          <span className="h-1 w-10 rounded-full bg-border-strong" />
        </button>
        <div className="flex flex-none items-center justify-between pr-2 pb-2 pl-4 md:hidden">
          <b className="text-[15px]">{t('shell.parameters')}</b>
          <button type="button" aria-label={t('shell.collapseDrawer')} onClick={() => setDrawerTop(window.innerHeight - 140)}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-control border-0 bg-transparent text-text-muted"><IconChevronDown size={18} stroke={1.75} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{panel}<ExportOptionsSection /></div>
        {footer && <div className="flex-none border-t border-border bg-surface-1 px-4 py-3 shadow-sticky">{footer}</div>}
      </aside>
      <section aria-label={t('viewport.label')} className="relative min-w-0 flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#1a2029_0%,#0b0d10_75%)]">
        <Viewport model={model} plate={plate ?? null} gap={gap ?? 0} showTools={view.tools} onFitReady={(f) => (fitRef.current = f)} />
        <button type="button" aria-label={t('viewport.fit')} title={t('viewport.fit')} onClick={() => fitRef.current()}
          className="absolute top-4 right-4 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-group border border-border bg-surface-1/90 text-text-muted hover:text-text md:h-8 md:w-8">
          <IconFocusCentered size={16} stroke={1.75} />
        </button>
        {hasTools && (
          <button type="button" aria-label={t('viewport.tools')} title={t('viewport.tools')} aria-pressed={view.tools} onClick={() => setView({ ...view, tools: !view.tools })}
            className={`absolute top-16 right-4 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-group border border-border bg-surface-1/90 hover:text-text md:top-14 md:h-8 md:w-8 ${view.tools ? 'text-accent' : 'text-text-muted'}`}>
            <IconShape size={16} stroke={1.75} />
          </button>
        )}
        <MeasurementsBar model={model} busy={busy} />
      </section>
    </div>
  )
}
