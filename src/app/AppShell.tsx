import { Outlet } from 'react-router'
import { Header } from './Header'

export function AppShell() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-bg text-text">
      <Header />
      <Outlet />
    </div>
  )
}
