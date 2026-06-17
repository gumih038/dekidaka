import { Icon } from '../../components/Icon'
import { useAuthStore } from '../../store/useAuthStore'
import { useUiStore, type Route } from '../../store/useUiStore'
import { USER_ROLE_LABELS } from '../../types/models'
import { can } from '../../lib/permissions'
import { formatDate, todayIso } from '../../lib/format'

const TITLES: Record<Route, string> = {
  home: 'ホーム',
  dashboard: '数字を見る（ダッシュボード）',
  entry: '出来高を入力',
  sheets: '記録の一覧',
  projects: '工事の管理',
  masters: '設定',
  reports: '印刷する',
  admin: '管理',
}

export function Topbar() {
  const route = useUiStore((s) => s.route)
  const newSheet = useUiStore((s) => s.newSheet)
  const user = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{TITLES[route]}</h1>
        <span className="topbar-date num">{formatDate(todayIso())}</span>
      </div>
      <div className="spacer" />
      {can(user, 'editSheets') && (
        <button className="btn btn-primary" onClick={newSheet}>
          <Icon name="plus" size={16} />
          新規 出来高表
        </button>
      )}
      <div className="topbar-user">
        <div className="user-avatar">{user?.name?.slice(0, 1) ?? '?'}</div>
        <div className="user-meta">
          <strong>{user?.name}</strong>
          <span>{user ? USER_ROLE_LABELS[user.role] : ''}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout} aria-label="ログアウト" title="ログアウト">
          <Icon name="logout" size={16} />
        </button>
      </div>
    </header>
  )
}
