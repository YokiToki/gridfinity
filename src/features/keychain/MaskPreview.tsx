import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import type { MaskPreview as Preview } from '../../geometry/keychain'

const css = (name: string, fallback: string) => (typeof document === 'undefined' ? fallback : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback)

/** Предпросмотр маски силуэта с номерами дырок: фон, материал, залитая дырка, открытая дырка. Закрепляется в углу вьюпорта, сворачивается. */
export function MaskPreview({ preview }: { preview: Preview | null }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLCanvasElement>(null)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const c = ref.current
    if (!c || !preview || !open) return
    const ctx = c.getContext('2d')
    if (!ctx) return // jsdom без canvas
    const colors = [css('--color-bg', '#0e1013'), css('--color-accent', '#7c9cff'), css('--color-warn-border', '#8a6d2b'), css('--color-accent-muted', '#25356b')]
    const img = ctx.createImageData(preview.width, preview.height)
    const rgb = colors.map((hex) => { const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] })
    for (let i = 0; i < preview.data.length; i++) { const col = rgb[preview.data[i]] ?? rgb[0]; img.data.set([col[0], col[1], col[2], 255], i * 4) }
    ctx.putImageData(img, 0, 0)
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (const h of preview.holes) {
      ctx.fillStyle = '#000'; ctx.fillText(String(h.id), h.cx + 0.7, h.cy + 0.7)
      ctx.fillStyle = h.open ? '#fff' : '#cfd6e6'; ctx.fillText(String(h.id), h.cx, h.cy)
    }
  }, [preview, open])

  return (
    <div className="absolute top-4 left-4 z-[1] w-44 rounded-card border border-border bg-surface-1/90 shadow-float md:w-52" data-testid="mask-preview">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex h-8 w-full cursor-pointer items-center justify-between gap-1 rounded-t-card border-0 bg-transparent px-2.5 text-xs font-medium text-text-muted hover:text-text">
        <span>{t('keychain.preview.title')}</span>{open ? <IconChevronUp size={14} stroke={1.75} /> : <IconChevronDown size={14} stroke={1.75} />}
      </button>
      {open && (
        <div className="px-2 pb-2">
          {preview
            ? <canvas ref={ref} width={preview.width} height={preview.height} role="img" aria-label={t('keychain.preview.label')} className="block h-auto w-full rounded-xs [image-rendering:pixelated]" />
            : <span className="text-xs text-text-subtle">{t('keychain.preview.empty')}</span>}
        </div>
      )}
    </div>
  )
}
