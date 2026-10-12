import { useMemo } from 'react'
import { usePersistedState } from '../../app/usePersistedState'
import { KeychainWorkspace } from './KeychainWorkspace'
import { SharedSections } from './SharedSections'
import { defaultShapeState, migrateShape, shapeParams, type ShapeState } from './shapeState'

const KEY = 'keychain.shape'

/** Режим «Форма» Keychain Master: фигура без изображения. Параметры под ключом keychain.shape; секции рельефа, подложки, крепления и половин те же, что у режима «Изображение». */
export function ShapeMode() {
  const [state, setState] = usePersistedState<ShapeState>(KEY, defaultShapeState, migrateShape)
  const key = JSON.stringify(state)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const params = useMemo(() => shapeParams(state), [key])
  return (
    <KeychainWorkspace
      mode="shape" params={params} image={null}
      panel={(info) => <SharedSections params={params} info={info} onChange={setState} imageSource={false} />}
    />
  )
}
