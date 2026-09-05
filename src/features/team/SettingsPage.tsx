import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { listMembers, mergeMembers, updateTeam, type Member } from '@/data/queries'
import { useT } from '@/i18n'
import { Button, Card, ErrorText, Field, Input, PageHeader } from '@/ui'
import { useTeam } from './useTeam'

export function SettingsPage() {
  const { t } = useT()
  const { team, refresh } = useTeam()
  const [name, setName] = useState(team?.name ?? '')
  const [members, setMembers] = useState<Member[]>([])
  const [from, setFrom] = useState('')
  const [into, setInto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(() => {
    if (team) listMembers(team.id).then(setMembers).catch((e) => setError((e as Error).message))
  }, [team])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (team) setName(team.name)
  }, [team])

  if (!team) return null

  async function rename(e: FormEvent) {
    e.preventDefault()
    try {
      await updateTeam(team!.id, name.trim())
      await refresh()
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function merge() {
    if (!from || !into || from === into) return
    try {
      await mergeMembers(team!.id, from, into)
      setFrom('')
      setInto('')
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const select = (value: string, onChange: (v: string) => void, options: Member[]) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="min-h-11 rounded-md border border-border bg-surface px-3">
      <option value="">{t('settings.choose')}</option>
      {options.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  )

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <ErrorText error={error} />
      <Card>
        <form onSubmit={rename} className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1">
            <Field label={t('settings.teamName')}>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
          </div>
          <Button type="submit" variant="secondary">
            {saved ? t('common.saved') : t('common.save')}
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold">{t('settings.peopleTitle')}</h2>
        <p className="mb-4 text-[13px] text-muted">{t('settings.peopleBody')}</p>
        {members.length === 0 ? (
          <p className="text-[15px] text-muted">{t('settings.nobody')}</p>
        ) : (
          <ul className="mb-4 flex flex-wrap gap-2">
            {members.map((m) => (
              <li key={m.id} className="rounded-full bg-surface-raised px-3 py-1.5 text-[13px] font-medium">
                {m.name}
              </li>
            ))}
          </ul>
        )}
        {members.length > 1 && (
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t('settings.merge')}>{select(from, setFrom, members)}</Field>
            <Field label={t('settings.mergeWith')}>{select(into, setInto, members.filter((m) => m.id !== from))}</Field>
            <Button variant="secondary" onClick={merge} disabled={!from || !into}>
              {t('settings.merge')}
            </Button>
          </div>
        )}
      </Card>
    </>
  )
}
