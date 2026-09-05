import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createTeam, listTeams, type Team } from '@/data/queries'
import { Button, Card, ErrorText, Field, Input } from '@/ui'

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listTeams().then(setTeams).catch((e) => setError(String(e.message)))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      const t = await createTeam(name.trim())
      setTeams([...(teams ?? []), t])
      setName('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Команды</h1>
      {teams === null ? (
        <p className="text-sm text-muted">Загрузка…</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-muted">Пока ни одной команды. Создай первую.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {teams.map((t) => (
            <li key={t.id}>
              <Link to={`/team/${t.id}`} className="block rounded-md border border-border bg-surface px-4 py-3 hover:bg-surface-raised">
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Card>
        <form onSubmit={submit} className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="Новая команда">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Frontend" required />
            </Field>
          </div>
          <Button type="submit">Создать</Button>
        </form>
        <ErrorText error={error} />
      </Card>
    </div>
  )
}
