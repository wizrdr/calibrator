import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthPage } from '@/features/auth/AuthPage'
import { isFacilitator, useAuth } from '@/features/auth/useAuth'
import { JoinPage } from '@/features/room/JoinPage'
import { SessionPage } from '@/features/room/SessionPage'
import { TeamPage } from '@/features/team/TeamPage'
import { TeamsPage } from '@/features/team/TeamsPage'
import { ImportPage } from '@/features/import/ImportPage'
import { ReportPage } from '@/features/report/ReportPage'
import { GeneratorPage } from '@/features/generator/GeneratorPage'
import { auth } from '@/data/queries'
import { Button } from '@/ui'

function Shell() {
  const { loading, user } = useAuth()
  const location = useLocation()
  if (loading) return null

  const publicRoute = location.pathname.startsWith('/j/') || location.pathname.startsWith('/s/')
  if (!isFacilitator(user) && !publicRoute) {
    return location.pathname === '/join' ? <JoinPage /> : <AuthPage />
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {isFacilitator(user) && (
        <header className="mb-6 flex items-center justify-between text-sm text-muted">
          <span>{user?.email}</span>
          <Button variant="ghost" onClick={() => auth.signOut()}>
            Выйти
          </Button>
        </header>
      )}
      <Routes>
        <Route path="/" element={<TeamsPage />} />
        <Route path="/team/:teamId" element={<TeamPage />} />
        <Route path="/team/:teamId/import" element={<ImportPage />} />
        <Route path="/team/:teamId/report" element={<ReportPage />} />
        <Route path="/team/:teamId/generator" element={<GeneratorPage />} />
        <Route path="/s/:sessionId" element={<SessionPage />} />
        <Route path="/j/:code" element={<JoinPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Shell />
    </BrowserRouter>
  )
}
