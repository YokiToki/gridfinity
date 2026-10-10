import { useEffect, useRef, useState } from 'react'
import type { Manifold } from 'manifold-3d'
import wasmUrl from 'manifold-3d/manifold.wasm?url'
import { buildBaseplate, defaultParams, type BaseplateParams } from './baseplate'
import { toBinaryStl } from './stl'
import { Viewport } from './Viewport'
import './style.css'

const PARAMS_KEY = 'gridfinity.baseplate'

function load(): BaseplateParams {
  try { return { ...defaultParams, ...JSON.parse(localStorage.getItem(PARAMS_KEY) ?? '{}') } } catch { return defaultParams }
}

export function App() {
  const [p, setP] = useState<BaseplateParams>(load)
  const [model, setModel] = useState<Manifold | null>(null)
  const [busy, setBusy] = useState(true)
  const fitRef = useRef<() => void>(() => {})
  const set = <K extends keyof BaseplateParams>(k: K, v: BaseplateParams[K]) => setP((o) => ({ ...o, [k]: v }))

  useEffect(() => {
    try { localStorage.setItem(PARAMS_KEY, JSON.stringify(p)) } catch { /* ignore */ }
    let cancelled = false
    setBusy(true)
    const t = setTimeout(() => {
      buildBaseplate(p, wasmUrl).then((m) => { if (!cancelled) { setModel(m); setBusy(false) } })
    }, 150)
    return () => { cancelled = true; clearTimeout(t) }
  }, [p])

  const bb = model?.boundingBox()
  const dim = bb ? bb.max.map((v, i) => (v - bb.min[i]).toFixed(1)) : ['–', '–', '–']

  const exportStl = () => {
    if (!model) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(toBinaryStl(model))
    a.download = `baseplate_${p.x}x${p.y}.stl`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const num = (label: string, k: 'unit' | 'x' | 'y' | 'sizeX' | 'sizeY' | 'plateX' | 'plateY', min: number, max: number, disabled = false) => (
    <label className="row">
      <span>{label}</span>
      <input type="number" min={min} max={max} value={p[k]} disabled={disabled}
        onChange={(e) => set(k, Math.min(max, Math.max(min, Number(e.target.value) || min)))} />
    </label>
  )
  const check = (label: string, k: 'customSize' | 'magnets' | 'screws' | 'showPlate') => (
    <label className="row"><span>{label}</span>
      <input type="checkbox" checked={p[k]} onChange={(e) => set(k, e.target.checked)} /></label>
  )

  return (
    <div className="app">
      <aside>
        <h3>Size</h3>
        {num('Grid unit size, mm', 'unit', 20, 60)}
        {num('X units', 'x', 1, 20, p.customSize)}
        {num('Y units', 'y', 1, 20, p.customSize)}
        {check('Custom size', 'customSize')}
        {p.customSize && <>{num('Width, mm', 'sizeX', p.unit, 600)}{num('Depth, mm', 'sizeY', p.unit, 600)}</>}
        <div className="meas">X {dim[0]} · Y {dim[1]} · Z {dim[2]} mm</div>
        <h3>General</h3>
        {check('Magnet holes', 'magnets')}
        {check('Screw holes', 'screws')}
        {check('Show build plate', 'showPlate')}
        {p.showPlate && <>{num('Plate X, mm', 'plateX', 50, 1000)}{num('Plate Y, mm', 'plateY', 50, 1000)}</>}
        <button onClick={exportStl} disabled={!model || busy}>Export STL</button>
      </aside>
      <main>
        <Viewport model={model} plate={p.showPlate ? { x: p.plateX, y: p.plateY } : null} onFitReady={(f) => (fitRef.current = f)} />
        <button className="fit" onClick={() => fitRef.current()}>Fit to view</button>
        {busy && <div className="busy">Generating model…</div>}
      </main>
    </div>
  )
}
