import { useTranslation } from 'react-i18next'
import { defaultKeychain, type BaseParams, type PlateShape } from '../../geometry/keychain'
import { Section } from '../../ui/Section'
import { isChanged } from '../../ui/isChanged'
import { Select } from '../../ui/Select'
import { Toggle } from '../../ui/Toggle'
import { LengthField } from '../../ui/LengthField'
import { Banner } from '../../ui/Banner'
import { formatLength, useUnit } from '../../ui/units'

const SHAPES: PlateShape[] = ['silhouette', 'rect', 'rounded', 'circle']

/** Подложка: толщина, форма (по силуэту, прямоугольник, скруглённый, круг), смещение, поле, радиус, размер. */
export function BaseSection({ value: b, defaults = defaultKeychain.base, error, plateError, onChange }: { value: BaseParams; defaults?: BaseParams; error: (field: string) => string | undefined; plateError: string | null; onChange: (p: Partial<BaseParams>) => void }) {
  const { t } = useTranslation()
  const { unit } = useUnit()
  const summary = b.thickness > 0 ? `${formatLength(b.thickness, unit)} ${t(`units.${unit}`)} · ${t(`keychain.base.shapes.${b.shape}`)}` : t('keychain.base.none')
  const sized = b.shape === 'rect' || b.shape === 'rounded' || b.shape === 'circle'
  return (
    <Section title={t('keychain.base.title')} summary={summary} modified={isChanged(b, defaults)} onReset={() => onChange({ ...defaults })}>
      <LengthField label={t('keychain.base.thickness')} value={b.thickness} min={0} max={10} step={0.2} error={error('base.thickness')} onChange={(v) => onChange({ thickness: v })} />
      {b.thickness > 0 && (
        <>
          <Select label={t('keychain.base.shape')} value={b.shape} options={SHAPES.map((s) => ({ value: s, label: t(`keychain.base.shapes.${s}`) }))} onChange={(v) => onChange({ shape: v as PlateShape })} />
          {b.shape === 'silhouette' && <LengthField label={t('keychain.base.offset')} value={b.offset} min={0} max={20} step={0.5} error={error('base.offset')} onChange={(v) => onChange({ offset: v })} />}
          {sized && <Toggle label={t('keychain.base.auto')} checked={b.auto} onChange={(v) => onChange({ auto: v })} />}
          {sized && b.auto && <LengthField label={t('keychain.base.margin')} value={b.margin} min={0} max={30} step={0.5} error={error('base.margin')} onChange={(v) => onChange({ margin: v })} />}
          {sized && !b.auto && (
            <div className="grid grid-cols-2 gap-2">
              <LengthField label={b.shape === 'circle' ? t('keychain.base.diameter') : t('keychain.base.width')} value={b.width} min={5} max={500} step={1} error={error('base.width')} onChange={(v) => onChange({ width: v })} />
              {b.shape !== 'circle' && <LengthField label={t('keychain.base.height')} value={b.height} min={5} max={500} step={1} error={error('base.width')} onChange={(v) => onChange({ height: v })} />}
            </div>
          )}
          {b.shape === 'rounded' && <LengthField label={t('keychain.base.radius')} value={b.radius} min={0} max={50} step={0.5} error={error('base.radius')} onChange={(v) => onChange({ radius: v })} />}
          {plateError && <Banner kind="error">{t(plateError)}</Banner>}
        </>
      )}
    </Section>
  )
}
