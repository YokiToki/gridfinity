import { lazy, Suspense } from 'react'
import { useConsent } from './analytics'
import { METRIKA_ID } from './site'

/** Счётчик грузится лениво: пока нет согласия, код пакета даже не скачивается. Международный домен: посетители не только из России. */
const Counter = lazy(async () => {
  const { MetrikaCounter, METRIKA_SCRIPT_URL_COM } = await import('react-metrika')
  return {
    default: () => (
      <MetrikaCounter id={METRIKA_ID} scriptUrl={METRIKA_SCRIPT_URL_COM}
        options={{ webvisor: false, clickmap: false, trackLinks: false, accurateTrackBounce: true, trackHash: true }} />
    ),
  }
})

/** Подключает счётчик Метрики один раз в оболочке приложения и только после согласия. */
export function AnalyticsHost() {
  return useConsent() === 'granted' ? <Suspense fallback={null}><Counter /></Suspense> : null
}
