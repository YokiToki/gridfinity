import { createHashRouter, Navigate, type RouteObject } from 'react-router'
import { AppShell } from './AppShell'
import { StartPage } from './StartPage'
import { BoxMode } from '../features/box/BoxMode'
import { BaseplateMode } from '../features/baseplate/BaseplateMode'
import { CutoutMode } from '../features/cutout/CutoutMode'

export const routes: RouteObject[] = [{
  path: '/',
  element: <AppShell />,
  children: [
    { index: true, element: <StartPage /> },
    { path: 'box', element: <BoxMode /> },
    { path: 'baseplate', element: <BaseplateMode /> },
    { path: 'cutout', element: <CutoutMode /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
}]

export const createRouter = () => createHashRouter(routes)
