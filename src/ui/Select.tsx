import { useId } from 'react'

export function Select({ label, value, onChange, options, disabled }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs text-text-muted">{label}</label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-control border border-border-strong bg-bg px-2 text-text disabled:opacity-50">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
