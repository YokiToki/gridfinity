import type { ReactNode } from 'react'
import { IconAlertTriangle, IconCircleX, IconInfoCircle } from '@tabler/icons-react'

const STYLE = {
  info: { cls: 'border-info-border bg-info-bg text-info-text', Icon: IconInfoCircle },
  warn: { cls: 'border-warn-border bg-warn-bg text-warn-text', Icon: IconAlertTriangle },
  error: { cls: 'border-error-border bg-error-bg text-error-text', Icon: IconCircleX },
} as const

export function Banner({ kind = 'info', children }: { kind?: keyof typeof STYLE; children: ReactNode }) {
  const { cls, Icon } = STYLE[kind]
  return (
    <div role={kind === 'info' ? 'note' : 'alert'} className={`flex items-start gap-2 rounded-control border px-2.5 py-2 text-xs leading-snug ${cls}`}>
      <Icon size={16} stroke={1.75} aria-hidden className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  )
}
