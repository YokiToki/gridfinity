import { describe, expect, it } from 'vitest'
import type { Pt } from '../../../geometry/photo/homography'
import { distToSegment, dragCorner, GRAB_MIN_PX, inside, intersect, pickCorner, placeLoupe, RING_PX } from './cornerGrab'

const sheet: Pt[] = [[100, 100], [700, 100], [700, 900], [100, 900]]

describe('захват угла (25a 3.2)', () => {
  it('кольцо и зона захвата заданы в экранных пикселях', () => {
    expect(RING_PX).toBe(22)
    expect(GRAB_MIN_PX).toBe(56)
  })

  it('точка внутри листа и расстояние до отрезка', () => {
    expect(inside([400, 500], sheet)).toBe(true)
    expect(inside([50, 500], sheet)).toBe(false)
    expect(distToSegment([400, 50], [100, 100], [700, 100])).toBe(50)
    expect(distToSegment([0, 100], [100, 100], [700, 100])).toBe(100) // за концом отрезка — расстояние до конца
  })

  it('внутри листа рядом с углом берётся этот угол, в центре листа и далеко от углов — никакой', () => {
    expect(pickCorner([130, 130], sheet, 1)).toBe(0)
    expect(pickCorner([670, 140], sheet, 1)).toBe(1)
    expect(pickCorner([650, 860], sheet, 1)).toBe(2)
    expect(pickCorner([140, 870], sheet, 1)).toBe(3)
    expect(pickCorner([400, 500], sheet, 1)).toBeNull()
  })

  it('снаружи листа допустимо только вплотную: не дальше 24 экранных пикселей от стороны', () => {
    expect(pickCorner([90, 110], sheet, 1)).toBe(0) // 10 снаружи
    expect(pickCorner([60, 60], sheet, 1)).toBeNull() // 40 по диагонали от угла, дальше 24 от сторон
    expect(pickCorner([60, 60], sheet, 3)).toBe(0) // экранный пиксель крупнее — допуск в координатах снимка растёт
  })

  it('из двух близких углов берётся ближайший к нажатию', () => {
    const narrow: Pt[] = [[100, 100], [160, 100], [160, 900], [100, 900]] // верхние углы в 60 пикселях друг от друга
    expect(pickCorner([120, 110], narrow, 1)).toBe(0)
    expect(pickCorner([140, 110], narrow, 1)).toBe(1)
  })

  it('на крупном листе зона захвата шире минимума: 18 % короткой стороны (108 пикселей при стороне 600)', () => {
    expect(pickCorner([160, 160], sheet, 1)).toBe(0) // 85 пикселей от угла: больше минимума 56, меньше 108
    expect(pickCorner([200, 200], sheet, 1)).toBeNull() // 141 пиксель — дальше зоны
  })

  it('смещение: угол сдвигается на смещение указателя, а не встаёт под него', () => {
    const out = dragCorner(sheet, 0, [100, 100], [20, 30], 800, 1000)
    expect(out[0]).toEqual([120, 130])
    expect(out.slice(1)).toEqual(sheet.slice(1))
  })

  it('угол не выходит за снимок и не перепрыгивает через противоположный', () => {
    expect(dragCorner(sheet, 0, [100, 100], [-500, -500], 800, 1000)[0]).toEqual([0, 0])
    expect(dragCorner(sheet, 0, [100, 100], [650, 820], 800, 1000)).toBe(sheet) // к углу 3: бабочка — отвергнуто
  })

  it('если четырёхугольник уже недопустим, угол двигается свободно — его можно исправить', () => {
    const bow: Pt[] = [[700, 100], [100, 100], [700, 900], [100, 900]]
    const out = dragCorner(bow, 0, [700, 100], [-600, 0], 800, 1000)
    expect(out).not.toBe(bow)
    expect(out[0]).toEqual([100, 100])
  })

  it('пересечение прямоугольников', () => {
    expect(intersect({ l: 0, t: 0, r: 100, b: 100 }, { l: 50, t: -20, r: 300, b: 60 })).toEqual({ l: 50, t: 0, r: 100, b: 60 })
    expect(intersect({ l: 0, t: 0, r: 10, b: 10 }, { l: 20, t: 20, r: 30, b: 30 })).toBeNull()
  })

  it('лупа — в самом далёком углу видимой части от активного угла; положение учитывает поля', () => {
    const vis = { l: 100, t: 50, r: 500, b: 650 }
    expect(placeLoupe([120, 70], vis, 120)).toEqual({ place: 'br', left: 500 - 8 - 120, top: 650 - 8 - 120 })
    expect(placeLoupe([480, 70], vis, 120).place).toBe('bl')
    expect(placeLoupe([480, 630], vis, 120)).toEqual({ place: 'tl', left: 108, top: 58 })
    expect(placeLoupe([120, 630], vis, 120).place).toBe('tr')
  })

  it('видимая часть меньше лупы: лупа всё равно размещается, не бросая исключений', () => {
    expect(placeLoupe([10, 10], { l: 0, t: 0, r: 50, b: 50 }, 120).place).toBeDefined()
  })
})
