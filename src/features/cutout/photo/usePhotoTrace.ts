import { useCallback, useEffect, useMemo, useState } from 'react'
import { checkQuad, rectify, type Pt, type QuadCheck, type Rectified } from '../../../geometry/photo/homography'
import { paperSize, type Paper, type PaperOrientation, type PaperPreset } from '../../../geometry/photo/paper'
import { segment, type Segmentation } from '../../../geometry/photo/segment'
import type { GrayImage } from '../../../geometry/raster/threshold'
import { decodeImage, ImageError, type ImageErrorCode } from '../../keychain/decodeImage'

export interface PhotoSettings {
  preset: PaperPreset
  orientation: PaperOrientation
  custom: { width: number; length: number }
  /** Углы листа на снимке (пиксели): левый верхний, правый верхний, правый нижний, левый нижний. */
  corners: Pt[]
  /** null — автоматическая чувствительность. */
  sensitivity: number | null
  margin: number
  /** Номера силуэтов, снятых с выбора. */
  excluded: number[]
  depth: number
  clearance: number
}

export const defaultPhotoSettings: PhotoSettings = {
  preset: 'a4', orientation: 'landscape', custom: { width: 210, length: 297 }, corners: [],
  sensitivity: null, margin: 3, excluded: [], depth: 10, clearance: 0.8,
}

/** Начальные углы: прямоугольник, отступивший от краёв снимка на 15 %. */
export const insetCorners = (w: number, h: number, k = 0.15): Pt[] => [[w * k, h * k], [w * (1 - k), h * k], [w * (1 - k), h * (1 - k)], [w * k, h * (1 - k)]]

export interface PhotoImage { name: string; image: GrayImage; downscaled: boolean }

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    if (ms <= 0) { setV(value); return }
    const id = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  return ms <= 0 ? value : v
}

export interface PhotoTrace {
  photo: PhotoImage | null
  settings: PhotoSettings
  set: (patch: Partial<PhotoSettings>) => void
  paper: Paper
  quad: QuadCheck
  /** Выпрямленный лист и силуэты по отложенным (после остановки перетаскивания) настройкам. */
  rectified: Rectified | null
  segmentation: Segmentation | null
  error: ImageErrorCode | null
  loading: boolean
  load: (file: File) => Promise<void>
  /** Номера выбранных силуэтов. */
  selected: number[]
  toggle: (id: number) => void
}

/**
 * Состояние мастера «Из фото»: снимок, лист, углы, чувствительность и выбор силуэтов. Живёт в панели выреза, пока открыта
 * страница: закрытие и повторное открытие окна не теряют снимок и настройки. Тяжёлые шаги (выпрямление, силуэты) считаются
 * по настройкам, устоявшимся debounceMs после последнего изменения, так что перетаскивание угла не пересчитывает всё на каждом движении.
 */
export function usePhotoTrace(debounceMs = 120): PhotoTrace {
  const [photo, setPhoto] = useState<PhotoImage | null>(null)
  const [settings, setSettings] = useState<PhotoSettings>(defaultPhotoSettings)
  const [error, setError] = useState<ImageErrorCode | null>(null)
  const [loading, setLoading] = useState(false)
  const set = useCallback((patch: Partial<PhotoSettings>) => setSettings((s) => ({ ...s, ...patch })), [])

  const paper = useMemo(() => paperSize(settings.preset, settings.orientation, settings.custom), [settings.preset, settings.orientation, settings.custom])
  const quad = photo ? checkQuad(settings.corners) : 'tooSmall'

  const load = useCallback(async (file: File) => {
    setLoading(true); setError(null)
    try {
      const d = await decodeImage(file)
      setPhoto({ name: file.name, image: d.image, downscaled: d.downscaled })
      setSettings((s) => ({ ...s, corners: insetCorners(d.image.width, d.image.height), excluded: [] }))
    } catch (e) {
      setError(e instanceof ImageError ? e.code : 'decode')
    } finally { setLoading(false) }
  }, [])

  const stable = useDebounced({ corners: settings.corners, paper, margin: settings.margin, sensitivity: settings.sensitivity }, debounceMs)
  const rectified = useMemo(() => (photo ? rectify(photo.image, stable.corners, stable.paper) : null), [photo, stable.corners, stable.paper])
  const segmentation = useMemo(
    () => (rectified ? segment(rectified, { margin: stable.margin, ...(stable.sensitivity === null ? {} : { sensitivity: stable.sensitivity }) }) : null),
    [rectified, stable.margin, stable.sensitivity],
  )
  const selected = useMemo(() => (segmentation?.silhouettes ?? []).map((s) => s.id).filter((id) => !settings.excluded.includes(id)), [segmentation, settings.excluded])
  const toggle = useCallback((id: number) => setSettings((s) => ({ ...s, excluded: s.excluded.includes(id) ? s.excluded.filter((x) => x !== id) : [...s.excluded, id] })), [])

  return { photo, settings, set, paper, quad, rectified, segmentation, error, loading, load, selected, toggle }
}
