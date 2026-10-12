import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import { roundedRectCS } from './bin'
import { effectiveRadius, polygonVertices, shapeBounds, type ShapeParams } from './shapes'

/** Число сегментов на полную окружность: хорда отклоняется от дуги меньше 0.01 мм даже у круга диаметром 100 мм. */
const SEGMENTS = 256

/**
 * Точный гладкий контур фигуры (CrossSection) с центром габарита в нуле. Рельеф и подложка обрезаются по нему, поэтому скругления
 * не зависят от шага сетки рельефа: острые углы остаются острыми, радиусы — настоящими дугами.
 */
export function shapeCrossSection(w: ManifoldToplevel, s: ShapeParams): CrossSection {
  const { CrossSection } = w
  switch (s.kind) {
    case 'circle': return CrossSection.circle(s.width / 2, SEGMENTS)
    case 'ellipse': return CrossSection.circle(1, SEGMENTS).scale([s.width / 2, s.height / 2])
    case 'capsule': return roundedRectCS(w, s.width, s.height, Math.min(s.width, s.height) / 2, SEGMENTS)
    case 'polygon': {
      const b = shapeBounds(s), r = effectiveRadius(s)
      if (s.width / 2 - r < 1e-6) return CrossSection.circle(s.width / 2, SEGMENTS) // скругление съело всё ядро
      const core = CrossSection.ofPolygons([polygonVertices(s)])
      const shaped = r > 1e-6 ? core.offset(r, 'Round', 2, SEGMENTS) : core
      return shaped.translate([-(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2])
    }
    default: return roundedRectCS(w, s.width, s.height, effectiveRadius(s), SEGMENTS)
  }
}
