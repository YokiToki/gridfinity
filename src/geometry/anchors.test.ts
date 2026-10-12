import { describe, expect, it } from 'vitest'
import { anchorField, channelBreach, exitRay, exteriorOf, findAnchors, heightOver, minHeightField, mmToRel, nodeMm, relToMm, type AnchorField } from './anchors'
import { fitChecks } from './keychainFit'

/** Поле из функции «материал/высота»: n × n узлов с шагом cell, начало в центре. */
function field(n: number, cell: number, f: (x: number, y: number) => number): AnchorField {
  const solid = new Uint8Array(n * n), top = new Float32Array(n * n)
  const w = (n - 1) * cell
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * cell - w / 2, y = w / 2 - j * cell
    const h = f(x, y)
    if (h > 0) { solid[j * n + i] = 1; top[j * n + i] = h }
  }
  return anchorField({ nx: n, ny: n, dx: cell, dy: cell, i0: 0, j0: 0, solid, top }, w, w, cell)
}
const disc = (R: number, h = 2) => (x: number, y: number) => (Math.hypot(x, y) <= R ? h : 0)

describe('поиск мест (1.1)', () => {
  it('диск: лучшее место — центр, дальше кольцо вокруг центра на расстоянии spacing', () => {
    const f = field(101, 1, disc(40))
    const { accepted } = findAnchors(f, { radius: 2, minHeight: 1, minRim: 2 }, { count: 4, spacing: 10 })
    expect(accepted).toHaveLength(4)
    expect(Math.hypot(accepted[0].x, accepted[0].y)).toBeLessThan(1.5)
    for (const a of accepted.slice(1)) expect(Math.hypot(a.x, a.y)).toBeGreaterThanOrEqual(10 - 1e-9)
    for (let i = 0; i < accepted.length; i++) for (let j = i + 1; j < accepted.length; j++) expect(Math.hypot(accepted[i].x - accepted[j].x, accepted[i].y - accepted[j].y)).toBeGreaterThanOrEqual(10 - 1e-9)
  })
  it('высота меряется по всему пятну: узкое низкое место отвергается как «thin», а не принимается по центру', () => {
    // высокая плита 2 мм с узкой бороздой 1 мм шириной 2 мм: центр борозды сам по себе высок, но пятно радиуса 3 захватывает низ
    const f = field(101, 1, (x, y) => (Math.hypot(x, y) <= 40 ? (Math.abs(x) <= 1 ? 0.3 : 2) : 0))
    const r = findAnchors(f, { radius: 3, minHeight: 1, minRim: 1 }, { count: 3, spacing: 8, rejectedSample: 400 })
    for (const a of r.accepted) expect(Math.abs(a.x)).toBeGreaterThan(3 - 1e-9) // пятно целиком вне борозды
    expect(r.rejected.some((x) => x.reason === 'thin' && Math.abs(x.x) <= 3)).toBe(true)
    const nearGroove = r.rejected.find((x) => x.reason === 'thin')!
    expect(nearGroove.actual).toBeLessThan(nearGroove.required)
  })
  it('тонкий кончик отвергается с причиной «rim», фактическая стенка меньше требуемой', () => {
    // диск R = 20 и тонкий выступ шириной 4 мм до x = 45
    const f = field(121, 1, (x, y) => (Math.hypot(x, y) <= 20 || (x > 0 && x <= 45 && Math.abs(y) <= 2) ? 2 : 0))
    const r = findAnchors(f, { radius: 3, minHeight: 1, minRim: 1 }, { count: 20, spacing: 3, rejectedSample: 2000 })
    for (const a of r.accepted) expect(a.x).toBeLessThanOrEqual(20)
    const tip = r.rejected.find((x) => x.x > 30 && Math.abs(x.y) < 1.5)
    expect(tip?.reason).toBe('rim')
    expect(tip!.actual).toBeLessThan(tip!.required)
  })
  it('вне материала — причина «outside» около края', () => {
    const f = field(61, 1, disc(20))
    const r = findAnchors(f, { radius: 1, minHeight: 1, minRim: 1 }, { count: 1, spacing: 5, rejectedSample: 3000 })
    expect(r.rejected.some((x) => x.reason === 'outside')).toBe(true)
  })
  it('результат стабилен при масштабировании: относительное положение лучшего места то же', () => {
    const a = findAnchors(field(101, 1, disc(40)), { radius: 2, minHeight: 1, minRim: 2 }, { count: 1, spacing: 5 }).accepted[0]
    const b = findAnchors(field(101, 2, disc(80)), { radius: 2, minHeight: 1, minRim: 2 }, { count: 1, spacing: 5 }).accepted[0]
    const ra = mmToRel(a.x, a.y, 100, 100), rb = mmToRel(b.x, b.y, 200, 200)
    expect(ra.x).toBeCloseTo(rb.x, 1); expect(ra.y).toBeCloseTo(rb.y, 1)
  })
  it('рельеф с возвышением: лучшее место там, где выше минимальная высота по пятну', () => {
    const f = field(101, 1, (x, y) => (Math.hypot(x, y) <= 40 ? 1 + Math.min(3, (40 - Math.hypot(x, y)) / 5) : 0))
    const best = findAnchors(f, { radius: 2, minHeight: 1, minRim: 1 }, { count: 1, spacing: 5 }).accepted[0]
    expect(Math.hypot(best.x, best.y)).toBeLessThan(12) // плато в центре
  })
  it('нет безопасного места: accepted пуст', () => {
    expect(findAnchors(field(41, 1, disc(8)), { radius: 6, minHeight: 1, minRim: 2 }, { count: 1, spacing: 3 }).accepted).toHaveLength(0)
  })
  it('предупреждение о грубой сетке: пятно уже двух шагов', () => {
    expect(findAnchors(field(41, 2, disc(30)), { radius: 1.5, minHeight: 1, minRim: 0 }, { count: 1, spacing: 3 }).coarse).toBe(true)
    expect(findAnchors(field(41, 0.5, disc(10)), { radius: 1.5, minHeight: 1, minRim: 0 }, { count: 1, spacing: 3 }).coarse).toBe(false)
  })
  it('относительные координаты и фильтр минимума', () => {
    expect(relToMm(0.5, 0.5, 70, 40)).toEqual({ x: 0, y: 0 })
    expect(relToMm(0, 1, 70, 40)).toEqual({ x: -35, y: 20 })
    const back = mmToRel(-35, 20, 70, 40)
    expect(back.x).toBeCloseTo(0, 9); expect(back.y).toBeCloseTo(1, 9)
    const f = field(21, 1, (x, y) => (Math.abs(x) <= 8 && Math.abs(y) <= 8 ? (x > 4 ? 0.5 : 2) : 0))
    expect(heightOver(f, 0, 0, 3)).toBe(2); expect(heightOver(f, 4, 0, 2)).toBe(0.5)
    expect(minHeightField(f, 0)[10 * 21 + 10]).toBe(2)
    expect(nodeMm(f, 10, 10)).toEqual([0, 0])
  })
})

describe('внешний фон и выход канала (1.2)', () => {
  // кольцо: внешний радиус 20, полость радиусом 6 в центре (замкнутая, открытая дырка)
  const ring = field(81, 1, (x, y) => (Math.hypot(x, y) <= 20 && Math.hypot(x, y) > 6 ? 2 : 0))

  it('внутренняя полость — не внешний фон, внешний фон связан с краем', () => {
    const ext = exteriorOf(ring.solid, ring.nx, ring.ny)
    expect(ext[0]).toBe(1)
    expect(ext[40 * 81 + 40]).toBe(0) // центр полости
    expect(ring.exterior[40 * 81 + 40]).toBe(0)
  })
  it('выход канала в открытый воздух проходит', () => {
    expect(channelBreach(ring, { x: -10, y: 0 }, { x: -19, y: 0 }, 1.5)).toEqual({ ok: true })
  })
  it('выход в замкнутую полость не считается выходом наружу', () => {
    expect(channelBreach(ring, { x: 12, y: 0 }, { x: 7, y: 0 }, 1.5)).toEqual({ ok: false, reason: 'cavity' })
  })
  it('выход внутрь материала не проходит', () => {
    expect(channelBreach(ring, { x: -10, y: 0 }, { x: -14, y: 0 }, 1.5)).toEqual({ ok: false, reason: 'inside' })
  })
  it('exitRay находит выход на край по направлению', () => {
    const p = exitRay(ring, { x: -10, y: 0 }, { x: -1, y: 0 })!
    expect(p.x).toBeLessThan(-19); expect(p.x).toBeGreaterThanOrEqual(-20.5)
    expect(exitRay(ring, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull() // центр — полость
  })
  it('грубая сетка у узкой выемки: предупреждение «coarse» в проверках посадки', () => {
    const coarse = field(41, 2, disc(35))
    const issues = fitChecks({ field: coarse, mount: { style: 'hole', x: 0, y: 0, diameter: 3 }, pins: [], pinRadius: 0.9, pinDepth: 1, minWall: 1 })
    expect(issues.some((i) => i.kind === 'coarse')).toBe(true)
  })
})

describe('проверки посадки (1.3)', () => {
  const f = field(121, 1, disc(40))
  const base = { field: f, pins: [] as { x: number; y: number }[], pinRadius: 0.9, pinDepth: 1, minWall: 1.2 }
  const none = { style: 'none' as const, x: 0, y: 0, diameter: 4 }

  it('без крепления и без штифтов нарушений нет', () => {
    expect(fitChecks({ ...base, mount: { style: 'none', x: 0, y: 0, diameter: 4 } })).toEqual([])
  })
  it('отверстие по центру: всё в порядке', () => {
    expect(fitChecks({ ...base, mount: { style: 'hole', x: 0, y: 0, diameter: 4 } })).toEqual([])
  })
  it('тонкая стенка: отверстие у края — thinWall с фактическим и требуемым значением', () => {
    const issues = fitChecks({ ...base, mount: { style: 'hole', x: 36.5, y: 0, diameter: 4 } })
    const w = issues.find((i) => i.kind === 'thinWall')!
    expect(w.feature).toBe('hole')
    expect(w.actual).toBeCloseTo(40 - 36.5 - 2, 0)
    expect(w.required).toBe(1.2)
  })
  it('вне подложки: outside', () => {
    expect(fitChecks({ ...base, mount: { style: 'hole', x: 55, y: 0, diameter: 4 } })[0]).toMatchObject({ feature: 'hole', kind: 'outside' })
  })
  it('толщина под пятном меньше стенки: thinFloor; для канала нужно ≥ радиус + стенка', () => {
    const thin = field(121, 1, (x, y) => (Math.hypot(x, y) <= 40 ? 1 : 0))
    const i = fitChecks({ ...base, field: thin, mount: { style: 'hole', x: 0, y: 0, diameter: 4 } })
    expect(i.some((x) => x.kind === 'thinFloor')).toBe(true)
    const ch = fitChecks({ ...base, mount: { style: 'channel', x: 0, y: 0, diameter: 4, exit: { x: 39, y: 0 } } })
    expect(ch.some((x) => x.kind === 'thinFloor' && Math.abs(x.required - 3.2) < 1e-9)).toBe(true) // 2 мм высоты < 2 + 1,2
  })
  it('канал не выходит наружу: noBreach; выход в воздух проходит', () => {
    const tall = field(121, 1, disc(40, 6))
    const bad = fitChecks({ ...base, field: tall, mount: { style: 'channel', x: -20, y: 0, diameter: 3, exit: { x: -30, y: 0 } } })
    expect(bad.some((x) => x.kind === 'noBreach')).toBe(true)
    const good = fitChecks({ ...base, field: tall, mount: { style: 'channel', x: -20, y: 0, diameter: 3, exit: { x: -39.5, y: 0 } } })
    expect(good.some((x) => x.kind === 'noBreach' || x.kind === 'cavityBreach')).toBe(false)
  })
  it('штифт слишком большой: радиус пятна выходит за край или толщины не хватает', () => {
    const edge = fitChecks({ ...base, mount: none, pins: [{ x: 39, y: 0 }], pinRadius: 0.9 })
    expect(edge[0]).toMatchObject({ feature: 'pin1', kind: 'pinTooBig' })
    const low = field(121, 1, (x, y) => (Math.hypot(x, y) <= 40 ? 1.5 : 0))
    expect(fitChecks({ ...base, mount: none, field: low, pins: [{ x: 0, y: 0 }], pinDepth: 1 })[0]).toMatchObject({ feature: 'pin1', kind: 'pinTooBig' }) // 1,5 < 1 + 1,2
    expect(fitChecks({ ...base, mount: none, pinDepth: 0.6, pins: [{ x: 0, y: 0 }, { x: 10, y: 0 }] })).toEqual([]) // 0,6 + 1,2 ≤ 2
  })
})
