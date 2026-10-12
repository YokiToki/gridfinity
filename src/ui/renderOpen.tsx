import { fireEvent, render, screen, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'

const EXPAND = /^(Expand|Развернуть): /

/** Раскрывает все свёрнутые секции в документе (секции всегда стартуют закрытыми). Синхронно, поэтому годится сразу после render. */
export function openAll(): void {
  for (let i = 0; i < 20; i++) {
    const closed = screen.queryAllByRole('button', { name: EXPAND })
    if (!closed.length) return
    closed.forEach((b) => fireEvent.click(b))
  }
}

/** Раскрывает секцию по названию; если она уже раскрыта, ничего не делает. Имя может нести пометку «(changed)». */
export async function openSection(title: string): Promise<void> {
  const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const b = screen.queryByRole('button', { name: new RegExp(`^(Expand|Развернуть): ${esc}( \\((changed|изменено)\\))?$`) })
  if (b) await userEvent.click(b)
}

/** render из Testing Library, после которого все секции раскрыты: для тестов, которые проверяют поля, а не раскрытие. */
export function renderOpen(ui: ReactElement, options?: RenderOptions) {
  const r = render(ui, options)
  openAll()
  return r
}
