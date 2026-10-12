import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ModeArt } from './ModeArt'
import type { Product } from './products'
import { ChoiceCard, StartLayout, useNumberHotkeys } from './StartLayout'

/** Стартовая страница продукта с режимами (Gridfinity, Keychain): карточки режимов с рендерами деталей, клавиши 1…n. */
export function ModeChooser({ product }: { product: Product }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const modes = product.modes ?? []
  useNumberHotkeys(modes.map((m) => m.path), navigate)
  return (
    <StartLayout tagline={t('start.tagline')} title={t(`start.${product.id}Title`)}>
      <div className="relative flex flex-wrap justify-center gap-6">
        {modes.map(({ id, path, labelKey, startKey, artId }, i) => (
          <ChoiceCard key={id} to={path} testId={`card-${id}`} index={i + 1}
            art={<ModeArt id={artId} />}
            name={t(labelKey)} desc={t(`${startKey}.desc`)} tags={[t(`${startKey}.tag1`), t(`${startKey}.tag2`)]} />
        ))}
      </div>
    </StartLayout>
  )
}
