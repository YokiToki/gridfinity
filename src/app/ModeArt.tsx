import baseplate from './art/baseplate.svg?raw'
import box from './art/box.svg?raw'
import cutout from './art/cutout.svg?raw'
import keychainImage from './art/keychainImage.svg?raw'
import keychainShape from './art/keychainShape.svg?raw'

/** Готовые векторные рендеры настоящих деталей (npm run art). Цвета задают классы .art-* из theme.css; SVG вставляется как есть. */
export const ART = { box, baseplate, cutout, keychainImage, keychainShape }
export type ArtId = keyof typeof ART
export const ART_IDS = Object.keys(ART) as ArtId[]

/** Иллюстрация карточки: чисто декоративная, поэтому скрыта от скринридеров. */
export function ModeArt({ id }: { id: ArtId }) {
  return (
    <div aria-hidden data-testid={`art-${id}`} dangerouslySetInnerHTML={{ __html: ART[id] }}
      className="w-[300px] max-w-full transition-transform group-hover:-translate-y-1 group-hover:scale-105 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" />
  )
}
