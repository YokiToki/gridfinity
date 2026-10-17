import { CUTOUT_COLORS } from '../../geometry/cutout'

/** CSS-значение цвета выреза по индексу палитры (токен темы `--color-cutout-<i>`); индекс берётся по модулю числа цветов. */
export const cutoutColorVar = (i: number | undefined): string => `var(--color-cutout-${((Math.trunc(i ?? 0) % CUTOUT_COLORS) + CUTOUT_COLORS) % CUTOUT_COLORS})`

/** Имя CSS-переменной того же цвета (для чтения из JS, например в three.js). */
export const cutoutColorName = (i: number | undefined): string => cutoutColorVar(i).slice(4, -1)
