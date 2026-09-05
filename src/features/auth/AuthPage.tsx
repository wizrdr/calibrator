import { useState, type FormEvent } from 'react'
import { auth } from '@/data/queries'
import { Button, Card, ErrorText, Field, Input } from '@/ui'

export function AuthPage() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const r = mode === 'in' ? await auth.signIn(email, password) : await auth.signUp(email, password)
    setBusy(false)
    if (r.error) setError(r.error.message)
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <Card>
        <h1 className="mb-1 text-xl font-semibold">Calibrator</h1>
        <p className="mb-5 text-sm text-muted">Вход для фасилитатора. Участники входят по ссылке из комнаты.</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Email">
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Пароль">
            <Input
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          <ErrorText error={error} />
          <Button type="submit" disabled={busy}>
            {mode === 'in' ? 'Войти' : 'Создать аккаунт'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
            {mode === 'in' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
