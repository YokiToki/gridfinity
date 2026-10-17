import { useTranslation } from 'react-i18next'
import { setConsent, useBannerVisible } from './analytics'

/** Баннер согласия на аналитику: в потоке страницы внизу (не перекрывает подвал и кнопки), обе кнопки одинаковы. */
export function ConsentBanner() {
  const { t } = useTranslation()
  if (!useBannerVisible()) return null
  const btn = 'inline-flex h-9 min-w-24 cursor-pointer items-center justify-center rounded-control border border-border-strong bg-surface-2 px-4 font-medium text-text hover:bg-surface-3'
  return (
    <section role="region" aria-label={t('site.consent.label')} data-testid="consent-banner"
      className="relative z-20 flex flex-none flex-col items-center gap-2 border-t border-border-strong bg-surface-1 px-4 py-3 text-xs text-text-muted md:flex-row md:justify-center md:gap-4">
      <p className="m-0 max-w-[720px] text-center md:text-left">{t('site.consent.text')}</p>
      <div className="flex flex-none gap-2">
        <button type="button" className={btn} onClick={() => setConsent('granted')}>{t('site.consent.accept')}</button>
        <button type="button" className={btn} onClick={() => setConsent('denied')}>{t('site.consent.decline')}</button>
      </div>
    </section>
  )
}
