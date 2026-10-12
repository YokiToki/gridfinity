import { useCallback, useEffect, useRef, useState } from 'react'

/** Высота элемента в px (следит за изменениями через ResizeObserver); ref вешается на сам элемент. */
export function useElementHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState(0)
  const [el, setEl] = useState<T | null>(null)
  const ref = useCallback((node: T | null) => setEl(node), [])
  const last = useRef(0)
  useEffect(() => {
    if (!el) { if (last.current) { last.current = 0; setHeight(0) } return }
    const measure = () => { const h = el.offsetHeight; if (h !== last.current) { last.current = h; setHeight(h) } }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [ref, height] as const
}
