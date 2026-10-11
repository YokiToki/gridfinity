import { strToU8, zipSync } from 'fflate'
import type { PlacedMesh } from './orient'

/** Деталь в пакете 3MF: готовая (уже ориентированная) сетка и положение её угла на столе. */
export interface ThreeMfObject {
  name: string
  mesh: PlacedMesh
  /** Положение минимального угла габарита, мм (координаты стола/сцены). */
  x: number
  y: number
  /** Номер плиты, с 1: нужен метаданным Bambu. */
  plate: number
}

export interface ThreeMfOptions {
  title: string
  /** Имя приложения в метаданных модели. */
  application?: string
  /** Дополнительные пространства имён и метаданные модели (Bambu). */
  extraNamespaces?: string
  extraMetadata?: string
  /** Дополнительные файлы пакета: путь → текст. */
  files?: Record<string, string>
}

const CORE_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'

export const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!)
const num = (v: number) => (Math.round(v * 1e5) / 1e5).toString()

export function modelXml(objects: ThreeMfObject[], o: ThreeMfOptions): string {
  const res: string[] = []
  const build: string[] = []
  objects.forEach((obj, k) => {
    const id = k + 1
    const p = obj.mesh.positions, t = obj.mesh.triangles
    const v: string[] = []
    for (let i = 0; i < p.length; i += 3) v.push(`<vertex x="${num(p[i])}" y="${num(p[i + 1])}" z="${num(p[i + 2])}"/>`)
    const tr: string[] = []
    for (let i = 0; i < t.length; i += 3) tr.push(`<triangle v1="${t[i]}" v2="${t[i + 1]}" v3="${t[i + 2]}"/>`)
    res.push(`<object id="${id}" name="${escapeXml(obj.name)}" type="model"><mesh><vertices>${v.join('')}</vertices><triangles>${tr.join('')}</triangles></mesh></object>`)
    build.push(`<item objectid="${id}" transform="1 0 0 0 1 0 0 0 1 ${num(obj.x)} ${num(obj.y)} 0" printable="1"/>`)
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="${CORE_NS}"${o.extraNamespaces ?? ''}>`
    + `<metadata name="Title">${escapeXml(o.title)}</metadata><metadata name="Application">${escapeXml(o.application ?? 'Gridfinity Generator')}</metadata>${o.extraMetadata ?? ''}`
    + `<resources>${res.join('')}</resources><build>${build.join('')}</build></model>`
}

const CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>'
  + '<Default Extension="config" ContentType="text/xml"/></Types>'
const RELS = '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'

/** Пакет 3MF (ZIP): [Content_Types].xml, _rels/.rels, 3D/3dmodel.model и дополнительные файлы. */
export function build3mf(objects: ThreeMfObject[], o: ThreeMfOptions): Uint8Array {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(RELS),
    '3D/3dmodel.model': strToU8(modelXml(objects, o)),
  }
  for (const [path, text] of Object.entries(o.files ?? {})) files[path] = strToU8(text)
  return zipSync(files, { level: 6 })
}
