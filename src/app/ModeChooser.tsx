import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { MODES } from './modes'
import { ModeArt } from './ModeArt'
import { ChoiceCard, StartLayout, useNumberHotkeys } from './StartLayout'

const PATHS = MODES.map((m) => m.path)

/** Стартовая страница Gridfinity Master: выбор режима. */
export function ModeChooser() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  useNumberHotkeys(PATHS, navigate)
  return (
    <StartLayout tagline={t('start.tagline')} title={t('start.gridfinityTitle')}>
      <div className="relative flex flex-wrap justify-center gap-6">
        {MODES.map(({ id, path }, i) => (
          <ChoiceCard key={id} to={path} testId={`card-${id}`} index={i + 1} art={<ModeArt id={id} />}
            name={t(`modes.${id}`)} desc={t(`start.${id}.desc`)} tags={[t(`start.${id}.tag1`), t(`start.${id}.tag2`)]} />
        ))}
      </div>
    </StartLayout>
  )
}
