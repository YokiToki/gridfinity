import type { Manifold } from 'manifold-3d'
import { useTranslation } from 'react-i18next'
import { IconDownload } from '@tabler/icons-react'
import { toBinaryStl } from '../../geometry/stl'
import { Button } from '../../ui/Button'

export function ExportBlock({ model, busy, name }: { model: Manifold | null; busy: boolean; name: string }) {
  const { t } = useTranslation()
  const exportStl = () => {
    if (!model) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(toBinaryStl(model))
    a.download = `${name}.stl`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return <Button primary className="w-full" disabled={!model || busy} onClick={exportStl}><IconDownload size={16} stroke={1.75} />{t('baseplate.export')}</Button>
}
