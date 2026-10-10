import { RouterProvider } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import { UnitProvider } from '../ui/UnitProvider'
import { createRouter } from './routes'

const router = createRouter()

export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <UnitProvider><RouterProvider router={router} /></UnitProvider>
    </I18nextProvider>
  )
}
