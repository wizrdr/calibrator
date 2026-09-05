import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { auth, joinSession } from '@/data/queries'
import { supabase } from '@/data/supabase'
import { LangSwitch, useT } from '@/i18n'
import { Button, Card, ErrorText, Field, Input } from '@/ui'

export function JoinPage() {
  const { t } = useT()
  const { code: codeParam = '' } = useParams()
  const navigate = useNavigate()
  const [code, setCode] = useState(codeParam.toUpperCase())
  const [name, setName] = useState(() => localStorage.getItem('calibrator.name') ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        const r = await auth.signInAnonymously()
        if (r.error) throw r.error
      }
      localStorage.setItem('calibrator.name', name.trim())
      const sessionId = await joinSession(code, name.trim())
      navigate(`/s/${sessionId}`)
    } catch (err) {
      const msg = (err as Error).message
      setError(msg.includes('no such session') ? t('join.notFound') : msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-8">
      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{t('join.title')}</h1>
            <p className="mt-1 text-[15px] text-muted">{t('join.subtitle')}</p>
          </div>
          <LangSwitch className="flex shrink-0 gap-1 rounded-md bg-surface-raised p-0.5" />
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {!codeParam && (
            <Field label={t('join.code')}>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono uppercase tracking-wider" required />
            </Field>
          )}
          <Field label={t('join.name')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('join.namePlaceholder')} required autoFocus />
          </Field>
          <ErrorText error={error} />
          <Button type="submit" size="lg" disabled={busy}>
            {t('join.submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
