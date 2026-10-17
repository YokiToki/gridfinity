import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconBrandGithub, IconCheck, IconCopy } from '@tabler/icons-react'
import { reopenConsent } from './analytics'
import { APP_VERSION, DONATION_ADDRESS, GITHUB_URL } from './site'

/** Подвал стартовых страниц: ссылка на исходники и адрес для пожертвований (USDT, TRC20) с кнопкой копирования. В режимах его нет. */
export function Footer() {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const address = useRef<HTMLElement>(null)
  const timer = useRef<number | undefined>(undefined)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(DONATION_ADDRESS)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // буфер недоступен: выделяем адрес, чтобы его можно было скопировать вручную
      const el = address.current
      if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r) }
    }
  }

  return (
    <footer aria-label={t('site.footer.label')} className="relative flex w-full max-w-[760px] flex-col items-center gap-2 border-t border-border pt-4 text-center text-xs text-text-muted">
      <p data-testid="footer-beta" className="m-0 max-w-[560px]">{t('site.beta.text')}</p>
      <div className="font-medium text-text">{t('site.footer.support')}</div>
      <p className="m-0 max-w-[560px]">{t('site.footer.donate')}</p>
      <div className="flex max-w-full items-center gap-2">
        <code ref={address} aria-label={t('site.footer.address')} data-testid="donation-address" className="min-w-0 rounded-control border border-border bg-surface-1 px-2 py-1 font-mono text-[10px] break-all min-[440px]:text-[11px] text-text select-all">{DONATION_ADDRESS}</code>
        <button type="button" onClick={copy} aria-label={t('site.footer.copy')} title={t('site.footer.copy')}
          className="inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-control border border-border-strong bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text">
          {copied ? <IconCheck size={16} stroke={1.75} /> : <IconCopy size={16} stroke={1.75} />}
        </button>
        <span role="status" className="min-w-14 text-left text-success-text">{copied ? t('site.footer.copied') : ''}</span>
      </div>
      <div className="flex items-center gap-4">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-text-muted no-underline hover:text-text">
          <IconBrandGithub size={14} stroke={1.75} />{t('site.footer.source')}
        </a>
        <button type="button" onClick={reopenConsent} className="cursor-pointer border-0 bg-transparent p-0 text-xs text-text-muted underline hover:text-text">{t('site.footer.analytics')}</button>
        <span data-testid="footer-version" className="font-mono text-text-subtle">{t('site.version', { version: APP_VERSION })}</span>
      </div>
    </footer>
  )
}
