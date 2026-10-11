/** Раскладка деталей по плитам стола (несколько плит, если не влезают): полочная укладка по убыванию глубины. */
export interface Rect { w: number; h: number }
export interface Placement { index: number; x: number; y: number; rotated: boolean }
export interface Plate { items: Placement[]; /** Хотя бы одна деталь больше области стола. */ overflow: boolean }

interface Shelf { y: number; h: number; x: number }
interface PlateState { plate: Plate; shelves: Shelf[]; usedY: number }

const EPS = 1e-9

/**
 * area — область без полей (в её координатах деталь занимает [x, x + w] × [y, y + h]), gap — зазор между деталями.
 * Деталь, не умещающаяся даже повёрнутой, получает отдельную плиту с overflow.
 */
export function arrange(rects: Rect[], area: { x: number; y: number }, gap: number): Plate[] {
  const order = rects.map((r, index) => ({ r, index })).sort((a, b) => Math.max(b.r.w, b.r.h) - Math.max(a.r.w, a.r.h) || a.index - b.index)
  const plates: PlateState[] = []
  const fits = (w: number, h: number) => w <= area.x + EPS && h <= area.y + EPS

  const tryPlace = (st: PlateState, index: number, w: number, h: number, rotated: boolean): boolean => {
    for (const s of st.shelves) {
      if (h <= s.h + EPS && s.x + w <= area.x + EPS) {
        st.plate.items.push({ index, x: s.x, y: s.y, rotated }); s.x += w + gap
        return true
      }
    }
    if (st.usedY + h <= area.y + EPS) {
      st.shelves.push({ y: st.usedY, h, x: w + gap })
      st.plate.items.push({ index, x: 0, y: st.usedY, rotated })
      st.usedY += h + gap
      return true
    }
    return false
  }

  for (const { r, index } of order) {
    let placed = false
    if (fits(r.w, r.h) || fits(r.h, r.w)) {
      // предпочитаем исходную ориентацию, поворачиваем, только если иначе не помещается на текущие плиты
      outer: for (const st of plates) {
        if (st.plate.overflow) continue
        for (const [w, h, rot] of [[r.w, r.h, false], [r.h, r.w, true]] as const) {
          if (fits(w, h) && tryPlace(st, index, w, h, rot)) { placed = true; break outer }
        }
      }
      if (!placed) {
        const st: PlateState = { plate: { items: [], overflow: false }, shelves: [], usedY: 0 }
        plates.push(st)
        const [w, h, rot] = fits(r.w, r.h) ? [r.w, r.h, false] as const : [r.h, r.w, true] as const
        tryPlace(st, index, w, h, rot)
      }
    } else {
      plates.push({ plate: { items: [{ index, x: 0, y: 0, rotated: false }], overflow: true }, shelves: [], usedY: 0 })
    }
  }
  return plates.map((p) => p.plate)
}
