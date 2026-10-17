import { describe, expect, it } from 'vitest'
import type { ColorImage } from '../../features/keychain/decodeImage'
import { checkQuad, type Pt } from './homography'
import { bestQuad, convexHull, detectPaper, orderClockwise } from './detect'
import { paperSize } from './paper'
import { discObject, rectObject, syntheticColorPhoto, tiltedQuad } from './synthetic'
import { loadFixture } from './fixtures/load'

const A4 = paperSize('a4', 'portrait')
const W = 800, H = 1000
const TABLE: [number, number, number] = [125, 92, 62]
const photo = (quad: Pt[], over: Partial<Parameters<typeof syntheticColorPhoto>[0]> = {}): ColorImage => {
  const p = syntheticColorPhoto({ paper: A4, quad, width: W, height: H, paperRgb: [236, 236, 231], backgroundRgb: TABLE, noise: 9, ...over })
  return { width: p.width, height: p.height, rgb: p.rgb }
}
const diag = Math.hypot(W, H)
const maxErr = (a: Pt[], b: Pt[]) => Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1])))
const rotateQuad = (q: Pt[], deg: number): Pt[] => {
  const a = (deg * Math.PI) / 180, cx = W / 2, cy = H / 2
  return q.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)] as Pt)
}
const portraitQuad: Pt[] = [[150, 110], [660, 90], [700, 880], [110, 900]]

describe('геометрия оболочки (25a 2.1)', () => {
  it('выпуклая оболочка квадрата с внутренними точками — четыре угла', () => {
    const pts: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 10], [5, 5], [3, 7], [10, 5]]
    expect(convexHull(pts)).toHaveLength(4)
  })
  it('лучшая четвёрка вершин выпуклого многоугольника — самая большая по площади', () => {
    const hex: Pt[] = [[0, 0], [10, -1], [20, 0], [20, 10], [10, 11], [0, 10]]
    const q = bestQuad(hex)
    expect(q).toHaveLength(4)
    // шестиугольник вытянут по x: выбранные углы должны брать «рога» (0,0), (20,0), (20,10), (0,10)
    const xs = q.map((p) => p[0]).sort((a, b) => a - b)
    expect(xs[0]).toBe(0); expect(xs[3]).toBe(20)
  })
  it('порядок углов по часовой стрелке с левого верхнего при любой перестановке', () => {
    const tl: Pt[] = [[100, 100], [700, 120], [680, 900], [90, 880]]
    for (const perm of [[0, 1, 2, 3], [2, 3, 0, 1], [3, 2, 1, 0], [1, 0, 3, 2]]) {
      const out = orderClockwise(perm.map((i) => tl[i]))
      expect(out).toEqual(tl)
      expect(checkQuad(out)).toBe('ok')
    }
  })
})

describe('поиск листа в кадре (25a 2.1)', () => {
  it('белый лист на коричневом столе в перспективе: углы в пределах 1 % диагонали, порядок по часовой с левого верхнего', () => {
    const d = detectPaper(photo(portraitQuad))!
    expect(d).not.toBeNull()
    expect(maxErr(d.corners, portraitQuad)).toBeLessThan(0.01 * diag)
    expect(checkQuad(d.corners)).toBe('ok')
    expect(d.confidence).toBeGreaterThan(0.9)
  })

  it('разные положения и повороты листа в кадре (±30°) находятся', () => {
    for (const deg of [-30, -12, 12, 30]) {
      const q = rotateQuad(tiltedQuad(W, H).map(([x, y]) => [x * 0.8 + 80, y * 0.85 + 40] as Pt), deg)
      if (q.some(([x, y]) => x < 5 || y < 5 || x > W - 5 || y > H - 5)) continue
      const d = detectPaper(photo(q))
      expect(d, `поворот ${deg}`).not.toBeNull()
      expect(maxErr(d!.corners, q), `поворот ${deg}`).toBeLessThan(0.012 * diag)
    }
  })

  it('предметы на листе (тёмные и цветные, около четверти площади) лист не прячут', () => {
    const objects = [{ ...rectObject(30, 50, 80, 120), gray: 30, rgb: [30, 30, 33] as [number, number, number] }, { ...discObject(150, 220, 40), gray: 120, rgb: [220, 160, 20] as [number, number, number] }, { ...rectObject(40, 200, 60, 50), gray: 90, rgb: [30, 120, 200] as [number, number, number] }]
    const d = detectPaper(photo(portraitQuad, { objects }))!
    expect(d).not.toBeNull()
    expect(maxErr(d.corners, portraitQuad)).toBeLessThan(0.012 * diag)
  })

  it('неравномерный свет на листе и стол с градиентом не мешают', () => {
    const d = detectPaper(photo(portraitQuad, { light: (x) => 1 - 0.3 * (x / A4.width) }))!
    expect(d).not.toBeNull()
    expect(maxErr(d.corners, portraitQuad)).toBeLessThan(0.012 * diag)
  })

  it('однотонный стол без листа и белый стол с белым листом — листа нет', () => {
    const empty = new Uint8Array(W * H * 3)
    for (let i = 0; i < W * H; i++) { empty[i * 3] = 125 + ((i * 7) % 9); empty[i * 3 + 1] = 92; empty[i * 3 + 2] = 62 }
    expect(detectPaper({ width: W, height: H, rgb: empty })).toBeNull()
    const white = new Uint8Array(W * H * 3).fill(238)
    expect(detectPaper({ width: W, height: H, rgb: white })).toBeNull()
  })

  it('слишком маленький лист (меньше 15 % кадра) не принимается', () => {
    const q: Pt[] = [[300, 400], [400, 405], [395, 520], [305, 515]]
    expect(detectPaper(photo(q))).toBeNull()
  })

  it('на фото владельца: углы листа в пределах 1.5 % диагонали от выбранных вручную, со вспышкой и без', () => {
    for (const name of ['flash', 'noflash'] as const) {
      const f = loadFixture(name)
      const d = detectPaper(f.color)!
      expect(d, name).not.toBeNull()
      expect(maxErr(d.corners, f.corners), name).toBeLessThan(0.015 * Math.hypot(f.color.width, f.color.height))
      expect(checkQuad(d.corners)).toBe('ok')
    }
  })
})
