/** Константы спецификации Gridfinity, мм. Шаг сетки можно переопределить через GridfinitySpec.pitch. */

export interface GridfinitySpec {
  /** Шаг сетки (размер ячейки). */
  pitch: number
}

export const DEFAULT_PITCH = 42
export const defaultSpec: GridfinitySpec = { pitch: DEFAULT_PITCH }

/** Высота одной единицы коробки. */
export const HEIGHT_UNIT = 7

/** Слои профиля снизу вверх: нижняя фаска, вертикальная стенка, верхняя фаска. */
export interface Layers { low: number; wall: number; up: number }

/** Гнездо базовой плиты. */
export const SOCKET_LAYERS: Layers = { low: 0.7, wall: 1.8, up: 2.15 }
/** Нога коробки. */
export const FOOT_LAYERS: Layers = { low: 0.8, wall: 1.8, up: 2.15 }

export const layersHeight = (l: Layers) => l.low + l.wall + l.up

/** Высота гнезда базовой плиты. */
export const SOCKET_HEIGHT = layersHeight(SOCKET_LAYERS) // 4.65

/** Зазор на сторону относительно ячейки. */
export const CLEARANCE = 0.25
/** Радиус скругления гнезда на верхней кромке. */
export const SOCKET_R_TOP = 4.0
/** Радиус скругления ноги коробки на верхней кромке. */
export const FOOT_R_TOP = 3.75
/** Минимальный радиус на нижних слоях, чтобы не вырождаться в острый угол. */
export const R_MIN = 0.3

export const MAGNET_D = 6.5
export const MAGNET_H = 2.4
export const SCREW_D = 3.0
/** Смещение отверстий крепежа от центра ячейки. */
export const HOLE_OFFSET = 13
/** Толщина пола под гнёздами, если есть магниты или винты. */
export const FLOOR = 4.0
