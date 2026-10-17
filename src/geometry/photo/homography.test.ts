import { describe, expect, it } from 'vitest'
import { applyH, checkQuad, homography, invertH, rectify, type Pt } from './homography'
import { paperSize, rectifiedScale, PAPER_PRESETS } from './paper'
import { discObject, grayOfRgb, lObject, rectObject, syntheticColorPhoto, syntheticPhoto, tiltedQuad } from './synthetic'

const A4 = paperSize('a4', 'landscape')

describe('бумага (1.1)', () => {
  it('форматы и ориентация: A4 альбомный 297 × 210, Letter книжный 215.9 × 279.4, свой размер ограничен 50…1000', () => {
    expect(paperSize('a4', 'landscape')).toEqual({ width: 297, height: 210 })
    expect(paperSize('a4', 'portrait')).toEqual({ width: 210, height: 297 })
    expect(paperSize('letter', 'landscape')).toEqual({ width: 279.4, height: 215.9 })
    expect(paperSize('letter', 'portrait')).toEqual({ width: 215.9, height: 279.4 })
    expect(PAPER_PRESETS.letter).toEqual({ short: 215.9, long: 279.4 })
    expect(paperSize('custom', 'portrait', { width: 100, length: 400 })).toEqual({ width: 100, height: 400 })
    expect(paperSize('custom', 'landscape', { width: 100, length: 400 })).toEqual({ width: 400, height: 100 })
    expect(paperSize('custom', 'portrait', { width: 5, length: 5000 })).toEqual({ width: 50, height: 1000 })
    expect(paperSize('custom', 'portrait', { width: NaN, length: 300 }).width).toBe(50)
  })
  it('масштаб растра: 4 пикселя на мм, длинная сторона не больше 2000 пикселей', () => {
    expect(rectifiedScale(A4)).toBe(4)
    expect(rectifiedScale({ width: 1000, height: 500 })).toBe(2)
    expect(rectifiedScale({ width: 500, height: 500 })).toBe(4)
  })
})

describe('гомография (1.1)', () => {
  const quad: Pt[] = [[120, 80], [900, 140], [980, 700], [60, 640]]
  const rect: Pt[] = [[0, 0], [297, 0], [297, 210], [0, 210]]

  it('четыре угла листа переходят ровно в углы четырёхугольника, обратное преобразование возвращает их', () => {
    const h = homography(rect, quad)!
    rect.forEach((p, i) => { const q = applyH(h, p); expect(q[0]).toBeCloseTo(quad[i][0], 6); expect(q[1]).toBeCloseTo(quad[i][1], 6) })
    const inv = invertH(h)!
    quad.forEach((p, i) => { const q = applyH(inv, p); expect(q[0]).toBeCloseTo(rect[i][0], 5); expect(q[1]).toBeCloseTo(rect[i][1], 5) })
  })
  it('вырожденный набор точек (три на одной прямой) даёт null', () => {
    expect(homography(rect, [[0, 0], [10, 0], [20, 0], [30, 0]])).toBeNull()
    expect(homography(rect, [[0, 0]])).toBeNull()
  })
  it('проверка четырёхугольника: ок по часовой, зеркальный порядок, «бабочка», слишком мелкий', () => {
    expect(checkQuad(quad)).toBe('ok')
    expect(checkQuad([quad[0], quad[3], quad[2], quad[1]])).toBe('mirrored')
    expect(checkQuad([quad[0], quad[2], quad[1], quad[3]])).toBe('notConvex')
    expect(checkQuad([[0, 0], [3, 0], [3, 3], [0, 3]])).toBe('tooSmall')
    expect(checkQuad([quad[0], quad[1], quad[2]])).toBe('notConvex')
  })
})

describe('выпрямление снимка (1.1)', () => {
  const W = 1600, H = 1200
  const objects = [rectObject(40, 30, 40, 20), discObject(200, 150, 15), lObject(120, 90, 40, 12)]
  const photo = () => syntheticPhoto({ paper: A4, quad: tiltedQuad(W, H), width: W, height: H, objects })
  const bbox = (img: { width: number; height: number; gray: Uint8Array }, x0: number, y0: number, x1: number, y1: number) => {
    let a = Infinity, b = Infinity, c = -1, d = -1
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (img.gray[y * img.width + x] < 120) { a = Math.min(a, x); c = Math.max(c, x); b = Math.min(b, y); d = Math.max(d, y) }
    return { x0: a, y0: b, x1: c, y1: d }
  }

  it('размер результата: A4 альбомный 1188 × 840 пикселей; большой лист уменьшается до 2000 по длинной стороне', () => {
    const r = rectify(photo(), tiltedQuad(W, H), A4)!
    expect([r.image.width, r.image.height, r.scale]).toEqual([1188, 840, 4])
    const big = { width: 1000, height: 500 }
    const q = tiltedQuad(W, H)
    const r2 = rectify(syntheticPhoto({ paper: big, quad: q, width: W, height: H }), q, big)!
    expect([r2.image.width, r2.image.height, r2.scale]).toEqual([2000, 1000, 2])
  })

  it('перспектива снята: прямоугольник 40 × 20 мм получается прямоугольником 160 × 80 пикселей в нужном месте (±2 пикселя)', () => {
    const r = rectify(photo(), tiltedQuad(W, H), A4)!
    const b = bbox(r.image, 100, 80, 400, 250) // область вокруг (40..80, 30..50) мм
    expect(Math.abs(b.x0 - 160)).toBeLessThanOrEqual(2)
    expect(Math.abs(b.y0 - 120)).toBeLessThanOrEqual(2)
    expect(Math.abs(b.x1 - b.x0 + 1 - 160)).toBeLessThanOrEqual(3)
    expect(Math.abs(b.y1 - b.y0 + 1 - 80)).toBeLessThanOrEqual(3)
  })

  it('масштаб истинный: диск диаметром 30 мм занимает 120 пикселей', () => {
    const r = rectify(photo(), tiltedQuad(W, H), A4)!
    const b = bbox(r.image, 700, 500, 900, 700) // вокруг (200, 150) мм · 4
    expect(Math.abs(b.x1 - b.x0 + 1 - 120)).toBeLessThanOrEqual(3)
    expect(Math.abs(b.y1 - b.y0 + 1 - 120)).toBeLessThanOrEqual(3)
  })

  it('не зеркально: «Г» остаётся «Г» (перекладина слева, основание внизу)', () => {
    const r = rectify(photo(), tiltedQuad(W, H), A4)!
    const g = r.image.gray, w = r.image.width
    const dark = (mmX: number, mmY: number) => g[Math.round(mmY * 4) * w + Math.round(mmX * 4)] < 120
    expect(dark(125, 100)).toBe(true) // левая перекладина, верх
    expect(dark(155, 100)).toBe(false) // правый верх — пусто
    expect(dark(150, 125)).toBe(true) // основание внизу справа
  })

  it('недопустимые углы (зеркальный порядок, «бабочка») дают null, не картинку', () => {
    const q = tiltedQuad(W, H)
    expect(rectify(photo(), [q[0], q[3], q[2], q[1]], A4)).toBeNull()
    expect(rectify(photo(), [q[0], q[2], q[1], q[3]], A4)).toBeNull()
  })
})

describe('цветное выпрямление (25a 1.1)', () => {
  const W = 1600, H = 1200
  const red: [number, number, number] = [200, 30, 30]
  const objects = [{ ...rectObject(40, 30, 40, 20), rgb: red }, { ...discObject(200, 150, 15), rgb: [30, 160, 40] as [number, number, number] }]
  const color = () => syntheticColorPhoto({ paper: A4, quad: tiltedQuad(W, H), width: W, height: H, objects, paperRgb: [235, 235, 230] })

  it('цвет выпрямляется тем же отображением: размеры как у серого результата, красная планка остаётся красной на своём месте', () => {
    const c = color(), gray = grayOfRgb(c.rgb, W, H)
    const r = rectify(gray, tiltedQuad(W, H), A4, c.rgb)!
    expect(r.rgb).toBeDefined()
    expect(r.rgb!.length).toBe(r.image.width * r.image.height * 3)
    const px = (mmX: number, mmY: number) => { const k = (Math.round(mmY * 4) * r.image.width + Math.round(mmX * 4)) * 3; return [r.rgb![k], r.rgb![k + 1], r.rgb![k + 2]] }
    const bar = px(60, 40), disc = px(200, 150), paper = px(150, 20)
    expect(bar[0]).toBeGreaterThan(170); expect(bar[1]).toBeLessThan(60)
    expect(disc[1]).toBeGreaterThan(130); expect(disc[0]).toBeLessThan(60)
    expect(paper.every((v) => v > 215)).toBe(true)
  })

  it('яркость и цвет согласованы: серый растр выпрямленного цвета равен выпрямленному серому в пределах 2 уровней', () => {
    const c = color(), gray = grayOfRgb(c.rgb, W, H)
    const r = rectify(gray, tiltedQuad(W, H), A4, c.rgb)!
    const back = grayOfRgb(r.rgb!, r.image.width, r.image.height)
    let worst = 0
    for (let i = 0; i < back.gray.length; i += 7) worst = Math.max(worst, Math.abs(back.gray[i] - r.image.gray[i]))
    expect(worst).toBeLessThanOrEqual(2)
  })

  it('без цвета результат прежний (rgb не создаётся), цвет неподходящего размера игнорируется', () => {
    const gray = syntheticPhoto({ paper: A4, quad: tiltedQuad(W, H), width: W, height: H, objects: [rectObject(40, 30, 40, 20)] })
    expect(rectify(gray, tiltedQuad(W, H), A4)!.rgb).toBeUndefined()
    expect(rectify(gray, tiltedQuad(W, H), A4, new Uint8Array(10))!.rgb).toBeUndefined()
  })
})
