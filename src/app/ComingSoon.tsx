import { useTranslation } from 'react-i18next'
import { Workspace } from './Workspace'
import { Banner } from '../ui/Banner'
import type { ModeId } from './modes'

/** Заглушка режима, который ещё не реализован: панель с пояснением, вьюпорт остаётся рабочим. */
export function ComingSoon({ mode }: { mode: ModeId }) {
  const { t } = useTranslation()
  return (
    <Workspace model={null} panel={
      <div className="flex flex-col gap-3 p-4">
        <h2 className="m-0 text-[15px] font-semibold">{t('modes.comingSoon', { mode: t(`modes.${mode}`) })}</h2>
        <Banner>{t('modes.comingSoonHint')}</Banner>
      </div>
    } />
  )
}
