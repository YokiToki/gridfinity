import { NavLink, Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { IconChevronDown } from '@tabler/icons-react'
import { MODES } from './modes'
import { Logo } from './Logo'
import { SegmentedControl } from '../ui/SegmentedControl'
import { useUnit } from '../ui/units'
import { LANGUAGES, type Language } from '../i18n'

export function Header({ showModes }: { showModes: boolean }) {
  const { t, i18n } = useTranslation()
  const { unit, setUnit } = useUnit()
  const lang = (i18n.resolvedLanguage ?? 'en') as Language
  return (
    <header className="relative z-10 flex h-[52px] flex-none items-center gap-2 border-b border-border bg-surface-1 px-2 md:gap-4 md:px-4">
      <Link to="/" aria-label={t('app.logoLabel')} className="flex h-8 items-center gap-2 font-display text-[13px] font-semibold tracking-tight text-text no-underline">
        <Logo /><span className="hidden sm:inline">Gridfinity</span>
      </Link>
      {showModes && (
        <>
          <nav aria-label={t('modes.label')} className="ml-6 hidden gap-0.5 rounded-group border border-border bg-bg p-0.5 md:inline-flex">
            {MODES.map(({ id, path, Icon }) => (
              <NavLink key={id} to={path} className={({ isActive }) =>
                `inline-flex h-8 items-center gap-1.5 rounded-control px-3 no-underline ${isActive ? 'bg-surface-3 text-text shadow-[inset_0_0_0_1px_var(--color-border-strong)]' : 'text-text-muted hover:text-text'}`}>
                <Icon size={16} stroke={1.75} />{t(`modes.${id}`)}
              </NavLink>
            ))}
          </nav>
          <MobileModeSelect />
        </>
      )}
      <span className="flex-1" />
      <SegmentedControl ariaLabel={t('units.label')} value={unit} onChange={setUnit}
        options={[{ value: 'mm', label: t('units.mm') }, { value: 'in', label: t('units.in') }]} />
      <SegmentedControl ariaLabel={t('language.label')} value={lang} onChange={(l) => void i18n.changeLanguage(l)}
        options={LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() }))} />
    </header>
  )
}

/** На узком экране режимы выбираются выпадающим списком. */
function MobileModeSelect() {
  const { t } = useTranslation()
  return (
    <details className="relative flex-1 md:hidden">
      <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-control border border-border-strong bg-surface-2 px-3">
        <span className="font-medium"><ModeName /></span><IconChevronDown size={16} stroke={1.75} />
      </summary>
      <ul aria-label={t('modes.label')} className="absolute top-11 right-0 left-0 z-20 m-0 list-none rounded-group border border-border-strong bg-surface-2 p-1 shadow-float">
        {MODES.map(({ id, path, Icon }) => (
          <li key={id}><NavLink to={path} className="flex h-10 items-center gap-2 rounded-control px-3 text-text no-underline hover:bg-surface-3"
            onClick={(e) => e.currentTarget.closest('details')?.removeAttribute('open')}><Icon size={16} stroke={1.75} />{t(`modes.${id}`)}</NavLink></li>
        ))}
      </ul>
    </details>
  )
}

function ModeName() {
  const { t } = useTranslation()
  const { pathname: path } = useLocation()
  const mode = MODES.find((m) => path.startsWith(m.path)) ?? MODES[1]
  return <>{t(`modes.${mode.id}`)}</>
}
