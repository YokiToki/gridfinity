import { channelBreach, heightOver, nodeAt, rimAt, type AnchorField } from './anchors'

export type FitKind = 'outside' | 'thinWall' | 'thinFloor' | 'pinTooBig' | 'noBreach' | 'cavityBreach' | 'coarse'
/** Нарушение посадки: что за элемент, какого рода, фактическое и требуемое значение (мм). Ключ i18n: keychain.warning.<kind>. */
export interface FitIssue { feature: string; kind: FitKind; actual: number; required: number }

export interface FitInput {
  field: AnchorField
  /** Стиль крепления и его размеры, мм (центры от центра габарита силуэта). */
  mount: { style: 'none' | 'hole' | 'eyelet' | 'channel'; x: number; y: number; diameter: number; exit?: { x: number; y: number } }
  pins: { x: number; y: number }[]
  pinRadius: number
  /** Глубина отверстия под штифт в каждой половине, мм. */
  pinDepth: number
  minWall: number
}

/** Проверки посадки по тем же данным, из которых строится модель: стенка, толщина под пятном, выход канала, штифты, грубость сетки. */
export function fitChecks(inp: FitInput): FitIssue[] {
  const { field: f, mount: m, minWall } = inp
  const out: FitIssue[] = []
  const coarse = (name: string, r: number) => { if (2 * r < 2 * f.cell - 1e-9) out.push({ feature: name, kind: 'coarse', actual: f.cell, required: r }) }

  if (m.style === 'hole' || m.style === 'channel') {
    const r = m.diameter / 2
    const name = m.style === 'hole' ? 'hole' : 'channel'
    const k = nodeAt(f, m.x, m.y)
    if (k === null || !f.solid[k]) out.push({ feature: name, kind: 'outside', actual: 0, required: minWall })
    else {
      const rim = rimAt(f, m.x, m.y) - r
      // для отверстия стенка нужна со всех сторон; у внутренней точки канала — тоже
      if (rim < minWall - 1e-9) out.push({ feature: name, kind: 'thinWall', actual: Math.max(0, rim), required: minWall })
      const need = m.style === 'channel' ? r + minWall : minWall // канал лежит в плоскости разъёма: в каждой половине нужна высота ≥ радиуса + стенка
      const h = heightOver(f, m.x, m.y, r)
      if (h < need - 1e-9) out.push({ feature: name, kind: 'thinFloor', actual: h, required: need })
    }
    coarse(name, r)
  }
  if (m.style === 'channel' && m.exit) {
    const b = channelBreach(f, { x: m.x, y: m.y }, m.exit, m.diameter / 2)
    if (!b.ok) out.push({ feature: 'channel', kind: b.reason === 'cavity' ? 'cavityBreach' : 'noBreach', actual: 0, required: 0 })
  }
  inp.pins.forEach((p, idx) => {
    const name = `pin${idx + 1}`
    const k = nodeAt(f, p.x, p.y)
    if (k === null || !f.solid[k]) { out.push({ feature: name, kind: 'outside', actual: 0, required: minWall }); return }
    const rim = rimAt(f, p.x, p.y) - inp.pinRadius
    const h = heightOver(f, p.x, p.y, inp.pinRadius)
    const needH = inp.pinDepth + minWall
    if (rim < minWall - 1e-9) out.push({ feature: name, kind: 'pinTooBig', actual: Math.max(0, rim), required: minWall })
    else if (h < needH - 1e-9) out.push({ feature: name, kind: 'pinTooBig', actual: h, required: needH })
    coarse(name, inp.pinRadius)
  })
  return out
}
