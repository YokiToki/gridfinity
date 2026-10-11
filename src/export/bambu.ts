import { FILAMENTS, PROCESSES, type PrinterPreset } from '../data/printers'
import { escapeXml, type ThreeMfObject } from './threemf'

/**
 * Метаданные проекта Bambu Studio для 3MF. Формат недокументирован и меняется между версиями Studio: всё, что от него
 * зависит, собрано здесь, а обычный 3MF без этих файлов остаётся рабочим запасным вариантом.
 * Версия Studio, на которой сверялись ключи, указана в BAMBU_STUDIO_VERSION; сверка делается открытием файла в Studio.
 */
export const BAMBU_STUDIO_VERSION = '02.00.00.00'
export const BAMBU_NS = ' xmlns:BambuStudio="http://schemas.bambulab.com/package/2021"'

export interface BambuSelection {
  printer: PrinterPreset
  nozzle: number
  process: string
  /** id пластика или 'none'. */
  filament: string
}

const nozzleSuffix = (n: number) => (n === 0.4 ? '' : ` ${n} nozzle`)

/** Имена профилей Studio: «0.20mm Standard @BBL X1C», «Bambu PLA Basic @BBL X1C», «Bambu Lab X1 Carbon 0.4 nozzle». */
export function profileNames(sel: BambuSelection) {
  const b = sel.printer.bambu!
  const proc = PROCESSES.find((p) => p.id === sel.process) ?? PROCESSES[0]
  const fil = FILAMENTS.find((f) => f.id === sel.filament)
  return {
    printer: `${b.model} ${sel.nozzle} nozzle`,
    process: `${proc.studio} @BBL ${b.suffix}${nozzleSuffix(sel.nozzle)}`,
    filament: fil ? `${fil.studio} @BBL ${b.suffix}${nozzleSuffix(sel.nozzle)}` : null,
    layer: proc.layer,
  }
}

/** project_settings.config (JSON): принтер, сопло, профили процесса и пластика, область печати. */
export function projectSettings(sel: BambuSelection): string {
  const n = profileNames(sel)
  const { x, y, z } = sel.printer
  const cfg: Record<string, unknown> = {
    printer_model: sel.printer.bambu!.model,
    printer_settings_id: n.printer,
    print_settings_id: n.process,
    nozzle_diameter: [String(sel.nozzle)],
    layer_height: String(n.layer),
    printable_area: [`0x0`, `${x}x0`, `${x}x${y}`, `0x${y}`],
    printable_height: String(z),
  }
  if (n.filament) cfg.filament_settings_id = [n.filament]
  return JSON.stringify(cfg, null, 2)
}

/** model_settings.config (XML): имена объектов и их разнесение по плитам. */
export function modelSettings(objects: ThreeMfObject[]): string {
  const plates = new Map<number, number[]>()
  objects.forEach((o, k) => plates.set(o.plate, [...(plates.get(o.plate) ?? []), k + 1]))
  const objs = objects.map((o, k) => `  <object id="${k + 1}">\n    <metadata key="name" value="${escapeXml(o.name)}"/>\n    <metadata key="extruder" value="1"/>\n  </object>`)
  const pl = [...plates.entries()].sort((a, b) => a[0] - b[0]).map(([plate, ids]) =>
    `  <plate>\n    <metadata key="plater_id" value="${plate}"/>\n    <metadata key="plater_name" value=""/>\n    <metadata key="locked" value="false"/>\n`
    + ids.map((id) => `    <model_instance>\n      <metadata key="object_id" value="${id}"/>\n      <metadata key="instance_id" value="0"/>\n    </model_instance>`).join('\n') + '\n  </plate>')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n${[...objs, ...pl].join('\n')}\n</config>\n`
}

/** Дополнения пакета 3MF для Bambu Studio. */
export function bambuPackage(sel: BambuSelection, objects: ThreeMfObject[]) {
  return {
    application: `BambuStudio-${BAMBU_STUDIO_VERSION}`,
    extraNamespaces: BAMBU_NS,
    extraMetadata: '<metadata name="BambuStudio:3mfVersion">1</metadata>',
    files: { 'Metadata/project_settings.config': projectSettings(sel), 'Metadata/model_settings.config': modelSettings(objects) },
  }
}
