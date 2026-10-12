import { describe, expect, it } from 'vitest'
import { buildGrid, buildKeychain, buildKeychainSheet, buildSilhouette, defaultKeychain, defaultMount, defaultSplit, plateSpec, sizeMm, type KeychainParams } from './keychain'
import { maskBounds } from './raster/resample'
import type { GrayImage } from './raster/threshold'
import { defaultText, textSampler, type TextParams, type TextRaster } from './text'
import { expectValidSolid } from './testing'

/** Тёмный диск радиуса 100 px на белом поле. */
const disc = (() => {
  const W = 260, H = 260, gray = new Uint8Array(W * H).fill(255)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + 0.5 - 130) ** 2 + (y + 0.5 - 130) ** 2 <= 100 ** 2) gray[y * W + x] = 0
  return { width: W, height: H, gray, alpha: null } as GrayImage
})()
/** Сплошной прямоугольник 8 × 4 мм (96 × 48 px при 12 px/мм): простейшая «надпись». */
const block: TextRaster = { mask: new Uint8Array(96 * 48).fill(255), width: 96, height: 48, pxPerMm: 12 }
const texts = new Map([['blk', block]])
const reg = new Map([['img', disc]])

const sil = { ...defaultKeychain.silhouette, close: 0, speck: 0, grow: 0 }
const T = (over: Partial<TextParams> = {}): TextParams => ({ ...defaultText, enabled: true, content: 'X', maskId: 'blk', mode: 'emboss', height: 0.6, depth: 0.5, x: 0.5, y: 0.5, ...over })
// диск 60 мм, подложка 2 мм по силуэту, плато 2 мм
const P = (text: Partial<TextParams> | null = null, over: Partial<KeychainParams> = {}): KeychainParams => ({
  ...defaultKeychain, imageId: 'img', silhouette: sil, size: { ...defaultKeychain.size, longest: 60 }, base: { ...defaultKeychain.base, thickness: 2 },
  relief: { ...defaultKeychain.relief, profile: 'flat', hmax: 2, heightFloor: 0.06 }, quality: { cell: 0.25, maxTriangles: 400_000 },
  text: text ? T(text) : { ...defaultText }, ...over,
})

function gridFor(p: KeychainParams, plateInGrid = false) {
  const s = buildSilhouette(disc, p.silhouette)
  const b = maskBounds(s.mask, disc.width, disc.height)!
  const { w: wMm, h: hMm } = sizeMm(p.size, b[2] - b[0] + 1, b[3] - b[1] + 1)
  const plate = plateSpec(p.base, wMm, hMm).spec
  const r = p.text.enabled && p.text.maskId ? texts.get(p.text.maskId) : undefined
  const text = r ? { cov: textSampler(r, p.text, wMm, hMm), mode: p.text.mode, height: p.text.height, depth: p.text.depth } : undefined
  return { g: buildGrid({ img: disc, mask: s.mask, bounds: b, wMm, hMm, cell: p.quality.cell, p, plate, plateInGrid, text }), wMm, hMm }
}
type G = ReturnType<typeof gridFor>
/** Узлы силуэта по мм от центра габарита: (x, y) → высота верха. */
const nodes = (f: G) => {
  const out: { x: number; y: number; t: number; k: number }[] = []
  for (let j = 0; j < f.g.ny; j++) for (let i = 0; i < f.g.nx; i++) {
    const k = j * f.g.nx + i
    if (f.g.solid[k]) out.push({ x: (i - f.g.i0) * f.g.dx - f.wMm / 2, y: f.hMm / 2 - (j - f.g.j0) * f.g.dy, t: f.g.top[k], k })
  }
  return out
}
const inBox = (n: { x: number; y: number }, cx: number, cy: number, hw: number, hh: number) => Math.abs(n.x - cx) < hw && Math.abs(n.y - cy) < hh

describe('надпись в рельефе (1.3)', () => {
  const plain = gridFor(P())
  it('рельеф: внутри коробки 8 × 4 мм вершина выше обычной ровно на height, снаружи без изменений', () => {
    const f = gridFor(P({ mode: 'emboss', height: 0.6 }))
    let inside = 0
    for (const n of nodes(f)) {
      const was = plain.g.top[n.k]
      if (inBox(n, 0, 0, 3.8, 1.8)) { expect(n.t).toBeCloseTo(was + 0.6, 5); inside++ }
      else if (!inBox(n, 0, 0, 4.3, 2.3)) expect(n.t).toBeCloseTo(was, 5)
    }
    expect(inside).toBeGreaterThan(200)
  })
  it('гравировка: ниже на depth, но не ниже подложки + минимальной высоты', () => {
    const f = gridFor(P({ mode: 'engrave', depth: 0.5 }))
    for (const n of nodes(f)) if (inBox(n, 0, 0, 3.8, 1.8)) expect(n.t).toBeCloseTo(plain.g.top[n.k] - 0.5, 5)
    const deep = gridFor(P({ mode: 'engrave', depth: 50 }))
    for (const n of nodes(deep)) if (inBox(n, 0, 0, 3.8, 1.8)) expect(n.t).toBeCloseTo(2 + 0.06, 5)
  })
  it('положение: сдвиг по x и y и поворот на 90° переносят коробку', () => {
    const f = gridFor(P({ x: 0.75, y: 0.5, rotation: 90 })) // центр (15, 0), коробка 4 × 8 мм
    const raised = (cx: number, cy: number, hw: number, hh: number) => nodes(f).filter((n) => inBox(n, cx, cy, hw, hh)).every((n) => n.t > plain.g.top[n.k] + 0.5)
    expect(raised(15, 0, 1.8, 3.8)).toBe(true)
    // исходное положение и неповёрнутая форма пусты
    expect(nodes(f).filter((n) => inBox(n, 0, 0, 3, 1)).every((n) => Math.abs(n.t - plain.g.top[n.k]) < 1e-6)).toBe(true)
    expect(nodes(f).filter((n) => inBox(n, 15 + 3, 0, 0.5, 0.5)).every((n) => Math.abs(n.t - plain.g.top[n.k]) < 1e-6)).toBe(true) // за короткой стороной
  })
  it('надпись выключена или без растра: рельеф не меняется', () => {
    const off = gridFor({ ...P(), text: { ...T(), enabled: false } })
    expect(Array.from(off.g.top)).toEqual(Array.from(plain.g.top))
    const noMask = gridFor({ ...P(), text: { ...T(), maskId: 'missing' } })
    expect(Array.from(noMask.g.top)).toEqual(Array.from(plain.g.top))
  })
  it('уровень области и надпись: буквы лежат на ровной площадке', () => {
    // надпись на диске без областей: проверяем лишь, что узлы с text.cov не падают и высота ≥ подложки
    const f = gridFor(P({ mode: 'emboss', height: 1 }))
    expect(Math.min(...nodes(f).map((n) => n.t))).toBeGreaterThanOrEqual(2)
  })
})

describe('сборка: подложка, обрезка, две половины, тела', () => {
  const box = (m: { boundingBox(): { min: number[]; max: number[] } }) => m.boundingBox()
  // буквы строятся по узлам сетки (шаг 0.25 мм), поэтому площадь коробки 8 × 4 мм выходит на ячейку шире со всех сторон
  const grown = (h: number) => (8 + 0.25) * (4 + 0.25) * h
  const near = (actual: number, expected: number, tol = 0.1) => expect(Math.abs(actual - expected) / expected, `${actual} ≈ ${expected}`).toBeLessThan(tol)
  it('без надписи и с выключенной надписью объёмы совпадают', async () => {
    const a = await buildKeychain(P(), reg, undefined, texts), b = await buildKeychain({ ...P(), text: { ...T(), enabled: false } }, reg, undefined, texts)
    expect(b.solid!.volume()).toBeCloseTo(a.solid!.volume(), 6)
    expect(a.info.text).toBeUndefined()
  })
  it('рельеф на диске: объём вырос на ≈ 8·4·0.6 мм³, высота модели + height, тело валидно', async () => {
    const a = await buildKeychain(P(), reg, undefined, texts), b = await buildKeychain(P({ mode: 'emboss', height: 0.6 }), reg, undefined, texts)
    near(b.solid!.volume() - a.solid!.volume(), grown(0.6))
    expect(box(b.solid!).max[2]).toBeCloseTo(box(a.solid!).max[2] + 0.6, 2)
    expectValidSolid(b.solid!)
    expect(b.info.text).toMatchObject({ clipped: false })
    expect(b.info.text!.w).toBeCloseTo(8, 6)
  })
  it('гравировка: объём уменьшился на ≈ 8·4·0.5 мм³, размеры прежние, тело валидно', async () => {
    const a = await buildKeychain(P(), reg, undefined, texts), b = await buildKeychain(P({ mode: 'engrave', depth: 0.5 }), reg, undefined, texts)
    near(a.solid!.volume() - b.solid!.volume(), grown(0.5))
    expect(box(b.solid!).max[2]).toBeCloseTo(box(a.solid!).max[2], 2)
    expectValidSolid(b.solid!)
  })
  it('гравировка глубже доступного: режет до минимальной высоты, подложка цела, тело валидно', async () => {
    const r = await buildKeychain(P({ mode: 'engrave', depth: 30 }), reg, undefined, texts)
    expectValidSolid(r.solid!)
    const under = r.solid!.slice(2.0 + 0.03).area(), over = r.solid!.slice(2.0 + 0.1).area()
    near(under - over, grown(1) / 1, 0.1) // буквы срезаны до base + 0.06: выше этого уровня под ними пусто, ниже материал цел
    expect(r.solid!.slice(1.0).area()).toBeGreaterThan(over)
  })
  const plateRect = { base: { ...defaultKeychain.base, thickness: 2, shape: 'rect' as const, auto: false, width: 90, height: 90 } }
  it('надпись на подложке вне силуэта: поднимает подложку, подложка строится в сетке', async () => {
    // центр надписи (0, 38) мм — выше диска радиуса 30, на подложке 90 × 90; подложка в сетке даёт кольцо у края диска,
    // поэтому сравниваем с такой же надписью нулевой высоты (та же сетка, без букв)
    const y = 0.5 + 38 / 60
    const flat = await buildKeychain(P({ x: 0.5, y, mode: 'emboss', height: 0 }, plateRect), reg, undefined, texts)
    const b = await buildKeychain(P({ x: 0.5, y, mode: 'emboss', height: 0.6 }, plateRect), reg, undefined, texts)
    expect(b.info.text).toMatchObject({ clipped: false })
    near(b.solid!.slice(2.3).area() - flat.solid!.slice(2.3).area(), 8 * 4, 0.15) // над подложкой появились только буквы (на середине склона площадь равна площади коробки)
    near(b.solid!.volume() - flat.solid!.volume(), 8 * 4 * 0.6, 0.12)
    expect(b.solid!.volume()).toBeGreaterThan(0)
    expectValidSolid(b.solid!)
  })
  it('гравировка в подложку: углубление не глубже подложки', async () => {
    const y = 0.5 + 38 / 60
    const r = await buildKeychain(P({ x: 0.5, y, mode: 'engrave', depth: 30 }, plateRect), reg, undefined, texts)
    expectValidSolid(r.solid!)
    const a = await buildKeychain(P(null, plateRect), reg, undefined, texts)
    expect(a.solid!.volume() - r.solid!.volume()).toBeGreaterThan(0)
    expect(a.solid!.volume() - r.solid!.volume()).toBeLessThan(8 * 4 * 2 + 1) // не больше толщины подложки
  })
  it('надпись выходит за подложку: предупреждение clipped, лишняя часть не строится, тело валидно', async () => {
    const y = 0.5 + 43 / 60 // центр на 43 мм: подложка кончается на 45 мм, коробка 4 мм высотой достаёт до 45 и дальше? сдвинем ещё
    const r = await buildKeychain(P({ x: 0.5, y: y + 0.05, mode: 'emboss', height: 0.6 }, plateRect), reg, undefined, texts)
    expect(r.info.text).toMatchObject({ clipped: true })
    expectValidSolid(r.solid!)
    const a = await buildKeychain(P(null, plateRect), reg, undefined, texts)
    expect(r.solid!.volume() - a.solid!.volume()).toBeLessThan(grown(0.6) - 1) // часть букв отброшена
  })
  it('без подложки текст вне силуэта не строится и помечен clipped', async () => {
    const r = await buildKeychain(P({ x: 0.5, y: 0.5 + 36 / 60 }, { base: { ...defaultKeychain.base, thickness: 0 } }), reg, undefined, texts)
    expect(r.info.text).toMatchObject({ clipped: true })
    expectValidSolid(r.solid!)
  })
  it('две половины: надпись только на верхней, нижняя без неё', async () => {
    const split = { split: { ...defaultSplit, enabled: true, pins: 2 } }
    const plainParts = await buildKeychainSheet(P(null, split), reg, undefined, texts)
    const withParts = await buildKeychainSheet(P({ mode: 'emboss', height: 0.6 }, split), reg, undefined, texts)
    const vols = (r: typeof plainParts) => r.parts.slice(0, 2).map((q) => q.solid.volume())
    const [pt, pb] = vols(plainParts), [wt, wb] = vols(withParts)
    expect(pt).toBeCloseTo(pb, 3) // без надписи половины зеркальны
    near(wt - pt, grown(0.6))
    expect(wb).toBeCloseTo(pb, 3) // нижняя половина без надписи
    for (const q of [...plainParts.parts, ...withParts.parts]) expectValidSolid(q.solid)
    ;[...plainParts.parts, ...withParts.parts].forEach((q) => q.solid.delete())
  })
  it('надпись вместе с отверстием крепления: валидное тело', async () => {
    const r = await buildKeychain(P({ x: 0.5, y: 0.35 }, { mount: { ...defaultMount, style: 'hole', x: 0.5, y: 0.85 } }), reg, undefined, texts)
    expectValidSolid(r.solid!)
    expect(r.info.mountInfo?.mount).not.toBeNull()
  })
})

describe('качество букв: точные контуры', () => {
  // растр 8 × 8 мм с кругом радиуса 2.5 мм (мягкий край 1.5 px): «буква О» без отверстия
  const R = 2.5, W = 96
  const ball: TextRaster = (() => {
    const mask = new Uint8Array(W * W)
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) mask[y * W + x] = Math.round(255 * Math.min(1, Math.max(0, (R * 12 - Math.hypot(x + 0.5 - W / 2, y + 0.5 - W / 2)) / 1.5 + 0.5)))
    return { mask, width: W, height: W, pxPerMm: 12 }
  })()
  const tx = new Map([['ball', ball], ['blk', block]])
  const coarse = (over: Partial<KeychainParams> = {}): KeychainParams => P({ maskId: 'ball' }, { quality: { cell: 0.5, maxTriangles: 400_000 }, ...over })

  it('круглая буква на сетке 0.5 мм: контур на окружности радиуса 2.5 с точностью 0.03 мм (не ступени сетки)', async () => {
    const r = await buildKeychain(coarse(), reg, undefined, tx)
    const plateau = 2 + 2
    const cs = r.solid!.slice(plateau + 0.3) // выше плато, ниже вершины букв (плато + 0.6)
    const pts = cs.toPolygons().flat()
    expect(pts.length).toBeGreaterThan(40)
    for (const [x, y] of pts) expect(Math.abs(Math.hypot(x, y) - R)).toBeLessThan(0.03)
    expect(cs.area() / (Math.PI * R * R)).toBeGreaterThan(0.99)
    expect(cs.area() / (Math.PI * R * R)).toBeLessThan(1.01)
  })
  it('высота букв ровно height над плато, объём = площадь × высота', async () => {
    const a = await buildKeychain(coarse({ text: { ...defaultText } }), reg, undefined, tx)
    const b = await buildKeychain(coarse(), reg, undefined, tx)
    expect((b.solid!.volume() - a.solid!.volume()) / (Math.PI * R * R * 0.6)).toBeGreaterThan(0.98)
    expect((b.solid!.volume() - a.solid!.volume()) / (Math.PI * R * R * 0.6)).toBeLessThan(1.02)
    expect(b.solid!.boundingBox().max[2]).toBeCloseTo(2 + 2 + 0.6, 6)
    expectValidSolid(b.solid!)
  })
  it('гравировка: вырез с тем же точным контуром, дно на depth ниже плато', async () => {
    const a = await buildKeychain(coarse({ text: { ...defaultText } }), reg, undefined, tx)
    const b = await buildKeychain(P({ maskId: 'ball', mode: 'engrave', depth: 0.5 }, { quality: { cell: 0.5, maxTriangles: 400_000 } }), reg, undefined, tx)
    const hole = b.solid!.slice(2 + 2 - 0.25)
    const full = a.solid!.slice(2 + 2 - 0.25)
    expect((full.area() - hole.area()) / (Math.PI * R * R)).toBeGreaterThan(0.99)
    expect((full.area() - hole.area()) / (Math.PI * R * R)).toBeLessThan(1.01)
    expect((a.solid!.volume() - b.solid!.volume()) / (Math.PI * R * R * 0.5)).toBeGreaterThan(0.98)
    expectValidSolid(b.solid!)
  })
  it('неровный рельеф (скос): запасной путь по сетке, тело валидно, высота букв больше поверхности', async () => {
    const slope = { relief: { ...defaultKeychain.relief, profile: 'bevel' as const, hmax: 2, edgeWidth: 40, heightFloor: 0.06 } }
    const a = await buildKeychain(coarse({ ...slope, text: { ...defaultText } }), reg, undefined, tx)
    const b = await buildKeychain(coarse(slope), reg, undefined, tx)
    expectValidSolid(b.solid!)
    expect(b.solid!.volume()).toBeGreaterThan(a.solid!.volume() + 5)
  })
  it('на подложке рядом с силуэтом: подложка остаётся гладкой (не переходит в сетку), буквы точные', async () => {
    const y = 0.5 + 36 / 60
    const plateRound = { base: { ...defaultKeychain.base, thickness: 2, shape: 'rounded' as const, auto: false, width: 90, height: 90, radius: 12 } }
    const r = await buildKeychain(coarse({ ...plateRound, text: { ...T({ maskId: 'ball', x: 0.5, y }) } }), reg, undefined, tx)
    // подложка — аналитический скруглённый прямоугольник 90 × 90, радиус 12, а не ступени сетки: площадь среза совпадает
    const exactArea = 90 * 90 - (4 - Math.PI) * 12 * 12
    expect(Math.abs(r.solid!.slice(1.0).area() / exactArea - 1)).toBeLessThan(0.01)
    const letters = r.solid!.slice(2.3).toPolygons().flat().filter(([, y2]) => y2 > 32)
    expect(letters.length).toBeGreaterThan(20)
    for (const [x, y2] of letters) expect(Math.abs(Math.hypot(x, y2 - 36) - R)).toBeLessThan(0.05)
    expectValidSolid(r.solid!)
  })
})
