import { describe, expect, it } from 'vitest'
import { hasAlpha, midtoneShare, otsu, toMask, type GrayImage } from './threshold'
import { close, dilate, erode } from './morphology'
import { fillHoles, findHoles, labelComponents, removeSpecks } from './components'
import { edt, edtSquared } from './edt'
import { maskBounds, resampleMask } from './resample'

/** Маска из строк: '#' — материал, '.' — фон. */
const M = (rows: string[]) => ({ w: rows[0].length, h: rows.length, m: Uint8Array.from(rows.join('').split('').map((c) => (c === '#' ? 1 : 0))) })
const show = (m: Uint8Array, w: number) => Array.from({ length: m.length / w }, (_, y) => Array.from(m.slice(y * w, (y + 1) * w), (v) => (v ? '#' : '.')).join(''))

describe('порог и маска (1.1)', () => {
  const img = (gray: number[], alpha: number[] | null = null): GrayImage => ({ width: gray.length, height: 1, gray: Uint8Array.from(gray), alpha: alpha ? Uint8Array.from(alpha) : null })

  it('Оцу делит двухмодальную картинку между модами', () => {
    const g = [...Array(60).fill(30), ...Array(40).fill(220)]
    const t = otsu(Uint8Array.from(g))
    expect(t).toBeGreaterThanOrEqual(30); expect(t).toBeLessThan(220)
  })
  it('тёмное — материал; invert меняет роли', () => {
    const i = img([10, 10, 200, 200])
    expect(Array.from(toMask(i, 100, false))).toEqual([1, 1, 0, 0])
    expect(Array.from(toMask(i, 100, true))).toEqual([0, 0, 1, 1])
  })
  it('порог включает равную яркость', () => expect(Array.from(toMask(img([100, 101]), 100, false))).toEqual([1, 0]))
  it('есть прозрачность — маска по ней, а не по яркости', () => {
    const i = img([0, 0, 0, 0], [255, 255, 0, 0]) // все пиксели тёмные, но два прозрачные
    expect(hasAlpha(i)).toBe(true)
    expect(Array.from(toMask(i, 128, false))).toEqual([1, 1, 0, 0])
    expect(Array.from(toMask(i, 128, true))).toEqual([0, 0, 1, 1])
  })
  it('полностью непрозрачный альфа-канал не считается прозрачностью', () => {
    const i = img([0, 255], [255, 255])
    expect(hasAlpha(i)).toBe(false)
    expect(Array.from(toMask(i, 128, false))).toEqual([1, 0])
  })
  it('доля полутонов: рисунок почти 0, градиент велик', () => {
    expect(midtoneShare(Uint8Array.from([0, 255, 0, 255]))).toBe(0)
    expect(midtoneShare(Uint8Array.from([100, 120, 140, 160]))).toBe(1)
  })
})

describe('морфология (1.2)', () => {
  it('зазор в один пиксель закрывается, внешние края остаются', () => {
    const { w, h, m } = M(['...........', '...........', '..###.###..', '..###.###..', '..###.###..', '...........', '...........'])
    const c = close(m, w, h, 1)
    expect(show(c, w)[3]).toBe('..#######..')
    expect(show(c, w)[1]).toBe('...........') // внешние края не сдвинулись
    expect(show(c, w)[5]).toBe('...........')
  })
  it('зазор шире диска не закрывается', () => {
    const { w, h, m } = M(['.........', '.##...##.', '.##...##.', '.........'])
    expect(show(close(m, w, h, 1), w)[1]).toBe('.##...##.')
  })
  it('пятнышко из N пикселей удаляется при минимуме > N, остаётся при минимуме ≤ N', () => {
    const { w, h, m } = M(['#.........', '..........', '....###...', '....###...', '..........'])
    expect(show(removeSpecks(m, w, h, 2), w)[0]).toBe('..........') // одиночный пиксель
    expect(show(removeSpecks(m, w, h, 2), w)[2]).toBe('....###...')
    expect(show(removeSpecks(m, w, h, 7), w)[2]).toBe('..........')
    expect(show(removeSpecks(m, w, h, 6), w)[2]).toBe('....###...')
  })
  it('тонкий кончик переживает небольшое расширение и растёт на радиус', () => {
    const { w, h, m } = M(['..........', '#########.', '..........', '..........'])
    const d = dilate(m, w, h, 1)
    expect(show(d, w)[1]).toBe('##########')
    expect(show(d, w)[0]).toBe('#########.')
  })
  it('сужение убирает тонкие линии и оставляет ядро', () => {
    const { w, h, m } = M(['.........', '.#######.', '.#######.', '.#######.', '.#######.', '.#######.', '.........'])
    const e = erode(m, w, h, 1)
    expect(show(e, w)[3]).toBe('..#####..')
    expect(show(e, w)[1]).toBe('.........')
  })
  it('нулевой радиус ничего не меняет', () => {
    const { w, h, m } = M(['.#.', '###', '.#.'])
    expect(Array.from(dilate(m, w, h, 0))).toEqual(Array.from(m))
    expect(Array.from(close(m, w, h, 0))).toEqual(Array.from(m))
  })
})

describe('компоненты и дырки (1.3)', () => {
  const ring = M(['.........', '.#######.', '.#.....#.', '.#.....#.', '.#######.', '.........'])
  it('кольцо имеет одну дырку с номером 1', () => {
    const { holes } = findHoles(ring.m, ring.w, ring.h)
    expect(holes).toHaveLength(1)
    expect(holes[0]).toMatchObject({ id: 1, size: 10 })
    expect(holes[0].cx).toBeCloseTo(4, 6); expect(holes[0].cy).toBeCloseTo(2.5, 6)
  })
  it('нумерация по порядку первого пикселя: верхняя дырка раньше нижней', () => {
    const t = M(['.........', '.#######.', '.#.#.#.#.', '.#######.', '.#.#.#.#.', '.#######.', '.........'])
    const { holes } = findHoles(t.m, t.w, t.h)
    expect(holes.map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 6])
    expect(holes[0].cy).toBeLessThan(holes[5].cy)
  })
  it('фон снаружи не дырка; материал по краю картинки не создаёт дырок', () => {
    const o = M(['###', '#.#', '###'])
    expect(findHoles(o.m, o.w, o.h).holes).toHaveLength(1)
    const c = M(['#..', '...', '...'])
    expect(findHoles(c.m, c.w, c.h).holes).toHaveLength(0)
  })
  it('номера стабильны при настройке, не меняющей набор дырок (расширение на 1 px)', () => {
    const two = M(['...........', '.#########.', '.#...#...#.', '.#...#...#.', '.#########.', '...........'])
    const before = findHoles(two.m, two.w, two.h).holes
    const d = dilate(two.m, two.w, two.h, 0.5) // радиус < 1 не меняет маску
    const after = findHoles(d, two.w, two.h).holes
    expect(after.map((x) => [x.id, x.size])).toEqual(before.map((x) => [x.id, x.size]))
  })
  it('заливка: по умолчанию дырки заполняются, оставленная открытой остаётся фоном', () => {
    const two = M(['...........', '.#########.', '.#...#...#.', '.#...#...#.', '.#########.', '...........'])
    const filled = fillHoles(two.m, two.w, two.h)
    expect(show(filled.mask, two.w)[2]).toBe('.#########.')
    const keep2 = fillHoles(two.m, two.w, two.h, [2])
    expect(show(keep2.mask, two.w)[2]).toBe('.#####...#.') // дырка 1 залита, дырка 2 открыта
    expect(keep2.holes).toHaveLength(2)
    expect(findHoles(keep2.mask, two.w, two.h).holes).toHaveLength(1)
  })
  it('компоненты 8-связные: диагональные пиксели — одно пятно', () => {
    const d = M(['#..', '.#.', '..#'])
    expect(labelComponents(d.m, d.w, d.h).count).toBe(1)
  })
})

describe('EDT (1.4)', () => {
  const brute = (m: Uint8Array, w: number, h: number) => {
    const out = new Float64Array(m.length)
    const zeros: [number, number][] = []
    for (let i = 0; i < m.length; i++) if (!m[i]) zeros.push([i % w, Math.floor(i / w)])
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue
      let best = Infinity
      for (const [zx, zy] of zeros) best = Math.min(best, (zx - (i % w)) ** 2 + (zy - Math.floor(i / w)) ** 2)
      out[i] = best
    }
    return out
  }
  it('совпадает с полным перебором на случайных масках', () => {
    let seed = 12345
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
    for (let trial = 0; trial < 20; trial++) {
      const w = 3 + Math.floor(rnd() * 14), h = 3 + Math.floor(rnd() * 14)
      const m = new Uint8Array(w * h)
      for (let i = 0; i < m.length; i++) m[i] = rnd() < 0.7 ? 1 : 0
      m[0] = 0 // хотя бы один ноль
      const a = edtSquared(m, w, h), b = brute(m, w, h)
      for (let i = 0; i < m.length; i++) expect(a[i]).toBeCloseTo(b[i], 6)
    }
  })
  it('расстояние от центра квадрата 5×5 до фона равно 3', () => {
    const s = M(['.......', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.', '.......'])
    expect(edt(s.m, s.w, s.h)[3 * 7 + 3]).toBeCloseTo(3, 6)
  })
})

describe('габарит и перевыборка', () => {
  it('maskBounds и пустая маска', () => {
    const s = M(['....', '.##.', '.#..', '....'])
    expect(maskBounds(s.m, s.w, s.h)).toEqual([1, 1, 2, 2])
    expect(maskBounds(new Uint8Array(9), 3, 3)).toBeNull()
  })
  it('перевыборка усреднением: 4×4 → 2×2 и растяжение 2×1 → 4×2', () => {
    const s = M(['##..', '##..', '..##', '..##'])
    expect(show(resampleMask(s.m, 4, 0, 0, 4, 4, 2, 2), 2)).toEqual(['#.', '.#'])
    const t = M(['#.', '#.'])
    expect(show(resampleMask(t.m, 2, 0, 0, 2, 2, 4, 2), 4)).toEqual(['##..', '##..'])
  })
})
