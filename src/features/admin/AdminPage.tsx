import { useDataStore } from '../../store/useDataStore'
import { useUiStore } from '../../store/useUiStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useAppData } from '../../store/selectors'
import { can } from '../../lib/permissions'
import { exportBackup, importBackup } from '../../db/persistence'
import { formatYen } from '../../lib/format'
import { calcSheet, sumTotals } from '../../lib/calc'
import { Icon } from '../../components/Icon'
import './admin.css'

export function AdminPage() {
  const data = useAppData()
  const replaceAll = useDataStore((s) => s.replaceAll)
  const seedDemo = useDataStore((s) => s.seedDemo)
  const resetEmpty = useDataStore((s) => s.resetEmpty)
  const notify = useUiStore((s) => s.notify)
  const user = useAuthStore((s) => s.currentUser)
  const canManage = can(user, 'manageData')

  const totals = sumTotals(data.sheets.map((s) => calcSheet(s)))

  async function onBackup() {
    const path = await exportBackup(data)
    if (path) notify('バックアップを保存しました')
  }

  async function onRestore() {
    if (!confirm('現在のデータを上書きします。よろしいですか？')) return
    const restored = await importBackup()
    if (!restored) {
      notify('リストアを中止しました', 'info')
      return
    }
    replaceAll(restored, 'バックアップから復元')
    notify('データを復元しました')
  }

  return (
    <div className="page admin-page">
      <div className="admin-cards">
        <section className="card">
          <header className="card-head"><h3>データ統計</h3></header>
          <div className="card-body stat-grid">
            <Stat label="出来高表" value={`${data.sheets.length} 件`} />
            <Stat label="会社" value={`${data.companies.length} 社`} />
            <Stat label="工事" value={`${data.projects.length} 件`} />
            <Stat label="累計売上" value={formatYen(totals.revenue)} />
            <Stat label="累計利益" value={formatYen(totals.profit)} />
            <Stat label="監査ログ" value={`${data.auditLogs.length} 件`} />
          </div>
        </section>

        <section className="card">
          <header className="card-head"><h3>バックアップ / データ管理</h3></header>
          <div className="card-body admin-actions">
            <button className="btn" onClick={onBackup}><Icon name="download" size={16} /> バックアップを保存</button>
            {canManage && <button className="btn" onClick={onRestore}><Icon name="upload" size={16} /> バックアップから復元</button>}
            {canManage && (
              <button className="btn" onClick={() => { if (confirm('デモデータで上書きします。よろしいですか？')) { void seedDemo(); notify('デモデータを投入しました') } }}>
                デモデータ投入
              </button>
            )}
            {canManage && (
              <button className="btn btn-danger" onClick={() => { if (confirm('全データを削除します。元に戻せません。よろしいですか？')) { void resetEmpty(); notify('データを初期化しました', 'info') } }}>
                <Icon name="trash" size={16} /> 全データ初期化
              </button>
            )}
            <p className="muted admin-note">データはこのPC内に保存されます。定期的なバックアップを推奨します。</p>
          </div>
        </section>
      </div>

      <section className="card">
        <header className="card-head"><h3>監査ログ</h3></header>
        <div className="em-table-wrap admin-log">
          <table className="table">
            <thead>
              <tr><th>日時</th><th>ユーザー</th><th>操作</th><th>対象</th></tr>
            </thead>
            <tbody>
              {data.auditLogs.slice(0, 300).map((log) => (
                <tr key={log.id}>
                  <td className="num">{new Date(log.at).toLocaleString('ja-JP')}</td>
                  <td>{log.userName}</td>
                  <td>{log.action}</td>
                  <td className="muted">{log.target}{log.detail ? ` / ${log.detail}` : ''}</td>
                </tr>
              ))}
              {data.auditLogs.length === 0 && <tr><td colSpan={4} className="empty">ログがありません</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value num">{value}</strong>
    </div>
  )
}
