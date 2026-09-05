import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <span className="text-lg font-semibold">Calibrator</span>
        <h1 className="text-2xl font-semibold leading-tight text-balance">Planning poker, который помнит, кто как голосовал, и сверяет это с фактом из Jira</h1>
        <p className="text-[15px] text-muted">Аккаунт нужен только фасилитатору. Команда входит по ссылке без регистрации.</p>
      </div>
      <Card>
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
          <Button type="submit" size="lg" disabled={busy}>
            {mode === 'in' ? 'Войти' : 'Создать аккаунт'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
            {mode === 'in' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </Button>
        </form>
      </Card>
      <p className="text-center text-[13px] text-muted">
        Вас позвали на планирование?{' '}
        <Link to="/join" className="text-accent">
          Войти по коду
        </Link>
      </p>
    </div>
  )
}
