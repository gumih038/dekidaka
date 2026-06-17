import { type FormEvent, useState } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import './login.css'

/** 初回起動：最初の管理者アカウントを作成する画面（Supabaseモード） */
export function SetupScreen() {
  const createFirstAdmin = useAuthStore((s) => s.createFirstAdmin)
  const [name, setName] = useState('')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('パスワードは6文字以上にしてください')
      return
    }
    setBusy(true)
    setError('')
    const res = await createFirstAdmin(loginId, name, password)
    setBusy(false)
    if (!res.ok) setError(res.error ?? '作成に失敗しました')
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-brand">
          <div className="brand-mark login-mark">出</div>
          <div>
            <h1>はじめての設定</h1>
            <p>最初の管理者アカウントを作ります</p>
          </div>
        </div>
        <form className="login-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="name">お名前</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：山田 太郎" autoFocus />
          </div>
          <div className="field">
            <label htmlFor="loginId">ログインID（半角英数）</label>
            <input id="loginId" className="input" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="例：admin" autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="password">パスワード（6文字以上）</label>
            <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
            {busy ? '作成中…' : 'この内容で作成して始める'}
          </button>
        </form>
        <p className="login-hint">この情報はサーバーに保存され、各PCから同じデータを使えます。</p>
      </div>
      <footer className="login-foot">出来高表 ・ サーバー保存モード</footer>
    </div>
  )
}
