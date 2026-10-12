import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
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
  /** Кнопки − / +; по умолчанию включены, `false` отключает. */
  stepper?: boolean
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const round = (v: number, digits: number) => Number(v.toFixed(digits))

const REPEAT_DELAY_MS = 400
const REPEAT_INTERVAL_MS = 100

export function NumberField({ label, value, onChange, min, max, step = 1, unit, digits = 2, disabled, error, stepper = true }: NumberFieldProps) {
  const { t } = useTranslation()
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  useEffect(() => setDraft(null), [value])

  // Шаг считается от актуального значения без округления до digits: так +1 мм в дюймах остаётся ровно 1 мм.
  const commit = (v: number, exact = false) => {
    const next = round(clamp(v, min, max), exact ? 9 : digits)
    setDraft(null)
    if (next !== value) onChange(next)
  }
  const commitDraft = () => {
    if (draft === null) return
    const parsed = Number(draft.replace(',', '.'))
    commit(Number.isFinite(parsed) && draft.trim() !== '' ? parsed : value)
  }
  const bump = (dir: 1 | -1, mult = 1) => commit((draft === null ? value : Number(draft.replace(',', '.')) || value) + dir * step * mult, true)

  // Удержание: актуальный bump берём через ref, чтобы повтор видел свежее значение после ререндера.
  const bumpRef = useRef(bump)
  bumpRef.current = bump
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({})
  const stop = () => {
    clearTimeout(timers.current.delay)
    clearInterval(timers.current.repeat)
    timers.current = {}
  }
  useEffect(() => stop, [])
  const press = (dir: 1 | -1) => (e: PointerEvent) => {
    if (e.button !== 0) return
    stop()
    const mult = e.shiftKey ? 10 : 1
    bumpRef.current(dir, mult)
    timers.current.delay = setTimeout(() => {
      timers.current.repeat = setInterval(() => bumpRef.current(dir, mult), REPEAT_INTERVAL_MS)
    }, REPEAT_DELAY_MS)
  }
  // Клавиатура (Enter/Space) даёт click с detail 0; мышь уже обработана в pointerdown.
  const keyClick = (dir: 1 | -1) => (e: MouseEvent) => {
    if (e.detail === 0) bump(dir, e.shiftKey ? 10 : 1)
  }
  const atMin = value <= min
  const atMax = value >= max
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); bump(1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); bump(-1) }
    else if (e.key === 'Enter') commitDraft()
  }

  const btn = 'h-[30px] w-8 shrink-0 select-none border-l border-border text-text-muted hover:bg-surface-3 disabled:opacity-40 cursor-pointer'
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
            <button type="button" className={btn} disabled={disabled || atMin} aria-label={`${t('common.decrease')}: ${label}`}
              onPointerDown={press(-1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onClick={keyClick(-1)}>−</button>
            <button type="button" className={btn} disabled={disabled || atMax} aria-label={`${t('common.increase')}: ${label}`}
              onPointerDown={press(1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onClick={keyClick(1)}>+</button>
          </>
        )}
      </div>
      {error && <span role="alert" className="text-xs text-error-text">{error}</span>}
    </div>
  )
}
