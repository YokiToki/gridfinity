import { edtSquared } from './edt'

/** Расширение диском радиуса r: материалом становится всё, что не дальше r от материала. r ≤ 0 — без изменений. */
export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask
  const inv = new Uint8Array(mask.length)
  for (let i = 0; i < inv.length; i++) inv[i] = mask[i] ? 0 : 1
  const d = edtSquared(inv, w, h)
  const out = new Uint8Array(mask.length), r2 = r * r
  for (let i = 0; i < out.length; i++) out[i] = d[i] <= r2 ? 1 : 0
  return out
}

/** Сужение диском радиуса r: остаётся материал, от которого до фона больше r. Край картинки не считается фоном. */
export function erode(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask
  const d = edtSquared(mask, w, h)
  const out = new Uint8Array(mask.length), r2 = r * r
  for (let i = 0; i < out.length; i++) out[i] = mask[i] && d[i] > r2 ? 1 : 0
  return out
}

/** Закрытие: смыкает щели уже 2r (расширение, затем сужение). */
export function close(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  return r <= 0 ? mask : erode(dilate(mask, w, h, r), w, h, r)
}
