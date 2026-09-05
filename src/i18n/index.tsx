import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en } from './en'
import { ru, type Dict } from './ru'

export type Lang = 'ru' | 'en'
const DICTS: Record<Lang, Dict> = { ru, en }
const STORAGE_KEY = 'calibrator.lang'

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]
export type Key = Leaves<Dict>

type Vars = Record<string, string | number>

function lookup(dict: Dict, key: string): string {
  let node: unknown = dict
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part]
  return typeof node === 'string' ? node : key
}

export function format(template: string, vars?: Vars): string {
  return vars ? template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : template
}

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ru' || saved === 'en') return saved
  } catch {
    /* storage unavailable */
  }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: Key, vars?: Vars) => string }
const LangContext = createContext<Ctx | null>(null)

export function LangProvider({ children, initial }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initial ?? detectLang)
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* storage unavailable */
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const value = useMemo<Ctx>(() => ({ lang, setLang, t: (key, vars) => format(lookup(DICTS[lang], key), vars) }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useT(): Ctx {
  const v = useContext(LangContext)
  if (!v) throw new Error('useT outside LangProvider')
  return v
}

export function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useT()
  return (
    <div className={className} role="group" aria-label="Language">
      {(['ru', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={
            lang === l
              ? 'rounded-sm bg-surface px-2.5 py-1 text-[13px] font-semibold uppercase text-text shadow-sm'
              : 'rounded-sm px-2.5 py-1 text-[13px] font-medium uppercase text-muted hover:text-text'
          }
        >
          {l}
        </button>
      ))}
    </div>
  )
}
