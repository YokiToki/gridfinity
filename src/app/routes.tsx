import { createHashRouter, Navigate, type RouteObject } from 'react-router'
import { AppShell } from './AppShell'
import { StartPage } from './StartPage'
import { ModeChooser } from './ModeChooser'
import { GRIDFINITY_PATH } from './modes'
import { BoxMode } from '../features/box/BoxMode'
import { BaseplateMode } from '../features/baseplate/BaseplateMode'
import { CutoutMode } from '../features/cutout/CutoutMode'
import { KeychainMode } from '../features/keychain/KeychainMode'

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
        { index: true, element: <ModeChooser /> },
        { path: 'box', element: <BoxMode /> },
        { path: 'baseplate', element: <BaseplateMode /> },
        { path: 'cutout', element: <CutoutMode /> },
        { path: '*', element: <Navigate to={GRIDFINITY_PATH} replace /> },
      ],
    },
    { path: 'keychain', element: <KeychainMode /> },
    legacy('box'), legacy('baseplate'), legacy('cutout'),
    { path: '*', element: <Navigate to="/" replace /> },
  ],
}]

export const createRouter = () => createHashRouter(routes)
