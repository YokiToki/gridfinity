import { useSyncExternalStore } from 'react'
import { METRIKA_ID } from './site'

/** Согласие на аналитику: `unset` — выбора ещё не было (счётчик не грузится, показывается баннер). */
export type Consent = 'granted' | 'denied' | 'unset'
export const CONSENT_KEY = 'gridfinity.analytics'

const read = (): Consent => {
  try {
    const v = localStorage.getItem(CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : 'unset'
  } catch { return 'unset' }
}

let consent: Consent = read()
let reopened = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

/** Флаг самого счётчика (документирован Яндексом): после него Метрика ничего не отправляет. */
const disableFlag = `disableYaCounter${METRIKA_ID}`

/** Удаляет cookie Метрики (`_ym_*`) для текущего домена и его родительских доменов, где они могли быть поставлены. */
export function clearAnalyticsCookies() {
  const names = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => n.startsWith('_ym_'))
  const host = location.hostname.split('.')
  const domains = ['', ...host.map((_, i) => `.${host.slice(i).join('.')}`)]
  for (const n of names) for (const d of domains) document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`
}

/** Останавливает подсчёт в этой вкладке: флаг счётчика и очистка cookie. Загруженный скрипт остаётся, но ничего не отправляет. */
export function disableAnalytics() {
  ;(window as unknown as Record<string, unknown>)[disableFlag] = true
  clearAnalyticsCookies()
}

/** Снимает флаг отключения (после повторного согласия). */
function enableFlag() { ;(window as unknown as Record<string, unknown>)[disableFlag] = false }

export function setConsent(value: 'granted' | 'denied') {
  consent = value
  reopened = false
  try { localStorage.setItem(CONSENT_KEY, value) } catch { /* хранилище недоступно: выбор живёт до перезагрузки */ }
  if (value === 'granted') enableFlag(); else disableAnalytics()
  emit()
}

/** Открывает выбор заново (ссылка в подвале), не меняя сохранённого значения. */
export function reopenConsent() { reopened = true; emit() }

export const useConsent = () => useSyncExternalStore(subscribe, () => consent, () => 'unset' as Consent)
/** Баннер виден, пока выбора нет или его открыли заново. */
export const useBannerVisible = () => useSyncExternalStore(subscribe, () => consent === 'unset' || reopened, () => false)

/** Для тестов: сбросить состояние модуля по текущему содержимому хранилища. */
export function resetConsentForTests() { consent = read(); reopened = false; emit() }
