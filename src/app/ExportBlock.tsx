import { useTranslation } from 'react-i18next'
import { IconDownload } from '@tabler/icons-react'
import { toBinaryStl } from '../geometry/stl'
import type { ModelResult } from '../geometry/model'
import { Button } from '../ui/Button'

function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Экспорт STL: одна плита или части по отдельности (метка части входит в имя файла). */
export function ExportBlock({ model, busy, name }: { model: ModelResult | null; busy: boolean; name: string }) {
  const { t } = useTranslation()
  const parts = model?.parts ?? []
  const disabled = !model || busy
  if (parts.length <= 1) {
    return (
      <Button primary className="w-full" disabled={disabled} onClick={() => parts[0] && download(toBinaryStl(parts[0].mesh), `${name}.stl`)}>
        <IconDownload size={16} stroke={1.75} />{t('baseplate.export.stl')}
      </Button>
    )
  }
  const file = (label: string) => `${name}_${label}.stl`
  return (
    <div className="flex flex-col gap-2">
      <Button primary className="w-full" disabled={disabled} onClick={() => parts.forEach((p) => download(toBinaryStl(p.mesh), file(p.label)))}>
        <IconDownload size={16} stroke={1.75} />{t('baseplate.export.all')} ({parts.length})
      </Button>
      <div className="grid grid-cols-3 gap-1.5">
        {parts.map((p) => (
          <Button key={p.label} className="h-8 px-2 text-xs" disabled={disabled} aria-label={t('baseplate.export.part', { label: p.label })}
            title={file(p.label)} onClick={() => download(toBinaryStl(p.mesh), file(p.label))}>
            {p.oversize && <span aria-hidden className="text-error">!</span>}{t('baseplate.export.partFile', { label: p.label })}
          </Button>
        ))}
      </div>
    </div>
  )
}
