import { useTranslation } from 'react-i18next'
import { ComingSoon } from '../../app/ComingSoon'

/** Keychain Master: заглушка до 11-keychain-relief. Состояние продукта будет жить под ключами keychain.*. */
export function KeychainMode() {
  const { t } = useTranslation()
  return <ComingSoon name={t('products.keychain.name')} />
}
