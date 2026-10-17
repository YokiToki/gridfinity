import type { ManifoldToplevel, CrossSection } from 'manifold-3d'
import type { RackRegion } from '../spec'
import { hexCut } from './hex'
import { linesCut, passthroughCut } from './lines'
import { pillsCut } from './pills'
import { placePattern } from './region'
import { skadisCut } from './skadis'
import { MIN_FEATURE, type Issue, type PatternParams } from './types'

/** Вырез выбранного узора в области панели (null, если узора нет или в область ничего не помещается). */
export function cutPattern(w: ManifoldToplevel, pat: PatternParams, region: RackRegion): CrossSection | null {
  switch (pat.kind) {
    case 'skadis': return placePattern(w, region, pat.rotate, (b) => skadisCut(w, b, pat.skadis))
    case 'hex': return placePattern(w, region, pat.rotate, (b) => hexCut(w, b, pat.hex))
    case 'pills': return placePattern(w, region, pat.rotate, (b) => pillsCut(w, b, pat.pills))
    case 'lines': return placePattern(w, region, pat.rotate, (b) => linesCut(w, b, pat.lines))
    case 'passthrough': return placePattern(w, region, pat.rotate, (b) => passthroughCut(w, b, pat.passthrough))
    default: return null
  }
}

/**
 * Замечания о слишком тонких стенках и штрихах выбранного узора: каждое называет настройку, которая меньше MIN_FEATURE.
 * Поле margin проверяется отдельно: тонкая перемычка между узором и ушами тоже ломается при печати.
 */
export function patternIssues(pat: PatternParams, region: RackRegion): Issue[] {
  void region
  const checks: [string, number][] = []
  switch (pat.kind) {
    case 'skadis': {
      const s = pat.skadis
      checks.push(['slotWidth', s.slotWidth], ['pitch', s.pitch - s.slotWidth], ['rowStep', 2 * s.rowStep - s.slotLength])
      break
    }
    case 'hex': checks.push(['width', pat.hex.width], ['wall', pat.hex.wall]); break
    case 'pills': checks.push(['width', pat.pills.width], ['length', pat.pills.length], ['wall', pat.pills.wall]); break
    case 'lines': checks.push(['height', pat.lines.height], ['wall', pat.lines.wall]); break
    default: break
  }
  if (pat.kind !== 'none') checks.push(['margin', pat.margin])
  return checks.filter(([, v]) => v < MIN_FEATURE - 1e-9).map(([setting]) => ({ key: 'rack.warning.thin', setting }))
}
