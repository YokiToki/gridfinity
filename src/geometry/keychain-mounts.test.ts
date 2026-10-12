import { describe, expect, it } from 'vitest'
import { buildKeychainSheet, defaultKeychain, defaultMount, defaultSplit, validateKeychain, type KeychainParams } from './keychain'
import { generate, registerImage } from './model'
import type { GrayImage } from './raster/threshold'
import { expectValidSolid } from './testing'

function shape(W: number, H: number, rx: number, ry: number): GrayImage {
  const gray = new Uint8Array(W * H).fill(255)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (x + 0.5 - W / 2) / rx, dy = (y + 0.5 - H / 2) / ry; if (dx * dx + dy * dy <= 1) gray[y * W + x] = 0 }
  return { width: W, height: H, gray, alpha: null }
}
/** Буква «Г»: несимметричный силуэт (для проверки, что нижняя половина — поворот, а не отражение листа). */
function lShape(): GrayImage {
  const W = 200, H = 200, gray = new Uint8Array(W * H).fill(255)
  for (let y = 20; y < 180; y++) for (let x = 20; x < 180; x++) if (x < 70 || y > 130) gray[y * W + x] = 0
  return { width: W, height: H, gray, alpha: null }
}
const reg = (img: GrayImage) => new Map([['img', img]])
const P = (over: Partial<KeychainParams> = {}): KeychainParams => ({
  ...defaultKeychain, imageId: 'img',
  silhouette: { ...defaultKeychain.silhouette, close: 0, speck: 0, grow: 0 },
  quality: { cell: 0.3, maxTriangles: 400_000 },
  ...over,
})
const disc = shape(200, 200, 80, 80)
const run = async (p: KeychainParams, img = disc) => buildKeychainSheet(p, reg(img))
const solids = async (p: KeychainParams, img = disc) => { const r = await run(p, img); return r }
const components = (m: { decompose(): { delete(): void }[] }) => { const d = m.decompose(); const n = d.length; d.forEach((x) => x.delete()); return n }
const bb = (m: { boundingBox(): { min: number[]; max: number[] } }) => m.boundingBox()
const mount = (over: Partial<KeychainParams['mount']>) => ({ ...defaultMount, ...over })
const split = (over: Partial<KeychainParams['split']>) => ({ ...defaultSplit, enabled: true, ...over })

describe('сквозное отверстие (2.1)', () => {
  it('объём убирается как π r² t, габарит не меняется, тело валидно, одно сквозное отверстие', async () => {
    const plain = (await solids(P())).parts[0].solid
    const holed = (await solids(P({ mount: mount({ style: 'hole', x: 0.5, y: 0.5, diameter: 4 }) }))).parts[0].solid
    expectValidSolid(holed)
    const t = 4 // центр диска: подложка 2 + плато 2
    expect(plain.volume() - holed.volume()).toBeCloseTo(Math.PI * 2 * 2 * t, 0)
    const a = bb(plain), b = bb(holed)
    expect(b.max[0] - b.min[0]).toBeCloseTo(a.max[0] - a.min[0], 3); expect(b.max[2]).toBeCloseTo(a.max[2], 3)
    expect(holed.genus()).toBe(1)
  })
  it('положение относительно габарита: отверстие сдвигается вместе с позицией', async () => {
    const r = await run(P({ mount: mount({ style: 'hole', x: 0.25, y: 0.5, diameter: 4 }) }))
    expect(r.info.mountInfo!.mount!.x).toBeCloseTo(-17.5, 1)
    expect(r.info.mountInfo!.mount!.y).toBeCloseTo(0, 1)
    expect(r.parts[0].solid.genus()).toBe(1)
  })
  it('нет крепления: нет и сведений о нём, деталь A1 как раньше', async () => {
    const r = await run(P())
    expect(r.parts.map((x) => x.label)).toEqual(['A1'])
    expect(r.info.mountInfo).toBeUndefined()
  })
  it('отверстие у края: предупреждение о тонкой стенке с фактическим значением', async () => {
    const r = await run(P({ mount: mount({ style: 'hole', x: 0.5, y: 0.97, diameter: 4 }) }))
    const w = r.info.mountInfo!.issues.find((i) => i.kind === 'thinWall' && i.feature === 'hole')!
    expect(w).toBeTruthy()
    expect(w.actual).toBeLessThan(w.required)
  })
  it('Suggest: лучшие места найдены, центр диска лучший, отклонённые идут с причиной', async () => {
    const r = await run(P({ mount: mount({ style: 'hole', x: 0.5, y: 0.97, diameter: 4 }) }))
    const c = r.info.mountInfo!.candidates
    expect(c.length).toBeGreaterThan(0)
    expect(Math.hypot(c[0].x, c[0].y)).toBeLessThan(12)
    expect(r.info.mountInfo!.rejected.length).toBeGreaterThan(0)
    expect(r.info.mountInfo!.rejected.every((x) => ['outside', 'rim', 'thin', 'spacing'].includes(x.reason))).toBe(true)
  })
  it('нет безопасного места: candidates пуст', async () => {
    const tiny = shape(120, 120, 40, 40)
    const r = await run(P({ size: { ...defaultKeychain.size, longest: 8 }, mount: mount({ style: 'hole', diameter: 6 }) }), tiny)
    expect(r.info.mountInfo!.candidates).toEqual([])
  })
})

describe('ушко (2.2)', () => {
  const eyelet = (over: Partial<KeychainParams['mount']> = {}) => mount({ style: 'eyelet', x: 0.5, y: 1.047, diameter: 4, outer: 9, ...over }) // центр на 3,3 мм выше края диска
  it('одно тело, габарит растёт к краю, отверстие сквозное, ушко перекрывает подложку', async () => {
    const plain = (await solids(P())).parts[0].solid
    const e = (await solids(P({ mount: eyelet() }))).parts[0].solid
    expectValidSolid(e)
    expect(components(e)).toBe(1)
    expect(bb(e).max[1]).toBeGreaterThan(bb(plain).max[1] + 3)
    expect(bb(e).max[1]).toBeCloseTo(35 + 3.3 + 4.5, 0)
    expect(e.genus()).toBe(1)
    expect(e.volume()).toBeGreaterThan(plain.volume())
  })
  it('ушко на подложке толщиной подложки: высота ушка = толщина подложки', async () => {
    const e = (await solids(P({ mount: eyelet() }))).parts[0].solid
    expect(bb(e).max[2]).toBeCloseTo(4, 3) // верхняя точка рельефа не выше, ушко ниже
    const slice = e.slice(1.9).area(), above = e.slice(2.1).area()
    expect(slice).toBeGreaterThan(above) // на уровне подложки ушко есть, над ней — нет
  })
  it('ушко слишком далеко от подложки — предупреждение, не молчаливая перестановка', async () => {
    const r = await run(P({ mount: eyelet({ y: 1.4 }) }))
    expect(r.info.mountInfo!.issues.some((i) => i.feature === 'eyelet' && i.kind === 'outside')).toBe(true)
  })
  it('Suggest ушка: у края, верхнее первым', async () => {
    const r = await run(P({ mount: eyelet() }))
    const c = r.info.mountInfo!.candidates
    expect(c.length).toBeGreaterThan(0)
    expect(c[0].y).toBeGreaterThan(30)
  })
  it('валидация: стенка ушка, нужна подложка, канал только с разделением', () => {
    expect(validateKeychain(P({ mount: eyelet({ outer: 5 }) })).errors.map((e) => e.key)).toContain('keychain.error.eyeletWall')
    expect(validateKeychain(P({ mount: eyelet(), base: { ...defaultKeychain.base, thickness: 0 } })).errors.map((e) => e.key)).toContain('keychain.error.eyeletNoPlate')
    expect(validateKeychain(P({ mount: mount({ style: 'channel' }) })).errors.map((e) => e.key)).toContain('keychain.error.channelNeedsSplit')
    expect(validateKeychain(P({ mount: mount({ style: 'channel' }), split: split({}) })).errors).toEqual([])
    expect(validateKeychain(P({ split: split({ pins: 7 }) })).errors.map((e) => e.key)).toContain('keychain.error.pins')
    expect(validateKeychain(P({ split: split({ clearance: 1.5 }) })).errors.map((e) => e.key)).toContain('keychain.error.clearance')
  })
})

describe('две половины (2.3)', () => {
  it('две валидные детали, сумма объёмов = объём симметричной модели (2 × односторонняя) в пределах 0,5 %, спинки на z = 0', async () => {
    const single = (await solids(P())).parts[0].solid.volume()
    const r = await solids(P({ split: split({ pins: 0 }) }))
    expect(r.parts.map((x) => x.label)).toEqual(['top', 'bottom'])
    for (const q of r.parts) { expectValidSolid(q.solid); expect(bb(q.solid).min[2]).toBeCloseTo(0, 6) }
    const sum = r.parts[0].solid.volume() + r.parts[1].solid.volume()
    expect(Math.abs(sum - 2 * single) / (2 * single)).toBeLessThan(0.005)
    expect(r.parts[0].solid.volume()).toBeCloseTo(r.parts[1].solid.volume(), 3)
  })
  it('режим выключен — односторонняя модель без изменений', async () => {
    const a = (await solids(P())).parts[0].solid.volume()
    const b = (await solids(P({ split: { ...defaultSplit, enabled: false } }))).parts[0].solid.volume()
    expect(b).toBe(a)
  })
  it('нижняя половина — поворот, не отражение листа: у несимметричной буквы центр масс сдвинут зеркально, объём положителен', async () => {
    const r = await run(P({ split: split({ pins: 0 }) }), lShape())
    const [t, b] = r.parts
    // центр масс по Y относительно центра габарита: у нижней половины знак противоположный
    const cm = (s: typeof t.solid) => { const box = s.boundingBox(); const area = s.slice(0.5); void area; return (box.min[1] + box.max[1]) / 2 }
    void cm
    const centroidY = (m: typeof t.solid) => {
      const mesh = m.getMesh(); let sy = 0, w = 0
      for (let i = 0; i < mesh.triVerts.length; i += 3) {
        const a = mesh.triVerts[i] * mesh.numProp, c = mesh.triVerts[i + 1] * mesh.numProp, d = mesh.triVerts[i + 2] * mesh.numProp
        const ar = Math.abs((mesh.vertProperties[c] - mesh.vertProperties[a]) * (mesh.vertProperties[d + 1] - mesh.vertProperties[a + 1]) - (mesh.vertProperties[d] - mesh.vertProperties[a]) * (mesh.vertProperties[c + 1] - mesh.vertProperties[a + 1])) / 2
        sy += ((mesh.vertProperties[a + 1] + mesh.vertProperties[c + 1] + mesh.vertProperties[d + 1]) / 3) * ar; w += ar
      }
      return sy / w
    }
    const ct = t.solid.boundingBox(), cb = b.solid.boundingBox()
    const offT = centroidY(t.solid) - (ct.min[1] + ct.max[1]) / 2, offB = centroidY(b.solid) - (cb.min[1] + cb.max[1]) / 2
    expect(Math.abs(offT)).toBeGreaterThan(1)
    expect(offB).toBeCloseTo(-offT, 0)
    expect(b.solid.volume()).toBeGreaterThan(0)
  })
})

describe('штифты (2.4)', () => {
  const pinned = (over: Partial<KeychainParams['split']> = {}) => P({ split: split({ pins: 3, pinRadius: 0.9, clearance: 0.1, pinDepth: 1, ...over }) })

  it('3 штифта: три отверстия в каждой половине на совпадающих местах, вокруг каждого стенка не меньше минимальной', async () => {
    const plain = await solids(P({ split: split({ pins: 0 }) }))
    const r = await solids(pinned())
    expect(r.parts.map((x) => x.label)).toEqual(['top', 'bottom', 'pin1', 'pin2', 'pin3'])
    const mi = r.info.mountInfo!
    expect(mi.pins).toHaveLength(3)
    for (const q of mi.pins) { expect(q.used).toBe(true); expect(35 - Math.hypot(q.x, q.y) - 0.9).toBeGreaterThanOrEqual(1.2 - 0.4) } // стенка от края не меньше минимума (с допуском шага сетки)
    const hole = 3 * Math.PI * 0.9 ** 2
    for (const idx of [0, 1]) {
      const d = plain.parts[idx].solid.slice(0.5).area() - r.parts[idx].solid.slice(0.5).area()
      expect(d).toBeCloseTo(hole, 0)
    }
    expect(r.parts[0].solid.slice(0.5).area()).toBeCloseTo(r.parts[1].solid.slice(0.5).area(), 3) // одинаковые отверстия в обеих половинах
  })
  it('радиус свободного штифта = радиус отверстия − зазор, длина не больше суммарной глубины', async () => {
    const r = await solids(pinned())
    const b = bb(r.parts[2].solid)
    expect(b.max[0] - b.min[0]).toBeCloseTo(1.6, 1)
    const len = b.max[2] - b.min[2]
    expect(len).toBeLessThanOrEqual(2 * 1 + 1e-9)
    expect(len).toBeCloseTo(1.6, 3)
    expect(b.min[2]).toBeCloseTo(0, 6)
  })
  it('вручную поставленный штифт, ломающий поверхность, отвергается: предупреждение, в геометрии его нет', async () => {
    const r = await solids(pinned({ pins: 2, pinPositions: [{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.995 }] }))
    const mi = r.info.mountInfo!
    expect(mi.pins.map((q) => q.used)).toEqual([true, false])
    expect(mi.issues.some((i) => i.feature === 'pin2' && i.kind === 'pinTooBig')).toBe(true)
    expect(r.parts.map((x) => x.label)).toEqual(['top', 'bottom', 'pin1']) // свободный штифт только для принятого
  })
  it('положения штифтов вручную используются (положение относительное)', async () => {
    const r = await solids(pinned({ pins: 1, pinPositions: [{ x: 0.3, y: 0.5 }] }))
    expect(r.info.mountInfo!.pins[0].auto).toBe(false)
    expect(r.info.mountInfo!.pins[0].x).toBeCloseTo(-14, 1)
  })
  it('на узкой детали мест для всех штифтов может не хватить: недостающие — предупреждения', async () => {
    const tiny = shape(120, 120, 40, 40)
    const r = await run(P({ size: { ...defaultKeychain.size, longest: 10 }, split: split({ pins: 3, pinDepth: 1.6 }) }), tiny)
    expect(r.info.mountInfo!.issues.filter((i) => i.kind === 'pinTooBig').length).toBeGreaterThan(0)
  })
})

describe('канал (2.5)', () => {
  const chan = (over: Partial<KeychainParams['mount']> = {}) => P({
    split: split({ pins: 0 }),
    mount: mount({ style: 'channel', diameter: 3, x: 0.5, y: 0.8, exitX: 0.5, exitY: 1.0, minWall: 1, ...over }),
  })

  it('канал в плоскости разъёма: в обеих половинах выемка, при сложенных половинах открыт наружу', async () => {
    const plain = await solids(P({ split: split({ pins: 0 }) }))
    const r = await solids(chan())
    expect(r.info.mountInfo!.issues.filter((i) => i.kind === 'noBreach' || i.kind === 'cavityBreach')).toEqual([])
    for (const idx of [0, 1]) {
      const cutNear = plain.parts[idx].solid.slice(0.01).area() - r.parts[idx].solid.slice(0.01).area()
      const cutAbove = plain.parts[idx].solid.slice(1.0).area() - r.parts[idx].solid.slice(1.0).area() // r = 1,5: на высоте 1 мм канал уже, чем у плоскости разъёма
      expect(cutNear).toBeGreaterThan(3 * 12) // полоса шириной ≈ диаметр от точки A до края
      expect(cutAbove).toBeGreaterThan(0)
      expect(cutAbove).toBeLessThan(cutNear)
      expect(r.parts[idx].solid.slice(2).area()).toBeCloseTo(plain.parts[idx].solid.slice(2).area(), 3) // выше радиуса канала материал цел
    }
    expect(components(r.parts[0].solid)).toBe(1)
  })
  it('канал выходит за контур: проба за выходом — внешний фон, а не материал', async () => {
    const r = await run(chan())
    const m = r.info.mountInfo!.mount!
    expect(m.exit!.y).toBeGreaterThan(m.y)
  })
  it('выход внутри материала: предупреждение «канал не открывается наружу»', async () => {
    const r = await run(chan({ exitY: 0.9 }))
    expect(r.info.mountInfo!.issues.some((i) => i.kind === 'noBreach')).toBe(true)
  })
  it('канал без разделения не строится: валидация отклоняет, геометрия не нужна', () => {
    expect(validateKeychain({ ...chan(), split: { ...defaultSplit, enabled: false } }).ok).toBe(false)
  })
})

describe('лист печати (2.6)', () => {
  const overlap = (a: { min: number[]; max: number[] }, b: { min: number[]; max: number[] }) => a.min[0] < b.max[0] - 1e-9 && b.min[0] < a.max[0] - 1e-9 && a.min[1] < b.max[1] - 1e-9 && b.min[1] < a.max[1] - 1e-9

  it('половины и штифты не пересекаются на листе, нижняя справа от верхней через зазор, штифты ниже', async () => {
    const r = await solids(P({ split: split({ pins: 3, gap: 10 }) }))
    const boxes = r.parts.map((q) => bb(q.solid))
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j])).toBe(false)
    expect(boxes[1].min[0] - boxes[0].max[0]).toBeCloseTo(10, 3)
    for (const b of boxes.slice(2)) expect(b.max[1]).toBeLessThan(boxes[0].min[1])
    const sheet = r.info.mountInfo!.sheet!
    expect(sheet.w).toBeGreaterThanOrEqual(boxes[0].max[0] - boxes[0].min[0] + 10 - 1e-6)
    expect(sheet.h).toBeGreaterThan(boxes[0].max[1] - boxes[0].min[1])
  })
  it('generate: части top, bottom, pinN с положительными объёмами и размерами листа в сведениях', async () => {
    registerImage('sheet', disc)
    const r = await generate('keychain', P({ imageId: 'sheet', split: split({ pins: 2 }) }))
    expect(r.parts.map((x) => x.label)).toEqual(['top', 'bottom', 'pin1', 'pin2'])
    for (const q of r.parts) expect(q.mesh.volume).toBeGreaterThan(0) // повороты, не отражения
    expect(r.keychain!.mountInfo!.sheet!.w).toBeGreaterThan(70)
  })
  it('со сквозным отверстием и ушком в режиме половин обе половины получают отверстие', async () => {
    const r = await solids(P({ split: split({ pins: 0 }), mount: mount({ style: 'eyelet', x: 0.5, y: 1.047, diameter: 4, outer: 9 }) }))
    for (const q of r.parts) expect(q.solid.genus()).toBe(1)
  })
})
