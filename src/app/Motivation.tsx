import { useTranslation } from 'react-i18next'

/** Отдельный блок на корневой странице: почему инструменты бесплатны и чьи они. Только на главной, в режимах его нет. */
export function Motivation() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="motivation-title" data-testid="motivation" className="relative w-full max-w-[760px] rounded-card border border-border bg-surface-1/85 px-5 py-4">
      <h2 id="motivation-title" className="m-0 mb-1.5 font-display text-base font-semibold tracking-tight text-text">{t('site.motivationTitle')}</h2>
      <p className="m-0 text-sm text-text-muted">{t('site.motivation')}</p>
    </section>
  )
}
