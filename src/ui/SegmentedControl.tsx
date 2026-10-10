import type { ReactNode } from 'react'

export interface SegmentOption<T extends string> { value: T; label: ReactNode; icon?: ReactNode }

export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, fill, accent }: {
  options: SegmentOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  fill?: boolean
  accent?: boolean
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={`gap-0.5 rounded-group border border-border bg-bg p-0.5 ${fill ? 'flex' : 'inline-flex'}`}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value} type="button" aria-pressed={on} onClick={() => onChange(o.value)}
            className={`inline-flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-control border-0 px-3 ${fill ? 'flex-1' : ''} ${
              on ? (accent ? 'bg-accent-muted text-white shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'bg-surface-3 text-text shadow-[inset_0_0_0_1px_var(--color-border-strong)]') : 'bg-transparent text-text-muted hover:text-text'}`}
          >
            {o.icon}{o.label}
          </button>
        )
      })}
    </div>
  )
}
