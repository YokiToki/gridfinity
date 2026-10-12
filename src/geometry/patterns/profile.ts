/** Профили рельефа: функция расстояния до кромки (доля ширины скоса t ∈ [0, 1]) → доля высоты плато ∈ [0, 1]. */
export type ProfileKind = 'bevel' | 'dome' | 'terrace' | 'flat' | 'engraved'
export const PROFILE_KINDS: ProfileKind[] = ['bevel', 'dome', 'terrace', 'flat', 'engraved']

export interface ProfileParams {
  profile: ProfileKind
  /** Показатель скоса (bevel, engraved): < 1 утолщает тонкие кончики. */
  pow: number
  /** Число ступеней (terrace). */
  steps: number
}

const smoothstep = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }

/**
 * Значение профиля по доле t = расстояние / ширина скоса.
 * bevel — как в исходном конвейере (smoothstep от t^pow); dome — sin(t·π/2), на плато наклон нулевой;
 * terrace — n плоских уровней (1/n … 1); flat — сразу плато; engraved — огибающая выемки (как bevel).
 */
export function profileValue(t: number, p: ProfileParams): number {
  const c = Math.min(1, Math.max(0, t))
  switch (p.profile) {
    case 'dome': return Math.sin((c * Math.PI) / 2)
    case 'terrace': { const n = Math.max(1, Math.round(p.steps)); return c <= 0 ? 0 : Math.min(1, Math.ceil(c * n - 1e-9) / n) }
    case 'flat': return c > 0 ? 1 : 0
    default: return smoothstep(c ** p.pow)
  }
}

/** Пресеты: данные, а не скрытое состояние. Профиль «Свой» определяется сравнением значений с таблицей. */
export const PRESETS: Record<ProfileKind, Partial<ProfileParams>> = {
  bevel: { profile: 'bevel', pow: 0.65 },
  dome: { profile: 'dome' },
  terrace: { profile: 'terrace', steps: 3 },
  flat: { profile: 'flat' },
  engraved: { profile: 'engraved', pow: 0.65 },
}

/** Пресет, которому соответствуют текущие значения, или 'custom'. */
export function presetOf(p: ProfileParams): ProfileKind | 'custom' {
  for (const k of PROFILE_KINDS) {
    const preset = PRESETS[k]
    if ((Object.keys(preset) as (keyof ProfileParams)[]).every((f) => preset[f] === p[f])) return k
  }
  return 'custom'
}

/** Значения профиля из пресета поверх текущих (остальные поля сохраняются). */
export const applyPreset = <T extends ProfileParams>(p: T, kind: ProfileKind): T => ({ ...p, ...PRESETS[kind] })
