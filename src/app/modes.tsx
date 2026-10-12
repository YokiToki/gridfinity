import { IconBox, IconCircleDashed, IconLayoutGrid, IconPhoto, IconShape2, type Icon } from '@tabler/icons-react'

/** Режим продукта на сайте: маршрут, значок и ключи i18n (подпись в переключателе, тексты карточки выбора). */
export interface ProductMode {
  id: string
  path: string
  Icon: Icon
  labelKey: string
  /** Префикс ключей карточки на странице выбора: <startKey>.desc, .tag1, .tag2. */
  startKey: string
}

/** Режимы продукта Gridfinity Master. Не путать с `ModeId` геометрии (ключи ModeParams): тот не зависит от маршрутов. */
export type ModeId = 'box' | 'baseplate' | 'cutout'
export const GRIDFINITY_PATH = '/gridfinity'
export const KEYCHAIN_PATH = '/keychain'
export const MODES: (ProductMode & { id: ModeId })[] = [
  { id: 'box', path: `${GRIDFINITY_PATH}/box`, Icon: IconBox, labelKey: 'modes.box', startKey: 'start.box' },
  { id: 'baseplate', path: `${GRIDFINITY_PATH}/baseplate`, Icon: IconLayoutGrid, labelKey: 'modes.baseplate', startKey: 'start.baseplate' },
  { id: 'cutout', path: `${GRIDFINITY_PATH}/cutout`, Icon: IconCircleDashed, labelKey: 'modes.cutout', startKey: 'start.cutout' },
]

/** Режимы Keychain Master: Изображение (рельеф по картинке) и Форма (готовая фигура). */
export type KeychainModeId = 'image' | 'shape'
export const KEYCHAIN_MODES: (ProductMode & { id: KeychainModeId })[] = [
  { id: 'image', path: `${KEYCHAIN_PATH}/image`, Icon: IconPhoto, labelKey: 'keychain.modes.image', startKey: 'start.keychainImage' },
  { id: 'shape', path: `${KEYCHAIN_PATH}/shape`, Icon: IconShape2, labelKey: 'keychain.modes.shape', startKey: 'start.keychainShape' },
]
