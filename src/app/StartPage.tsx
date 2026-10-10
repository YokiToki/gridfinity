import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconArrowRight, IconHistory } from '@tabler/icons-react'
import { MODES, type ModeId } from './modes'
import { readSession } from './lastSession'
import { ModeArt } from './ModeArt'

function relativeTime(ms: number, lng: string, justNow: string) {
  const sec = Math.round((ms - Date.now()) / 1000)
  if (Math.abs(sec) < 45) return justNow
  const rtf = new Intl.RelativeTimeFormat(lng, { numeric: 'auto' })
  const min = Math.round(sec / 60)
  if (Math.abs(min) < 60) return rtf.format(min, 'minute')
  const h = Math.round(min / 60)
  if (Math.abs(h) < 24) return rtf.format(h, 'hour')
  return rtf.format(Math.round(h / 24), 'day')
}

/** Стартовая страница: выбор режима. Вьюпорт здесь не монтируется и геометрия не считается. */
export function StartPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const last = useMemo(readSession, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const mode = MODES[Number(e.key) - 1]
      if (mode) navigate(mode.path)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const lastMode = last ? MODES.find((m) => m.id === last.mode) : undefined
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-7 overflow-auto px-6 pt-5 pb-7">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(30deg,rgba(124,156,255,.09)_0_1px,transparent_1px_56px),repeating-linear-gradient(150deg,rgba(124,156,255,.09)_0_1px,transparent_1px_56px)] [mask-image:radial-gradient(ellipse_at_50%_55%,#000_15%,transparent_70%)]" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <span className="rounded-xl border border-border-strong bg-surface-1/80 px-2.5 py-1 font-mono text-xs text-text-muted">{t('start.tagline')}</span>
        <h1 className="m-0 font-display text-[38px] leading-[1.1] font-semibold tracking-tighter">{t('start.title')}</h1>
      </div>
      <div className="relative flex flex-wrap justify-center gap-6">
        {MODES.map(({ id, path }, i) => <ModeCard key={id} id={id} to={path} index={i + 1} />)}
      </div>
      {last && lastMode && (
        <Link to={lastMode.path} className="relative inline-flex h-10 items-center gap-2.5 rounded-full border border-border bg-surface-1/85 px-3.5 text-text-muted no-underline hover:text-text">
          <IconHistory size={16} stroke={1.75} />
          <span>{t('start.continue', { mode: t(`modes.${last.mode}`), size: last.size, when: relativeTime(last.savedAt, i18n.resolvedLanguage ?? 'en', t('time.justNow')) })}</span>
        </Link>
      )}
    </main>
  )
}

function ModeCard({ id, to, index }: { id: ModeId; to: string; index: number }) {
  const { t } = useTranslation()
  const tag = 'inline-flex h-[22px] items-center rounded-full bg-surface-3 px-2 font-mono text-xs text-text-muted'
  return (
    <Link to={to} data-testid={`card-${id}`} className="group relative flex h-[470px] w-[360px] max-w-full flex-col gap-3.5 rounded-2xl border border-border bg-gradient-to-b from-[#1a1f26] to-[#14181d] p-5 text-text no-underline transition-all hover:-translate-y-1 hover:border-accent hover:shadow-[0_0_0_1px_var(--color-accent),0_24px_60px_-20px_rgba(124,156,255,.5)] focus-visible:-translate-y-1 focus-visible:border-accent">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-card border border-border bg-[radial-gradient(ellipse_at_50%_60%,#222a36_0%,#0e1115_75%)]">
        <span className="absolute top-2.5 left-3 font-mono text-xs text-text-subtle">{String(index).padStart(2, '0')}</span>
        <kbd aria-hidden className="absolute top-2.5 right-3 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-xs border border-b-2 border-border-strong bg-surface-1 px-1.5 font-mono text-xs text-text-muted">{index}</kbd>
        <ModeArt id={id} />
      </div>
      <div>
        <div className="font-display text-xl font-semibold tracking-tight">{t(`modes.${id}`)}</div>
        <div className="mt-1.5 text-sm text-text-muted">{t(`start.${id}.desc`)}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={tag}>{t(`start.${id}.tag1`)}</span><span className={tag}>{t(`start.${id}.tag2`)}</span><span className="flex-1" />
        <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border-strong text-text-muted group-hover:border-accent group-hover:bg-accent group-hover:text-accent-on"><IconArrowRight size={16} stroke={1.75} /></span>
      </div>
    </Link>
  )
}
