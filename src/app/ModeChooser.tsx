import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ModeArt } from './ModeArt'
import { MODES } from './modes'
import type { Product } from './products'
import { ChoiceCard, StartLayout, useNumberHotkeys } from './StartLayout'

/** Стартовая страница продукта с режимами (Gridfinity, Keychain): карточки режимов, клавиши 1…n. Макета для Keychain нет: те же карточки, вместо рендера детали — значок режима. */
export function ModeChooser({ product }: { product: Product }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const modes = product.modes ?? []
  useNumberHotkeys(modes.map((m) => m.path), navigate)
  return (
    <StartLayout tagline={t('start.tagline')} title={t(`start.${product.id}Title`)}>
      <div className="relative flex flex-wrap justify-center gap-6">
        {modes.map(({ id, path, Icon, labelKey, startKey }, i) => (
          <ChoiceCard key={id} to={path} testId={`card-${id}`} index={i + 1}
            art={product.id === 'gridfinity' && MODES.some((m) => m.id === id)
              ? <ModeArt id={id as (typeof MODES)[number]['id']} />
              : <Icon size={96} stroke={1} className="text-accent transition-transform group-hover:-translate-y-1 group-hover:scale-105" aria-hidden />}
            name={t(labelKey)} desc={t(`${startKey}.desc`)} tags={[t(`${startKey}.tag1`), t(`${startKey}.tag2`)]} />
        ))}
      </div>
    </StartLayout>
  )
}
