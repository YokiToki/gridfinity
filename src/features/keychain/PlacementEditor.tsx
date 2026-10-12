import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconMagnet, IconTarget } from '@tabler/icons-react'
import type { KeychainInfo, KeychainParams } from '../../geometry/keychain'
import { Button } from '../../ui/Button'
import { LengthField } from '../../ui/LengthField'
import { formatLength, useUnit } from '../../ui/units'
import { nearestOnContour, niceStep, previewContour } from './contour'

export type Target = 'mount' | 'exit' | `pin${number}`

/** Что редактор может менять: положения в долях габарита силуэта (0 слева/снизу, Y вверх). */
export interface PlacementPatch { mount?: { x: number; y: number }; exit?: { x: number; y: number }; pin?: { index: number; x: number; y: number } }

/**
 * Редактор положения (вид сверху): контур силуэта, сетка в мм с линейками, крепление и штифты в масштабе. Перетаскивание точек,
 * ввод точных X и Y, привязка к контуру. Координаты редактора — мм от левого нижнего угла габарита; хранятся в долях габарита.
 * Макета нет: собран из компонентов ui/ и токенов темы.
 */
export function PlacementEditor({ params: p, info, onPlace, onPick, rejectedShown }: {
  params: KeychainParams
  info: KeychainInfo
  onPlace: (patch: PlacementPatch) => void
  /** Выбрать подсказанное место. */
  onPick: (pos: { x: number; y: number; exit?: { x: number; y: number } }) => void
  rejectedShown: boolean
}) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const svg = useRef<SVGSVGElement>(null)
  const [target, setTarget] = useState<Target>('mount')
  const [drag, setDrag] = useState<{ target: Target; x: number; y: number } | null>(null)
  const size = info.size, mi = info.mountInfo
  const W = size?.[0] ?? 1, H = size?.[1] ?? 1
  const contour = useMemo(() => (info.preview && size ? previewContour(info.preview, W, H) : []), [info.preview, W, H, size])
  if (!size || !info.preview) return null

  const m = Math.max(0.25 * Math.max(W, H), p.mount.outer / 2 + 6)
  const step = niceStep(Math.max(W, H))
  // Подписи линеек лежат в полосе внутри viewBox (слева и снизу), а не на самом краю: размер шрифта от шага сетки, но не мельче 2.6 мм.
  const fs = Math.max(step / 3, 2.6)
  const bandL = fs * 3.4, bandB = fs * 1.7, pad = fs * 0.4
  const inner = { x: -W / 2 - m, y: -H / 2 - m, w: W + 2 * m, h: H + 2 * m } // область чертежа; y в мм со знаком «вверх»: переворачиваем при рисовании
  const vb = { x: inner.x - bandL, y: inner.y - pad, w: inner.w + bandL + pad, h: inner.h + bandB + pad }
  const sy = (y: number) => -y
  const ticksX: number[] = [], ticksY: number[] = []
  for (let v = Math.ceil((-m) / step) * step; v <= W + m; v += step) ticksX.push(+v.toFixed(6))
  for (let v = Math.ceil((-m) / step) * step; v <= H + m; v += step) ticksY.push(+v.toFixed(6))
  const fmt = (v: number) => formatLength(v, unit)
  const GRID_W = 0.15, AXIS_W = 0.5

  // положения в мм от центра: из ответа воркера, с учётом перетаскивания
  const at = (tg: Target): { x: number; y: number } | null => {
    if (drag && drag.target === tg) return { x: drag.x, y: drag.y }
    if (tg === 'mount') return mi?.mount ?? null
    if (tg === 'exit') return mi?.mount?.exit ?? null
    const i = Number(tg.slice(3))
    return mi?.pins[i] ? { x: mi.pins[i].x, y: mi.pins[i].y } : null
  }
  const toRel = (x: number, y: number) => ({ x: (x + W / 2) / W, y: (y + H / 2) / H })
  const commit = (tg: Target, x: number, y: number) => {
    const r = toRel(x, y)
    if (tg === 'mount') onPlace({ mount: r })
    else if (tg === 'exit') onPlace({ exit: r })
    else onPlace({ pin: { index: Number(tg.slice(3)), ...r } })
  }
  const pointer = (e: RPointerEvent): { x: number; y: number } | null => {
    const el = svg.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return null
    return { x: vb.x + ((e.clientX - r.left) / r.width) * vb.w, y: -(vb.y + ((e.clientY - r.top) / r.height) * vb.h) }
  }
  const down = (tg: Target) => (e: RPointerEvent) => {
    setTarget(tg)
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    const q = pointer(e); const cur = at(tg)
    if (q && cur) setDrag({ target: tg, x: q.x, y: q.y })
  }
  const move = (e: RPointerEvent) => { if (!drag) return; const q = pointer(e); if (q) setDrag({ ...drag, x: q.x, y: q.y }) }
  const up = () => { if (drag) { commit(drag.target, drag.x, drag.y); setDrag(null) } }

  const cur = at(target)
  const edX = cur ? cur.x + W / 2 : 0, edY = cur ? cur.y + H / 2 : 0
  const setEd = (ex: number, ey: number) => commit(target, ex - W / 2, ey - H / 2)
  const snap = () => { if (!cur) return; const n = nearestOnContour(contour, cur.x, cur.y); if (n) commit(target, n.x, n.y) }
  const mo = p.mount
  const mountPt = at('mount'), exitPt = at('exit')
  const stroke = 'var(--color-border-strong)'

  return (
    <div className="flex flex-col gap-2" data-testid="placement-editor">
      <svg ref={svg} role="group" aria-label={t('keychain.editor.label')} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className="block h-auto w-full touch-none rounded-control border border-border bg-bg">
        {/* сетка и линейки: от левого нижнего угла габарита, в мм (значения подписей — в единице отображения); оси через 0 жирнее сетки */}
        {ticksX.map((v) => <line key={`gx${v}`} data-kind={v === 0 ? 'axis' : 'grid'} x1={v - W / 2} x2={v - W / 2} y1={inner.y} y2={inner.y + inner.h} stroke={stroke} strokeWidth={v === 0 ? AXIS_W : GRID_W} opacity={v === 0 ? 1 : 0.7} />)}
        {ticksY.map((v) => <line key={`gy${v}`} data-kind={v === 0 ? 'axis' : 'grid'} y1={sy(v - H / 2)} y2={sy(v - H / 2)} x1={inner.x} x2={inner.x + inner.w} stroke={stroke} strokeWidth={v === 0 ? AXIS_W : GRID_W} opacity={v === 0 ? 1 : 0.7} />)}
        <path d={`M${-W / 2 - fs * 0.5},${H / 2}h${fs}m${-fs * 0.5},${-fs * 0.5}v${fs}`} stroke="var(--color-text)" strokeWidth={0.6} fill="none" data-testid="origin-cross" />
        {ticksX.map((v) => <text key={`tx${v}`} data-ruler="x" x={v - W / 2} y={inner.y + inner.h + fs * 1.15} fontSize={fs} textAnchor="middle" fill="var(--color-text)">{fmt(v)}</text>)}
        {ticksY.map((v) => <text key={`ty${v}`} data-ruler="y" x={inner.x - fs * 0.3} y={sy(v - H / 2) + fs * 0.35} fontSize={fs} textAnchor="end" fill="var(--color-text)">{fmt(v)}</text>)}
        <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="none" stroke={stroke} strokeWidth={0.2} strokeDasharray="1.5 1.5" />
        {contour.map((l, i) => <polygon key={i} points={l.map(([x, y]) => `${x},${sy(y)}`).join(' ')} fill="var(--color-accent-muted)" stroke="var(--color-accent)" strokeWidth={0.3} fillRule="evenodd" opacity={0.85} />)}

        {rejectedShown && mi?.rejected.map((q, i) => (
          <g key={`rj${i}`} data-testid="rejected"><title>{t(`keychain.editor.reasons.${q.reason}`)}</title>
            <path d={`M${q.x - 0.6},${sy(q.y) - 0.6}l1.2,1.2m0,-1.2l-1.2,1.2`} stroke="var(--color-error-text)" strokeWidth={0.25} opacity={0.7} /></g>
        ))}
        {mi?.candidates.map((q, i) => (
          <g key={`cd${i}`} data-testid="candidate" onClick={() => onPick({ x: q.x, y: q.y, exit: q.exit })} className="cursor-pointer">
            <title>{t('keychain.editor.candidate', { n: i + 1 })}</title>
            <circle cx={q.x} cy={sy(q.y)} r={Math.max(1, mo.diameter / 2)} fill="none" stroke="var(--color-success-text)" strokeWidth={0.4} strokeDasharray="1 0.8" />
            <text x={q.x} y={sy(q.y) + 0.8} fontSize={2.4} textAnchor="middle" fill="var(--color-success-text)">{i + 1}</text>
          </g>
        ))}

        {mo.style === 'channel' && mountPt && exitPt && <line x1={mountPt.x} y1={sy(mountPt.y)} x2={exitPt.x} y2={sy(exitPt.y)} stroke="var(--color-warn-text)" strokeWidth={mo.diameter} strokeLinecap="round" opacity={0.25} />}
        {mountPt && mo.style !== 'none' && (
          <g data-testid="mount-handle" onPointerDown={down('mount')} className="cursor-grab">
            {mo.style === 'eyelet' && <circle cx={mountPt.x} cy={sy(mountPt.y)} r={mo.outer / 2} fill="var(--color-warn-border)" opacity={0.35} stroke="var(--color-warn-text)" strokeWidth={0.3} />}
            <circle cx={mountPt.x} cy={sy(mountPt.y)} r={mo.diameter / 2} fill="var(--color-bg)" stroke={target === 'mount' ? 'var(--color-accent)' : 'var(--color-warn-text)'} strokeWidth={0.5} />
            <path d={`M${mountPt.x - 1},${sy(mountPt.y)}h2m-1,-1v2`} stroke="var(--color-warn-text)" strokeWidth={0.25} />
          </g>
        )}
        {exitPt && mo.style === 'channel' && (
          <g data-testid="exit-handle" onPointerDown={down('exit')} className="cursor-grab">
            <circle cx={exitPt.x} cy={sy(exitPt.y)} r={Math.max(1.4, mo.diameter / 2)} fill="none" stroke={target === 'exit' ? 'var(--color-accent)' : 'var(--color-warn-text)'} strokeWidth={0.5} strokeDasharray="1 0.8" />
          </g>
        )}
        {mi?.pins.map((q, i) => {
          const pos = at(`pin${i}`)!
          return (
            <g key={`pin${i}`} data-testid={`pin-handle-${i}`} onPointerDown={down(`pin${i}`)} className="cursor-grab">
              <circle cx={pos.x} cy={sy(pos.y)} r={Math.max(0.9, p.split.pinRadius)} fill="var(--color-bg)" stroke={!q.used ? 'var(--color-error-text)' : target === `pin${i}` ? 'var(--color-accent)' : 'var(--color-text)'} strokeWidth={0.4} strokeDasharray={q.used ? undefined : '0.8 0.6'} />
              <text x={pos.x} y={sy(pos.y) - p.split.pinRadius - 0.8} fontSize={2.2} textAnchor="middle" fill="var(--color-text)">{i + 1}</text>
            </g>
          )
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted" role="radiogroup" aria-label={t('keychain.editor.target')}>
        {mo.style !== 'none' && <TargetBtn on={target === 'mount'} onClick={() => setTarget('mount')} label={t(mo.style === 'channel' ? 'keychain.editor.channelEnd' : 'keychain.editor.mount')} />}
        {mo.style === 'channel' && <TargetBtn on={target === 'exit'} onClick={() => setTarget('exit')} label={t('keychain.editor.exit')} />}
        {(mi?.pins ?? []).map((_, i) => <TargetBtn key={i} on={target === `pin${i}`} onClick={() => setTarget(`pin${i}`)} label={t('keychain.editor.pin', { n: i + 1 })} />)}
      </div>
      {cur && (
        <div className="grid grid-cols-2 gap-2">
          <LengthField label={t('keychain.editor.x')} value={edX} min={-m} max={W + m} step={0.5} onChange={(v) => setEd(v, edY)} />
          <LengthField label={t('keychain.editor.y')} value={edY} min={-m} max={H + m} step={0.5} onChange={(v) => setEd(edX, v)} />
        </div>
      )}
      <Button onClick={snap} disabled={!cur}><IconMagnet size={16} stroke={1.75} />{t('keychain.editor.snap')}</Button>
      <span className="inline-flex items-center gap-1.5 text-xs text-text-subtle"><IconTarget size={14} stroke={1.75} />{t('keychain.editor.hint')}</span>
    </div>
  )
}

function TargetBtn({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick}
      className={`inline-flex h-7 cursor-pointer items-center rounded-control border px-2 text-xs ${on ? 'border-accent bg-accent-muted text-white' : 'border-border-strong bg-surface-2 text-text-muted hover:text-text'}`}>{label}</button>
  )
}
