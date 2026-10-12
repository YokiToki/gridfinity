// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import '../i18n'
import { Workspace } from './Workspace'

vi.mock('../features/viewport/Viewport', () => ({ Viewport: () => null }))

let roCallbacks: Array<() => void> = []
class FakeRO {
  constructor(cb: () => void) { roCallbacks.push(cb) }
  observe() {}
  disconnect() {}
}

afterEach(() => { vi.unstubAllGlobals(); roCallbacks = [] })

describe('Workspace: отступ под закреплённым блоком', () => {
  it('прокручиваемая панель получает нижний отступ, равный высоте футера, и следует за её изменением', () => {
    let h = 96
    vi.stubGlobal('ResizeObserver', FakeRO)
    const spy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => h)
    render(<Workspace panel={<div>p</div>} footer={<div>f</div>} model={null} exportOptions={false} />)
    expect(screen.getByTestId('panel-scroller')).toHaveStyle({ paddingBottom: '96px' })
    h = 140
    act(() => roCallbacks.forEach((cb) => cb()))
    expect(screen.getByTestId('panel-scroller')).toHaveStyle({ paddingBottom: '140px' })
    spy.mockRestore()
  })
  it('без футера отступа нет', () => {
    render(<Workspace panel={<div>p</div>} model={null} exportOptions={false} />)
    expect(screen.getByTestId('panel-scroller').style.paddingBottom).toBe('0px')
  })
})
