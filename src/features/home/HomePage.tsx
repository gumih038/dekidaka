import { useAuthStore } from '../../store/useAuthStore'
import { useUiStore } from '../../store/useUiStore'
import { useAppData } from '../../store/selectors'
import { can } from '../../lib/permissions'
import { calcSheet, sumTotals } from '../../lib/calc'
import { formatYen, todayIso, yearMonthOf } from '../../lib/format'
import { Icon } from '../../components/Icon'
import './home.css'

export function HomePage() {
  const data = useAppData()
  const user = useAuthStore((s) => s.currentUser)
  const newSheet = useUiStore((s) => s.newSheet)
  const setRoute = useUiStore((s) => s.setRoute)

  const ym = yearMonthOf(todayIso())
  const monthSheets = data.sheets.filter((s) => yearMonthOf(s.date) === ym)
  const monthTotals = sumTotals(monthSheets.map((s) => calcSheet(s)))

  const tiles = [
    { key: 'entry', label: '今日の出来高を入力', desc: '作業した内容を入力します', icon: 'entry' as const, tone: 'blue', onClick: () => newSheet(), show: can(user, 'editSheets') },
    { key: 'sheets', label: 'これまでの記録を見る', desc: '入力した出来高表の一覧', icon: 'sheets' as const, tone: 'slate', onClick: () => setRoute('sheets'), show: true },
    { key: 'reports', label: '印刷する', desc: '出来高報告書をプリント', icon: 'print' as const, tone: 'green', onClick: () => setRoute('reports'), show: true },
    { key: 'dashboard', label: '数字を見る', desc: '売上・利益のグラフ', icon: 'dashboard' as const, tone: 'purple', onClick: () => setRoute('dashboard'), show: true },
    { key: 'projects', label: '工事の管理', desc: '工事ごとの進み具合', icon: 'projects' as const, tone: 'amber', onClick: () => setRoute('projects'), show: true },
    { key: 'masters', label: '設定', desc: '会社・単価・車両など', icon: 'masters' as const, tone: 'slate', onClick: () => setRoute('masters'), show: can(user, 'editMasters') },
  ].filter((t) => t.show)

  return (
    <div className="home">
      <div className="home-greeting">
        <h2>こんにちは、{user?.name} さん</h2>
        <p>やりたいことを大きなボタンから選んでください。</p>
      </div>

      <div className="home-summary">
        <div className="home-stat">
          <span className="home-stat-label">今月の売上</span>
          <strong className="home-stat-value num">{formatYen(monthTotals.revenue)}</strong>
        </div>
        <div className="home-stat">
          <span className="home-stat-label">今月の利益</span>
          <strong className={`home-stat-value num ${monthTotals.profit >= 0 ? 'profit' : 'loss'}`}>{formatYen(monthTotals.profit)}</strong>
        </div>
        <div className="home-stat">
          <span className="home-stat-label">今月の入力件数</span>
          <strong className="home-stat-value num">{monthSheets.length} 件</strong>
        </div>
      </div>

      <div className="home-tiles">
        {tiles.map((t) => (
          <button key={t.key} className={`home-tile tile-${t.tone}`} onClick={t.onClick}>
            <span className="home-tile-icon"><Icon name={t.icon} size={34} /></span>
            <span className="home-tile-text">
              <strong>{t.label}</strong>
              <span>{t.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
