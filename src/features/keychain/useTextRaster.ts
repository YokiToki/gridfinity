import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getModelClient } from '../../app/useModel'
import type { ModelClient } from '../../geometry/modelClient'
import { textRasterKey, type TextParams, type TextRaster } from '../../geometry/text'
import { openFontStore, type FontStore } from './fontStore'
import { domDeps, rasterizeText, type RasterDeps } from './textRaster'

export interface TextRasterState {
  /** Ключ растра, уже переданного воркеру (подставляется в параметры модели); undefined — надписи нет. */
  maskId?: string
  raster: TextRaster | null
  /** Пользовательский шрифт потерян: рисуется запасной. */
  fontLost: boolean
  busy: boolean
}
export const noTextRaster: TextRasterState = { raster: null, fontLost: false, busy: false }

/** Состояние растра надписи для панели: потерянный шрифт и занятость (пока рисуется). */
export const TextRasterContext = createContext<TextRasterState>(noTextRaster)
export const useTextRasterState = () => useContext(TextRasterContext)

type Client = Pick<ModelClient, 'registerText'>

/**
 * Растрирует надпись на главном потоке (шрифт и canvas есть только здесь) и один раз передаёт маску воркеру. Растр пересчитывается
 * лишь при смене содержимого, шрифта, размера, интервалов или выравнивания (ключ `textRasterKey`): перетаскивание и поворот
 * обрабатывает воркер. Пока рисуется новый растр, остаётся прежний, чтобы модель не мигала.
 */
export function useTextRaster(text: TextParams, opts: { client?: Client; deps?: RasterDeps; debounce?: number } = {}): TextRasterState {
  const [state, setState] = useState<TextRasterState>(noTextRaster)
  const store = useRef<Promise<FontStore> | null>(null)
  const active = text.enabled && text.content.trim() !== ''
  const key = active ? textRasterKey(text) : ''
  const textRef = useRef(text)
  textRef.current = text

  useEffect(() => {
    if (!active) { setState(noTextRaster); return }
    let cancelled = false
    setState((s) => ({ ...s, busy: true }))
    const timer = setTimeout(async () => {
      try {
        store.current ??= openFontStore()
        const deps = opts.deps ?? domDeps(await store.current)
        const r = await rasterizeText(textRef.current, deps)
        if (cancelled) return
        if (!r) { setState(noTextRaster); return }
        ;(opts.client ?? getModelClient()).registerText(key, r.raster)
        setState({ maskId: key, raster: r.raster, fontLost: r.fontLost, busy: false })
      } catch {
        if (!cancelled) setState((s) => ({ ...s, busy: false }))
      }
    }, opts.debounce ?? 200)
    return () => { cancelled = true; clearTimeout(timer) }
    // перерисовка только по ключу растра
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active])

  return active ? state : noTextRaster
}
