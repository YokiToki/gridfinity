/**
 * Отличаются ли настройки секции от умолчаний: структурное сравнение простых JSON-подобных значений (объекты, массивы, числа,
 * строки, логические). Числа сравниваются точно и в мм (как хранятся), а не по строкам с единицами, поэтому смена единиц и языка
 * на результат не влияет. Ключи со значением undefined считаются отсутствующими (поле, которого не было в старой записи).
 */
export function isChanged(value: unknown, defaults: unknown): boolean {
  return !same(value, defaults)
}

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b)
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((x, i) => same(x, b[i]))
  }
  const ao = a as Record<string, unknown>, bo = b as Record<string, unknown>
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)])
  for (const k of keys) {
    const x = ao[k], y = bo[k]
    if (x === undefined && y === undefined) continue
    if (!same(x, y)) return false
  }
  return true
}
