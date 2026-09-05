import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { auth, joinSession } from '@/data/queries'
import { supabase } from '@/data/supabase'
import { Button, Card, ErrorText, Field, Input } from '@/ui'

export function JoinPage() {
  const { code: codeParam = '' } = useParams()
  const navigate = useNavigate()
  const [code, setCode] = useState(codeParam)
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
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <Card>
        <h1 className="mb-1 text-xl font-semibold">Войти в сессию</h1>
        <p className="mb-5 text-sm text-muted">Аккаунт не нужен: код от фасилитатора и твоё имя.</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Код">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono uppercase" required />
          </Field>
          <Field label="Имя">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <ErrorText error={error} />
          <Button type="submit" disabled={busy}>
            Войти
          </Button>
        </form>
      </Card>
    </div>
  )
}
