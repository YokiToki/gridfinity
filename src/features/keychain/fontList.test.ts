import { describe, expect, it } from 'vitest'
import { FONT_GROUPS, FONT_LIST, fontById, fontFiles, GENERIC_FONTS, isGeneric, isUserFont } from './fontList'

type Meta = { subsets: string[]; styles: string[]; weights: number[] }
const metadata = import.meta.glob<Meta>('/node_modules/@fontsource{,-variable}/*/metadata.json', { eager: true, import: 'default' })

describe('fontList', () => {
  it('не меньше 20 семейств, идентификаторы уникальны, все пять групп представлены', () => {
    expect(FONT_LIST.length).toBeGreaterThanOrEqual(20)
    expect(new Set(FONT_LIST.map((f) => f.id)).size).toBe(FONT_LIST.length)
    for (const g of FONT_GROUPS) expect(FONT_LIST.some((f) => f.group === g), g).toBe(true)
  })
  it.each(FONT_LIST.map((f) => [f.id, f] as const))('%s: есть файлы latin и cyrillic, нужные начертания и загрузчик', async (_id, f) => {
    const files = fontFiles(f)
    for (const subset of ['latin', 'cyrillic'] as const) {
      expect(files.some((x) => x.subset === subset && x.style === 'normal'), `${subset} normal`).toBe(true)
      if (f.italic) expect(files.some((x) => x.subset === subset && x.style === 'italic'), `${subset} italic`).toBe(true)
      if (f.kind === 'static' && f.bold) expect(files.some((x) => x.subset === subset && x.weight === '700'), `${subset} 700`).toBe(true)
    }
    if (!f.italic) expect(files.every((x) => x.style === 'normal')).toBe(true)
    // загрузчик ленивый: возвращает промис адреса woff2 только при вызове
    const url = await files[0].url()
    expect(url).toMatch(/\.woff2(\?|$)|^data:/)
  })
  it('метаданные пакетов подтверждают кириллицу и заявленные начертания', () => {
    for (const f of FONT_LIST) {
      const pkg = `${f.kind === 'variable' ? '@fontsource-variable' : '@fontsource'}/${f.dir}`
      const m = metadata[`/node_modules/${pkg}/metadata.json`]
      expect(m, pkg).toBeDefined()
      expect(m.subsets, `${pkg} кириллица`).toContain('cyrillic')
      expect(m.subsets).toContain('latin')
      if (f.italic) expect(m.styles, `${pkg} курсив`).toContain('italic')
      if (f.bold) expect(m.weights.map(Number).includes(700), `${pkg} bold`).toBe(true)
    }
  })
  it('системные семейства и распознавание идентификаторов', () => {
    expect(GENERIC_FONTS.map((g) => g.family)).toEqual(['sans-serif', 'serif', 'monospace'])
    expect(isGeneric('generic:serif')).toBe(true)
    expect(isGeneric('roboto')).toBe(false)
    expect(isUserFont('user:abc')).toBe(true)
    expect(fontById('lobster')?.label).toBe('Lobster')
    expect(fontById('nope')).toBeUndefined()
  })
})
