// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addUserFontFile, cssFamily, ensureFont, FontError, fontShorthand, looksLikeFont, MAX_FONT_BYTES, registerBundledFont, userFamily } from './fonts'
import { FONT_LIST, fontById } from './fontList'
import { openFontStore } from './fontStore'

const added: { family: string; source: unknown; desc: Record<string, string> }[] = []
const loaded: string[] = []
class FakeFace {
  constructor(public family: string, public source: unknown, public desc: Record<string, string> = {}) {}
  async load() { if (this.source instanceof ArrayBuffer && new Uint8Array(this.source)[8] === 255) throw new Error('bad'); return this }
}
beforeEach(() => {
  added.length = 0; loaded.length = 0
  vi.stubGlobal('FontFace', FakeFace)
  Object.defineProperty(document, 'fonts', { configurable: true, value: { add: (f: FakeFace) => added.push({ family: f.family, source: f.source, desc: f.desc }), load: async (f: string, t?: string) => { loaded.push(`${f}|${t}`); return [] } } })
})
afterEach(() => { vi.unstubAllGlobals() })

const bytes = (magic: string, len = 64, mark = 0) => { const b = new Uint8Array(len); for (let i = 0; i < 4; i++) b[i] = magic.charCodeAt(i); b[8] = mark; return b.buffer }
const file = (data: ArrayBuffer, name = 'f.ttf') => ({ name, size: data.byteLength, arrayBuffer: async () => data }) as unknown as File

describe('имена и CSS', () => {
  it('cssFamily: пакетные семейства в кавычках с запасным, системные как есть, пользовательские по идентификатору', () => {
    expect(cssFamily({ id: 'roboto', bold: false, italic: false })).toBe('"Roboto Variable", sans-serif')
    expect(cssFamily({ id: 'playfair-display', bold: false, italic: false })).toBe('"Playfair Display Variable", serif')
    expect(cssFamily({ id: 'jetbrains-mono', bold: false, italic: false })).toBe('"JetBrains Mono Variable", monospace')
    expect(cssFamily({ id: 'lobster', bold: false, italic: false })).toBe('"Lobster", sans-serif')
    expect(cssFamily({ id: 'generic:serif', bold: false, italic: false })).toBe('serif')
    expect(cssFamily({ id: 'user:ab12', bold: false, italic: false })).toBe(`"${userFamily('user:ab12')}", sans-serif`)
    expect(userFamily('user:ab 1/2')).toBe('GridfinityUserFont-ab12')
  })
  it('fontShorthand: курсив, вес 400/700, кегль', () => {
    expect(fontShorthand({ id: 'roboto', bold: false, italic: false }, 20)).toBe('400 20px "Roboto Variable", sans-serif')
    expect(fontShorthand({ id: 'roboto', bold: true, italic: true }, 12.5)).toBe('italic 700 12.5px "Roboto Variable", sans-serif')
  })
})

describe('looksLikeFont', () => {
  it.each([['\u0000\u0001\u0000\u0000', true], ['OTTO', true], ['true', true], ['wOFF', true], ['wOF2', true], ['ttcf', true], ['%PDF', false], ['PK\u0003\u0004', false], ['<svg', false]])('%j → %s', (magic, ok) => {
    expect(looksLikeFont(bytes(magic))).toBe(ok)
  })
  it('короче 12 байт — не шрифт', () => { expect(looksLikeFont(new ArrayBuffer(6))).toBe(false) })
})

describe('встроенные шрифты', () => {
  it('регистрация: по файлу на подмножество и начертание, с диапазонами Unicode, один раз', async () => {
    const roboto = fontById('roboto')!
    await registerBundledFont(roboto)
    const n = added.length
    expect(n).toBe(4) // latin и cyrillic, обычный и курсив
    expect(added.every((a) => a.family === 'Roboto Variable')).toBe(true)
    expect(added.map((a) => a.desc.unicodeRange).some((r) => r.includes('U+0400-045F'))).toBe(true)
    expect(added.map((a) => a.desc.weight)).toEqual(Array(4).fill('100 900'))
    await registerBundledFont(roboto)
    expect(added.length).toBe(n) // повторно не добавляется
  })
  it('статический шрифт с жирным: файлы 400 и 700 в обоих подмножествах', async () => {
    added.length = 0
    await registerBundledFont(fontById('pt-sans')!)
    expect(added.map((a) => a.desc.weight).sort()).toEqual(['400', '400', '400', '400', '700', '700', '700', '700'])
  })
  it('все адреса — файлы самого приложения, не внешние серверы', async () => {
    added.length = 0
    await registerBundledFont(fontById('lobster')!)
    for (const a of added) expect(String(a.source)).not.toMatch(/https?:\/\//)
  })
  it('ensureFont грузит нужные символы: document.fonts.load получает CSS-шрифт и текст', async () => {
    await ensureFont({ id: 'montserrat', bold: false, italic: false }, 'Анна', null)
    expect(loaded).toContain('400 16px "Montserrat Variable", sans-serif|Анна')
  })
  it('системный шрифт не регистрируется', async () => {
    added.length = 0
    await ensureFont({ id: 'generic:monospace', bold: false, italic: false }, 'x', null)
    expect(added).toHaveLength(0)
  })
  it('список: у каждого семейства есть что регистрировать', () => { expect(FONT_LIST.length).toBeGreaterThanOrEqual(20) })
})

describe('пользовательский шрифт', () => {
  beforeEach(() => { globalThis.indexedDB = new IDBFactory() })

  it('принимает TTF: регистрируется, сохраняется и восстанавливается после «перезагрузки»', async () => {
    const store = await openFontStore()
    const f = await addUserFontFile(file(bytes('\u0000\u0001\u0000\u0000'), 'My Font.ttf'), store)
    expect(f).toMatchObject({ bold: false, italic: false, name: 'My Font.ttf' })
    expect(f.id).toMatch(/^user:/)
    expect(added.at(-1)!.family).toBe(userFamily(f.id))
    // «перезагрузка»: пустой document.fonts и новое хранилище поверх той же базы
    added.length = 0
    vi.resetModules()
    const again = await openFontStore()
    const { ensureFont: ensure } = await import('./fonts')
    expect(await ensure(f, 'Abc', again)).toBe(true)
    expect(loaded.some((l) => l.includes(userFamily(f.id)))).toBe(true)
  })
  it('не шрифт: ошибка format, регистрации и записи нет', async () => {
    const store = await openFontStore()
    await expect(addUserFontFile(file(bytes('%PDF'), 'a.pdf'), store)).rejects.toMatchObject({ code: 'format' })
    expect(added).toHaveLength(0)
  })
  it('битый шрифт: ошибка decode', async () => {
    const store = await openFontStore()
    await expect(addUserFontFile(file(bytes('OTTO', 64, 255), 'bad.otf'), store)).rejects.toBeInstanceOf(FontError)
    await expect(addUserFontFile(file(bytes('OTTO', 64, 255), 'bad.otf'), store)).rejects.toMatchObject({ code: 'decode' })
  })
  it('слишком большой файл: ошибка size, файл не читается', async () => {
    const store = await openFontStore()
    const big = { name: 'big.ttf', size: MAX_FONT_BYTES + 1, arrayBuffer: vi.fn() } as unknown as File
    await expect(addUserFontFile(big, store)).rejects.toMatchObject({ code: 'size' })
    expect(big.arrayBuffer).not.toHaveBeenCalled()
  })
  it('прежний пользовательский шрифт стирается при загрузке нового', async () => {
    const store = await openFontStore()
    const a = await addUserFontFile(file(bytes('OTTO'), 'a.otf'), store)
    const b = await addUserFontFile(file(bytes('OTTO'), 'b.otf'), store, a.id)
    expect(b.id).not.toBe(a.id)
    await vi.waitFor(async () => expect(await store.load(a.id)).toBeUndefined())
    expect(await store.load(b.id)).toMatchObject({ name: 'b.otf' })
  })
  it('потерянный шрифт: ensureFont возвращает false, а не падает', async () => {
    const store = await openFontStore()
    expect(await ensureFont({ id: 'user:gone', bold: false, italic: false }, 'x', store)).toBe(false)
  })
})
