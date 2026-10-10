import { describe, expect, it } from 'vitest'
import en from './en.json'
import ru from './ru.json'

const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]))

describe('переводы', () => {
  it('в ru.json есть каждый ключ из en.json и наоборот', () => {
    expect(keys(ru).sort()).toEqual(keys(en).sort())
  })
  it('нет пустых строк', () => {
    for (const k of [...keys(en), ...keys(ru)]) expect(k).toBeTruthy()
  })
})
