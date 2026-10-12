// Шрифты текста: пакеты fontsource, только подмножества latin и cyrillic. Файлы лежат в сборке приложения и загружаются
// при выборе семейства (динамически, отдельными woff2); сторонние серверы не используются.

export type FontGroup = 'sans' | 'serif' | 'display' | 'handwriting' | 'mono'
export const FONT_GROUPS: FontGroup[] = ['sans', 'serif', 'display', 'handwriting', 'mono']

export interface FontEntry {
  /** Стабильный идентификатор (хранится в параметрах). */
  id: string
  label: string
  group: FontGroup
  /** Имя семейства в CSS (для переменных пакетов — с суффиксом Variable). */
  family: string
  /** Каталог пакета fontsource. */
  dir: string
  /** variable: один файл на подмножество и стиль, вес 100…900; static: отдельные файлы 400 и 700. */
  kind: 'variable' | 'static'
  /** Есть ли настоящий курсив. */
  italic: boolean
  /** Есть ли жирное начертание (вес 700). */
  bold: boolean
}

const v = (id: string, label: string, group: FontGroup, dir: string, family: string, italic: boolean, bold = true): FontEntry =>
  ({ id, label, group, family: `${family} Variable`, dir, kind: 'variable', italic, bold })
const s = (id: string, label: string, group: FontGroup, dir: string, family: string, italic: boolean, bold: boolean): FontEntry =>
  ({ id, label, group, family, dir, kind: 'static', italic, bold })

/** 25 семейств с латиницей и кириллицей; список сверен с metadata.json пакетов. */
export const FONT_LIST: FontEntry[] = [
  v('roboto', 'Roboto', 'sans', 'roboto', 'Roboto', true),
  v('open-sans', 'Open Sans', 'sans', 'open-sans', 'Open Sans', true),
  v('montserrat', 'Montserrat', 'sans', 'montserrat', 'Montserrat', true),
  v('inter', 'Inter', 'sans', 'inter', 'Inter', true),
  v('nunito', 'Nunito', 'sans', 'nunito', 'Nunito', true),
  v('raleway', 'Raleway', 'sans', 'raleway', 'Raleway', true),
  v('rubik', 'Rubik', 'sans', 'rubik', 'Rubik', true),
  s('fira-sans', 'Fira Sans', 'sans', 'fira-sans', 'Fira Sans', true, true),
  s('pt-sans', 'PT Sans', 'sans', 'pt-sans', 'PT Sans', true, true),
  v('playfair-display', 'Playfair Display', 'serif', 'playfair-display', 'Playfair Display', true),
  v('merriweather', 'Merriweather', 'serif', 'merriweather', 'Merriweather', true),
  s('pt-serif', 'PT Serif', 'serif', 'pt-serif', 'PT Serif', true, true),
  v('oswald', 'Oswald', 'display', 'oswald', 'Oswald', false),
  s('russo-one', 'Russo One', 'display', 'russo-one', 'Russo One', false, false),
  v('exo-2', 'Exo 2', 'display', 'exo-2', 'Exo 2', true),
  v('comfortaa', 'Comfortaa', 'display', 'comfortaa', 'Comfortaa', false),
  s('press-start-2p', 'Press Start 2P', 'display', 'press-start-2p', 'Press Start 2P', false, false),
  s('pacifico', 'Pacifico', 'handwriting', 'pacifico', 'Pacifico', false, false),
  s('lobster', 'Lobster', 'handwriting', 'lobster', 'Lobster', false, false),
  v('caveat', 'Caveat', 'handwriting', 'caveat', 'Caveat', false),
  s('marck-script', 'Marck Script', 'handwriting', 'marck-script', 'Marck Script', false, false),
  v('roboto-mono', 'Roboto Mono', 'mono', 'roboto-mono', 'Roboto Mono', true),
  v('source-code-pro', 'Source Code Pro', 'mono', 'source-code-pro', 'Source Code Pro', true),
  v('jetbrains-mono', 'JetBrains Mono', 'mono', 'jetbrains-mono', 'JetBrains Mono', true),
  v('fira-code', 'Fira Code', 'mono', 'fira-code', 'Fira Code', false),
]

/** Системные семейства, всегда доступные без загрузки. */
export const GENERIC_FONTS = [
  { id: 'generic:sans-serif', label: 'sans-serif', family: 'sans-serif' },
  { id: 'generic:serif', label: 'serif', family: 'serif' },
  { id: 'generic:monospace', label: 'monospace', family: 'monospace' },
] as const

export const fontById = (id: string) => FONT_LIST.find((f) => f.id === id)
export const isGeneric = (id: string) => id.startsWith('generic:')
export const isUserFont = (id: string) => id.startsWith('user:')
export const DEFAULT_FONT_ID = 'roboto'

// Диапазоны Unicode подмножеств (как в CSS пакетов): браузер скачает только файл, нужный для символов текста.
export const SUBSETS = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
} as const
export type Subset = keyof typeof SUBSETS

// Явные списки пакетов: в сборку попадают только нужные woff2 (latin и cyrillic), а не все подмножества.
const variableFiles = import.meta.glob<string>('/node_modules/@fontsource-variable/{roboto,open-sans,montserrat,inter,nunito,raleway,rubik,playfair-display,merriweather,oswald,exo-2,comfortaa,caveat,roboto-mono,source-code-pro,jetbrains-mono,fira-code}/files/*-{latin,cyrillic}-wght-{normal,italic}.woff2', { query: '?url', import: 'default' })
const staticFiles = import.meta.glob<string>('/node_modules/@fontsource/{fira-sans,pt-sans,pt-serif,russo-one,press-start-2p,pacifico,lobster,marck-script}/files/*-{latin,cyrillic}-{400,700}-{normal,italic}.woff2', { query: '?url', import: 'default' })

export interface FontFile {
  subset: Subset
  /** CSS font-weight: «100 900» у переменного, «400» или «700» у статического. */
  weight: string
  style: 'normal' | 'italic'
  /** Ленивый загрузчик адреса woff2 (динамический import: файл не трогается, пока не нужен). */
  url: () => Promise<string>
}

/** Файлы семейства: latin и cyrillic, обычное и (если есть) курсивное начертание, для статических — 400 и 700. */
export function fontFiles(f: FontEntry): FontFile[] {
  const out: FontFile[] = []
  const styles: ('normal' | 'italic')[] = f.italic ? ['normal', 'italic'] : ['normal']
  for (const subset of Object.keys(SUBSETS) as Subset[]) for (const style of styles) {
    if (f.kind === 'variable') {
      const load = variableFiles[`/node_modules/@fontsource-variable/${f.dir}/files/${f.dir}-${subset}-wght-${style}.woff2`]
      if (load) out.push({ subset, weight: '100 900', style, url: load })
    } else {
      for (const w of f.bold ? [400, 700] : [400]) {
        const load = staticFiles[`/node_modules/@fontsource/${f.dir}/files/${f.dir}-${subset}-${w}-${style}.woff2`]
        if (load) out.push({ subset, weight: String(w), style, url: load })
      }
    }
  }
  return out
}
