import { type FormEvent, useState } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { isRemote } from '../../db/supabase'
import './login.css'

export function LoginScreen() {
  const login = useAuthStore((s) => s.login)
  const [loginId, setLoginId] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await login(loginId, password)
    setBusy(false)
    if (!res.ok) setError(res.error ?? 'ログインに失敗しました')
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-brand">
          <div className="brand-mark login-mark">出</div>
          <div>
            <h1>出来高表</h1>
            <p>工事原価・利益管理システム</p>
          </div>
        </div>
        <form className="login-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="loginId">ログインID</label>
            <input
              id="loginId"
              className="input"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
            {busy ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
        <p className="login-hint">
          {isRemote()
            ? '管理者から発行されたログインIDとパスワードでログインしてください。'
            : '初期アカウント：admin / パスワード admin'}
        </p>
      </div>
      <footer className="login-foot">
        社内利用専用 ・ データは{isRemote() ? 'サーバーに保存・共有されます' : 'このPC内に保存されます'}
      </footer>
    </div>
  )
}
