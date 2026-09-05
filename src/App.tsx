import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from '@/app/Shell'
import { AuthPage } from '@/features/auth/AuthPage'
import { isFacilitator, useAuth } from '@/features/auth/useAuth'
import { ImportPage } from '@/features/import/ImportPage'
import { ReportPage } from '@/features/report/ReportPage'
import { JoinPage } from '@/features/room/JoinPage'
import { SessionPage } from '@/features/room/SessionPage'
import { HomePage } from '@/features/team/HomePage'
import { NewSessionPage } from '@/features/team/NewSessionPage'
import { SettingsPage } from '@/features/team/SettingsPage'
import { TeamProvider } from '@/features/team/useTeam'

function Facilitator() {
  return (
    <TeamProvider>
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/new" element={<NewSessionPage />} />
          <Route path="/calibration" element={<ReportPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </TeamProvider>
  )
}

function Root() {
  const { loading, user } = useAuth()
  const location = useLocation()
  if (loading) return null

  const path = location.pathname
  if (path.startsWith('/j/') || path === '/join' || path.startsWith('/s/')) {
    return (
      <Routes>
        <Route path="/j/:code" element={<JoinPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/s/:sessionId" element={<SessionPage />} />
      </Routes>
    )
  }
  if (!isFacilitator(user)) return <AuthPage />
  return <Facilitator />
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Root />
    </BrowserRouter>
  )
}
