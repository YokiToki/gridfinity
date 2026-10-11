import { useTranslation } from 'react-i18next'
import { Workspace } from './Workspace'
import { Banner } from '../ui/Banner'

/** Заглушка режима или продукта, которые ещё не реализованы: панель с пояснением, вьюпорт остаётся рабочим. */
export function ComingSoon({ name }: { name: string }) {
  const { t } = useTranslation()
  return (
    <Workspace model={null} exportOptions={false} panel={
      <div className="flex flex-col gap-3 p-4">
        <h2 className="m-0 text-[15px] font-semibold">{t('modes.comingSoon', { mode: name })}</h2>
        <Banner>{t('modes.comingSoonHint')}</Banner>
      </div>
    } />
  )
}
