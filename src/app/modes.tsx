import { IconBox, IconCircleDashed, IconLayoutGrid, type Icon } from '@tabler/icons-react'

/** Режимы продукта Gridfinity Master. Не путать с `ModeId` геометрии (ключи ModeParams): тот не зависит от маршрутов. */
export type ModeId = 'box' | 'baseplate' | 'cutout'
export const GRIDFINITY_PATH = '/gridfinity'
export const MODES: { id: ModeId; path: string; Icon: Icon }[] = [
  { id: 'box', path: `${GRIDFINITY_PATH}/box`, Icon: IconBox },
  { id: 'baseplate', path: `${GRIDFINITY_PATH}/baseplate`, Icon: IconLayoutGrid },
  { id: 'cutout', path: `${GRIDFINITY_PATH}/cutout`, Icon: IconCircleDashed },
]
