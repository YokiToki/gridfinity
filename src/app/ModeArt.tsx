import type { ModeId } from './modes'
import baseplate from './art/baseplate.svg?raw'
import box from './art/box.svg?raw'
import cutout from './art/cutout.svg?raw'

/** Готовые векторные рендеры настоящих деталей 2×2 (npm run art). Цвета задают классы .art-* из theme.css; SVG вставляется как есть. */
export const ART: Record<ModeId, string> = { box, baseplate, cutout }

/** Иллюстрация карточки режима: чисто декоративная, поэтому скрыта от скринридеров. */
export function ModeArt({ id }: { id: ModeId }) {
  return (
    <div aria-hidden data-testid={`art-${id}`} dangerouslySetInnerHTML={{ __html: ART[id] }}
      className="w-[300px] max-w-full transition-transform group-hover:-translate-y-1 group-hover:scale-105 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" />
  )
}
