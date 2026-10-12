import type { Manifold, ManifoldToplevel } from 'manifold-3d'

/** Тела креплений Keychain: цилиндры, ушко, штифты. Координаты в мм от центра габарита силуэта, Y вверх; z — от плоскости стола. */

const SEG = 48

/** Вертикальный цилиндр радиуса r от z0 до z1 в точке (x, y). */
export function cylinderZ(w: ManifoldToplevel, x: number, y: number, r: number, z0: number, z1: number): Manifold {
  return w.Manifold.cylinder(z1 - z0, r, r, SEG, false).translate([x, y, z0])
}

/** Горизонтальный цилиндр (ось в плоскости z = z) радиуса r между точками a и b. */
export function cylinderAlong(w: ManifoldToplevel, a: { x: number; y: number }, b: { x: number; y: number }, r: number, z = 0): Manifold {
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  return w.Manifold.cylinder(len, r, r, SEG, false).rotate([0, 90, deg]).translate([a.x, a.y, z])
}

/**
 * Ушко: круг наружного диаметра outer с центром c, соединённый выпуклой оболочкой с кружком внутри подложки (join),
 * выдавленный на thickness. Перекрытие с подложкой не меньше стенки гарантирует одно связное тело.
 */
export function lugSolid(w: ManifoldToplevel, c: { x: number; y: number }, outer: number, join: { x: number; y: number; r: number } | null, thickness: number): Manifold {
  const { CrossSection } = w
  const ring = CrossSection.circle(outer / 2, SEG).translate([c.x, c.y])
  const cs = join ? CrossSection.hull([ring, CrossSection.circle(join.r, SEG).translate([join.x, join.y])]) : ring
  return w.Manifold.extrude(cs, thickness)
}

/** Точка внутри подложки, к которой тянется ушко: идём от центра ушка к центру габарита до первого материала и заходим на depth внутрь. */
export function lugJoin(first: (x: number, y: number) => boolean, c: { x: number; y: number }, depth: number, cell: number): { x: number; y: number } | null {
  const l = Math.hypot(c.x, c.y)
  if (l < 1e-9) return null
  const ux = -c.x / l, uy = -c.y / l
  for (let t = 0; t <= l; t += cell / 2) {
    const x = c.x + ux * t, y = c.y + uy * t
    if (first(x, y)) return { x: x + ux * depth, y: y + uy * depth }
  }
  return null
}

/** Свободный штифт: цилиндр радиуса r и длины len на столе, центр в (x, y). */
export function pinSolid(w: ManifoldToplevel, x: number, y: number, r: number, len: number): Manifold {
  return cylinderZ(w, x, y, r, 0, len)
}

/** Длина свободного штифта: меньше суммарной глубины двух отверстий на запас, не короче 0,4 мм. */
export const pinLength = (depthPerHalf: number) => Math.max(0.4, 2 * depthPerHalf - 0.4)
/** Радиус свободного штифта: радиус отверстия минус зазор. */
export const pinRadiusLoose = (radius: number, clearance: number) => Math.max(0.05, radius - clearance)
