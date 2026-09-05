import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { auth } from '@/data/queries'
import { activeSession, needsFacts, useTeam } from '@/features/team/useTeam'
import { LangSwitch, useT } from '@/i18n'
import { Icon, icons, cn } from '@/ui'

function NavItem({ to, icon, children, end }: { to: string; icon: string; children: ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn('flex min-h-11 items-center gap-2.5 rounded-md px-3 text-[15px]', isActive ? 'bg-surface font-medium text-text' : 'text-muted hover:bg-surface hover:text-text')
      }
    >
      <Icon d={icon} className="shrink-0" />
      <span className="truncate">{children}</span>
    </NavLink>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const { team, sessions, issues } = useTeam()
  const { t } = useT()
  const navigate = useNavigate()
  const active = activeSession(sessions)
  const pending = needsFacts(sessions, issues)

  return (
    <div className="grid min-h-full md:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-5 border-b border-border bg-surface-side p-4 md:border-b-0 md:border-r md:px-5 md:py-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-muted">{t('common.team')}</span>
          <span className="text-lg font-semibold leading-tight">{team?.name ?? '…'}</span>
        </div>
        <nav className="flex flex-col gap-1">
          <NavItem to="/" icon={icons.plus} end>
            {t('nav.plannings')}
          </NavItem>
          {active && (
            <NavItem to={`/s/${active.id}`} icon={icons.clock}>
              {t('nav.active', { name: active.sprint_name })}
            </NavItem>
          )}
          <NavItem to="/calibration" icon={icons.chart}>
            {t('nav.calibration')}
          </NavItem>
          <NavItem to="/import" icon={icons.upload}>
            {t('nav.importFacts')}
          </NavItem>
          <NavItem to="/settings" icon={icons.gear}>
            {t('nav.settings')}
          </NavItem>
        </nav>
        {pending && (
          <button
            type="button"
            onClick={() => navigate('/import')}
            className="flex flex-col gap-1 rounded-lg bg-accent-soft p-3.5 text-left text-[13px] text-accent-strong hover:bg-border"
          >
            <span className="font-semibold">{t('nav.pendingTitle', { name: pending.sprint_name })}</span>
            <span>{t('nav.pendingBody')}</span>
          </button>
        )}
        <div className="mt-auto flex flex-col gap-2">
          <LangSwitch className="flex gap-1 rounded-md bg-surface-raised p-0.5 self-start" />
          <button
            type="button"
            onClick={() => auth.signOut()}
            className="flex min-h-11 items-center gap-2.5 rounded-md px-3 text-[15px] text-muted hover:bg-surface hover:text-text"
          >
            <Icon d={icons.logout} />
            {t('common.signOut')}
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-6 md:px-10 md:py-8">
        <div className="mx-auto flex max-w-[880px] flex-col gap-5">{children}</div>
      </main>
    </div>
  )
}
