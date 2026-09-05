import { en } from './en'
import { ru } from './ru'
import { format } from './index'

function leaves(o: unknown, prefix = ''): string[] {
  if (typeof o === 'string') return [prefix.slice(0, -1)]
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => leaves(v, `${prefix}${k}.`))
}

describe('i18n dictionaries', () => {
  it('en and ru carry the same keys', () => {
    expect(leaves(en).sort()).toEqual(leaves(ru).sort())
  })

  it('every placeholder in ru exists in en and vice versa', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join()
    const ruLeaves = leaves(ru)
    const get = (d: Record<string, unknown>, k: string) => k.split('.').reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], d) as string
    for (const k of ruLeaves) expect(vars(get(en as never, k))).toBe(vars(get(ru as never, k)))
  })

  it('format substitutes variables and leaves unknown ones visible', () => {
    expect(format('{a} of {b}', { a: 3, b: 7 })).toBe('3 of 7')
    expect(format('{missing}')).toBe('{missing}')
  })
})
