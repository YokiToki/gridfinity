import { fontById, fontFiles, GENERIC_FONTS, isGeneric, isUserFont, SUBSETS, type FontEntry } from './fontList'
import type { FontStore } from './fontStore'
import type { TextFont } from '../../geometry/text'

/** Ошибка загрузки пользовательского шрифта: не шрифт, не читается или слишком большой. */
export class FontError extends Error {
  constructor(public code: 'format' | 'decode' | 'size') { super(code) }
}

export const MAX_FONT_BYTES = 8 * 1024 * 1024
const fallbackOf = (font: TextFont) => {
  const entry = fontById(font.id)
  return entry?.group === 'serif' ? 'serif' : entry?.group === 'mono' ? 'monospace' : 'sans-serif'
}

/** Имя семейства пользовательского шрифта в document.fonts. */
export const userFamily = (id: string) => `GridfinityUserFont-${id.replace(/^user:/, '').replace(/[^\w-]/g, '')}`

/** Семейство для CSS-шрифта canvas, в кавычках и с запасным вариантом. */
export function cssFamily(font: TextFont): string {
  if (isGeneric(font.id)) return GENERIC_FONTS.find((g) => g.id === font.id)?.family ?? 'sans-serif'
  if (isUserFont(font.id)) return `"${userFamily(font.id)}", sans-serif`
  const entry = fontById(font.id)
  return `"${entry?.family ?? 'Roboto Variable'}", ${fallbackOf(font)}`
}

/** CSS-запись шрифта для canvas и document.fonts.load. */
export const fontShorthand = (font: TextFont, px: number) => `${font.italic ? 'italic ' : ''}${font.bold ? 700 : 400} ${px}px ${cssFamily(font)}`

interface FontSet { add(face: FontFace): unknown; load(font: string, text?: string): Promise<unknown> }
const fontSet = (): FontSet | null => (typeof document !== 'undefined' && 'fonts' in document ? (document.fonts as unknown as FontSet) : null)

const bundled = new Map<string, Promise<void>>()

/** Регистрирует файлы семейства в document.fonts (один раз). Браузер сам скачает только те подмножества, символы которых нужны. */
export function registerBundledFont(entry: FontEntry): Promise<void> {
  const cached = bundled.get(entry.id)
  if (cached) return cached
  const p = (async () => {
    const set = fontSet()
    if (!set || typeof FontFace === 'undefined') return
    for (const f of fontFiles(entry)) {
      const url = await f.url()
      set.add(new FontFace(entry.family, `url(${url}) format("woff2")`, { weight: f.weight, style: f.style, unicodeRange: SUBSETS[f.subset], display: 'swap' }))
    }
  })()
  bundled.set(entry.id, p)
  p.catch(() => bundled.delete(entry.id))
  return p
}

const userLoaded = new Map<string, Promise<void>>()

/** Добавляет пользовательский шрифт из байтов в document.fonts; бросает FontError, если это не шрифт. */
export function registerUserFont(id: string, bytes: ArrayBuffer): Promise<void> {
  const cached = userLoaded.get(id)
  if (cached) return cached
  const p = (async () => {
    const set = fontSet()
    if (!set || typeof FontFace === 'undefined') throw new FontError('decode')
    const face = new FontFace(userFamily(id), bytes.slice(0))
    try { await face.load() } catch { throw new FontError('decode') }
    set.add(face)
  })()
  userLoaded.set(id, p)
  p.catch(() => userLoaded.delete(id))
  return p
}

const MAGIC = ['\u0000\u0001\u0000\u0000', 'true', 'OTTO', 'wOFF', 'wOF2', 'ttcf']
/** По первым четырём байтам: TrueType, OpenType, WOFF, WOFF2 или коллекция. */
export function looksLikeFont(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 12) return false
  return MAGIC.includes(String.fromCharCode(...new Uint8Array(bytes, 0, 4)))
}

/** Читает файл шрифта, проверяет, регистрирует и сохраняет; прежний пользовательский шрифт стирается. Возвращает запись для параметров. */
export async function addUserFontFile(file: File, store: FontStore, previousId?: string): Promise<TextFont> {
  if (file.size > MAX_FONT_BYTES) throw new FontError('size')
  const bytes = await file.arrayBuffer()
  if (!looksLikeFont(bytes)) throw new FontError('format')
  const id = `user:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  await registerUserFont(id, bytes)
  await store.save(id, { name: file.name, bytes })
  if (previousId && isUserFont(previousId) && previousId !== id) void store.remove(previousId)
  return { id, bold: false, italic: false, name: file.name }
}

/** Делает шрифт готовым к рисованию текста; возвращает false, если пользовательский шрифт потерян (тогда рисуется запасной). */
export async function ensureFont(font: TextFont, content: string, store?: FontStore | null): Promise<boolean> {
  let ok = true
  if (isUserFont(font.id)) {
    const saved = await store?.load(font.id)
    if (saved) await registerUserFont(font.id, saved.bytes).catch(() => { ok = false })
    else ok = false
  } else if (!isGeneric(font.id)) {
    const entry = fontById(font.id)
    if (entry) await registerBundledFont(entry)
  }
  const set = fontSet()
  if (set && ok) { try { await set.load(fontShorthand(font, 16), content || 'A') } catch { /* запасной шрифт */ } }
  return ok
}
