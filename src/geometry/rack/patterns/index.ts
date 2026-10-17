import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import type { RackRegion } from '../spec'
import { asanohaCut } from './asanoha'
import { hexCut } from './hex'
import { hicksCut } from './hicks'
import { linesCut, passthroughCut } from './lines'
import { pillsCut } from './pills'
import { placePattern, type Box } from './region'
import { skadisCut } from './skadis'
import { MIN_FEATURE, type Issue, type PatternParams } from './types'

/** Вырез выбранного узора в области панели (null, если узора нет или в область ничего не помещается). */
export function cutPattern(w: ManifoldToplevel, pat: PatternParams, region: RackRegion): CrossSection | null {
  const at = (build: (b: Box) => CrossSection | null) => placePattern(region, pat.rotate, build)
  switch (pat.kind) {
    case 'skadis': return at((b) => skadisCut(w, b, pat.skadis))
    case 'hex': return at((b) => hexCut(w, b, pat.hex))
    case 'pills': return at((b) => pillsCut(w, b, pat.pills))
    case 'lines': return at((b) => linesCut(w, b, pat.lines))
    case 'passthrough': return at((b) => passthroughCut(w, b, pat.passthrough))
    case 'hicks': return at((b) => hicksCut(w, b, pat.hicks))
    case 'asanoha': return at((b) => asanohaCut(w, b, pat.asanoha))
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
    case 'hicks': checks.push(['width', pat.hicks.width], ['stroke', pat.hicks.stroke], ['gap', pat.hicks.gap]); break
    case 'asanoha': checks.push(['width', pat.asanoha.width], ['mainWidth', pat.asanoha.mainWidth]); if (pat.asanoha.detailWidth > 0) checks.push(['detailWidth', pat.asanoha.detailWidth]); break
    default: break
  }
  if (pat.kind !== 'none') checks.push(['margin', pat.margin])
  return checks.filter(([, v]) => v < MIN_FEATURE - 1e-9).map(([setting]): Issue => ({ key: 'rack.warning.thin', setting }))
}
