import { createHashRouter, Navigate, type RouteObject } from 'react-router'
import { useTranslation } from 'react-i18next'
import { AppShell } from './AppShell'
import { StartPage } from './StartPage'
import { ModeChooser } from './ModeChooser'
import { GRIDFINITY_PATH, KEYCHAIN_PATH } from './modes'
import { productById } from './products'
import { ComingSoon } from './ComingSoon'
import { BoxMode } from '../features/box/BoxMode'
import { BaseplateMode } from '../features/baseplate/BaseplateMode'
import { CutoutMode } from '../features/cutout/CutoutMode'
import { KeychainMode } from '../features/keychain/KeychainMode'

/** Режим Форма появляется в этой же правке (задача 1.2); пока заглушка. */
function ShapePlaceholder() {
  const { t } = useTranslation()
  return <ComingSoon name={t('keychain.modes.shape')} />
}

/** Прежние адреса режимов (до появления продуктов) ведут на новые. */
const legacy = (mode: string): RouteObject => ({ path: mode, element: <Navigate to={`${GRIDFINITY_PATH}/${mode}`} replace /> })

export const routes: RouteObject[] = [{
  path: '/',
  element: <AppShell />,
  children: [
    { index: true, element: <StartPage /> },
    {
      path: 'gridfinity',
      children: [
        { index: true, element: <ModeChooser product={productById('gridfinity')!} /> },
        { path: 'box', element: <BoxMode /> },
        { path: 'baseplate', element: <BaseplateMode /> },
        { path: 'cutout', element: <CutoutMode /> },
        { path: '*', element: <Navigate to={GRIDFINITY_PATH} replace /> },
      ],
    },
    {
      path: 'keychain',
      children: [
        { index: true, element: <ModeChooser product={productById('keychain')!} /> },
        { path: 'image', element: <KeychainMode /> },
        { path: 'shape', element: <ShapePlaceholder /> },
        { path: '*', element: <Navigate to={KEYCHAIN_PATH} replace /> },
      ],
    },
    legacy('box'), legacy('baseplate'), legacy('cutout'),
    { path: '*', element: <Navigate to="/" replace /> },
  ],
}]

export const createRouter = () => createHashRouter(routes)
