import { useEffect } from 'react'
import { useDataStore } from './store/useDataStore'
import { useAuthStore } from './store/useAuthStore'
import { LoginScreen } from './features/auth/LoginScreen'
import { SetupScreen } from './features/auth/SetupScreen'
import { AppShell } from './features/layout/AppShell'
import { Toaster } from './components/Toaster'

export function App() {
  const loaded = useDataStore((s) => s.loaded)
  const load = useDataStore((s) => s.load)
  const hydrate = useAuthStore((s) => s.hydrate)
  const user = useAuthStore((s) => s.currentUser)
  const needsSetup = useAuthStore((s) => s.needsSetup)

  useEffect(() => {
    void load().then(() => hydrate())
  }, [load, hydrate])

  if (!loaded) {
    return (
      <div className="splash">
        <div className="brand-mark login-mark">出</div>
        <p>読み込み中…</p>
      </div>
    )
  }

  return (
    <>
      {user ? <AppShell /> : needsSetup ? <SetupScreen /> : <LoginScreen />}
      <Toaster />
    </>
  )
}
