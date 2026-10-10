import { IconBox, IconCircleDashed, IconLayoutGrid, type Icon } from '@tabler/icons-react'

export type ModeId = 'box' | 'baseplate' | 'cutout'
export const MODES: { id: ModeId; path: string; Icon: Icon }[] = [
  { id: 'box', path: '/box', Icon: IconBox },
  { id: 'baseplate', path: '/baseplate', Icon: IconLayoutGrid },
  { id: 'cutout', path: '/cutout', Icon: IconCircleDashed },
]
