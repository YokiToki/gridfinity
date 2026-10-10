import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

export interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  /** Подпись единицы справа от значения. */
  unit?: string
  /** Сколько знаков после запятой показывать. */
  digits?: number
  disabled?: boolean
  error?: string
  /** Кнопки − / + рядом с полем. */
  stepper?: boolean
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const round = (v: number, digits: number) => Number(v.toFixed(digits))

export function NumberField({ label, value, onChange, min, max, step = 1, unit, digits = 2, disabled, error, stepper }: NumberFieldProps) {
  const { t } = useTranslation()
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  useEffect(() => setDraft(null), [value])

  const commit = (v: number) => {
    const next = round(clamp(v, min, max), digits)
    setDraft(null)
    if (next !== value) onChange(next)
  }
  const commitDraft = () => {
    if (draft === null) return
    const parsed = Number(draft.replace(',', '.'))
    commit(Number.isFinite(parsed) && draft.trim() !== '' ? parsed : value)
  }
  const bump = (dir: 1 | -1) => commit((draft === null ? value : Number(draft) || value) + dir * step)
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); bump(1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); bump(-1) }
    else if (e.key === 'Enter') commitDraft()
  }

  const btn = 'h-[30px] w-[30px] shrink-0 border-l border-border text-text-muted hover:bg-surface-3 disabled:opacity-40 cursor-pointer'
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="flex items-center gap-1 text-xs text-text-muted">{label}</label>
      <div className={`flex h-8 items-center rounded-control border bg-bg focus-within:border-accent focus-within:shadow-[0_0_0_2px_var(--color-accent-muted)] ${error ? 'border-error' : 'border-border-strong'} ${disabled ? 'opacity-50' : ''}`}>
        <input
          id={id} type="text" inputMode="decimal" disabled={disabled}
          value={draft ?? String(round(value, digits))}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={onKey}
          className="h-[30px] min-w-0 flex-1 border-0 bg-transparent px-2 font-mono text-[13px] font-medium text-text outline-0"
        />
        {unit && <span className="pr-2 font-mono text-xs text-text-subtle">{unit}</span>}
        {stepper && (
          <>
            <button type="button" className={btn} disabled={disabled} aria-label={`${t('common.decrease')}: ${label}`} onClick={() => bump(-1)}>−</button>
            <button type="button" className={btn} disabled={disabled} aria-label={`${t('common.increase')}: ${label}`} onClick={() => bump(1)}>+</button>
          </>
        )}
      </div>
      {error && <span role="alert" className="text-xs text-error-text">{error}</span>}
    </div>
  )
}
