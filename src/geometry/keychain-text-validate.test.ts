import { describe, expect, it } from 'vitest'
import { defaultKeychain, validateKeychain, type KeychainParams } from './keychain'
import { defaultText, type TextParams } from './text'

const P = (t: Partial<TextParams>): KeychainParams => ({ ...defaultKeychain, imageId: 'i', text: { ...defaultText, enabled: true, content: 'A', ...t } })
const fields = (p: KeychainParams) => validateKeychain(p).errors.map((e) => e.field)

describe('проверка надписи', () => {
  it('выключенная надпись не проверяется, включённая по умолчанию допустима', () => {
    expect(validateKeychain({ ...defaultKeychain, text: { ...defaultText, size: -5, enabled: false } }).ok).toBe(true)
    expect(validateKeychain(P({})).ok).toBe(true)
  })
  it.each([
    ['размер 0', { size: 0 }, 'text.size'], ['размер NaN', { size: NaN }, 'text.size'],
    ['межстрочный 0', { lineSpacing: 0 }, 'text.lineSpacing'], ['добавка между буквами NaN', { letterSpacing: NaN }, 'text.letterSpacing'],
    ['поворот Infinity', { rotation: Infinity }, 'text.rotation'], ['x NaN', { x: NaN }, 'text.x'],
    ['высота отрицательна при рельефе', { mode: 'emboss' as const, height: -1 }, 'text.height'],
    ['глубина отрицательна при гравировке', { mode: 'engrave' as const, depth: -1 }, 'text.depth'],
    ['слишком много строк', { content: Array.from({ length: 13 }, () => 'a').join('\n') }, 'text.content'],
    ['слишком длинный текст', { content: 'a'.repeat(401) }, 'text.content'],
  ])('%s', (_n, over, field) => { expect(fields(P(over))).toContain(field) })
  it('глубина не проверяется при рельефе, высота при гравировке', () => {
    expect(validateKeychain(P({ mode: 'emboss', depth: -1 })).ok).toBe(true)
    expect(validateKeychain(P({ mode: 'engrave', height: -1 })).ok).toBe(true)
  })
  it('отрицательная добавка между буквами допустима (сжатие)', () => {
    expect(validateKeychain(P({ letterSpacing: -0.3 })).ok).toBe(true)
  })
})
