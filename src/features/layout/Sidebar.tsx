import { Icon } from '../../components/Icon'
import { useAuthStore } from '../../store/useAuthStore'
import { useUiStore, type Route } from '../../store/useUiStore'
import { can, type Permission } from '../../lib/permissions'

interface NavItem {
  route: Route
  label: string
  icon: Parameters<typeof Icon>[0]['name']
  perm?: Permission
}

const NAV: NavItem[] = [
  { route: 'home', label: 'ホーム', icon: 'dashboard' },
  { route: 'entry', label: '出来高を入力', icon: 'entry', perm: 'editSheets' },
  { route: 'sheets', label: '記録の一覧', icon: 'sheets' },
  { route: 'reports', label: '印刷する', icon: 'reports' },
  { route: 'dashboard', label: '数字を見る', icon: 'dashboard' },
  { route: 'projects', label: '工事の管理', icon: 'projects' },
  { route: 'masters', label: '設定', icon: 'masters', perm: 'editMasters' },
  { route: 'admin', label: '管理', icon: 'admin', perm: 'manageData' },
]

export function Sidebar() {
  const route = useUiStore((s) => s.route)
  const setRoute = useUiStore((s) => s.setRoute)
  const user = useAuthStore((s) => s.currentUser)

  return (
    <nav className="sidebar" aria-label="メインナビゲーション">
      <button className="sidebar-brand" onClick={() => setRoute('home')}>
        <div className="brand-mark">出</div>
        <div className="brand-text">
          <strong>出来高表</strong>
          <span>工事原価・利益管理</span>
        </div>
      </button>
      <ul className="sidebar-nav">
        {NAV.filter((item) => !item.perm || can(user, item.perm)).map((item) => (
          <li key={item.route}>
            <button
              className={`nav-item ${route === item.route ? 'active' : ''}`}
              onClick={() => setRoute(item.route)}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-foot">
        <span className="muted-nav">v0.1.0 ・ 社内利用</span>
      </div>
    </nav>
  )
}
