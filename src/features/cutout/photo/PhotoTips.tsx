import { useTranslation } from 'react-i18next'

/** Число пунктов памятки по съёмке (строки cutout.photo.tips.1…N). */
export const TIPS_COUNT = 7

/** Памятка: как снять фото, чтобы силуэты вышли хорошо. Один и тот же список на первом шаге и во всплывающем окне. */
export function PhotoTips({ heading = true }: { heading?: boolean }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t('cutout.photo.tipsTitle')} data-testid="photo-tips" className="flex flex-col gap-2 rounded-card border border-border bg-surface-2 p-3">
      {heading && <h3 className="m-0 text-[13px] font-semibold">{t('cutout.photo.tipsTitle')}</h3>}
      <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[13px] leading-snug text-text-muted">
        {Array.from({ length: TIPS_COUNT }, (_, i) => <li key={i}>{t(`cutout.photo.tips.${i + 1}`)}</li>)}
      </ol>
    </section>
  )
}
