import { Outlet, useLocation } from 'react-router'
import { Header } from './Header'
import { MODES } from './modes'

export function AppShell() {
  const { pathname } = useLocation()
  const inMode = MODES.some((m) => pathname.startsWith(m.path))
  return (
    <div className="flex h-full min-h-0 flex-col bg-bg text-text">
      <Header showModes={inMode} />
      <Outlet />
    </div>
  )
}
