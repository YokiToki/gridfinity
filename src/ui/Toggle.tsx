import { useId } from 'react'

export function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <span id={id} className="text-text">{label}</span>
      <button
        type="button" role="switch" aria-checked={checked} aria-labelledby={id} disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors disabled:opacity-40 ${checked ? 'border-accent bg-accent' : 'border-border-strong bg-surface-3'}`}
      >
        <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${checked ? 'left-[18px] bg-accent-on' : 'left-0.5 bg-text-muted'}`} />
      </button>
    </div>
  )
}
