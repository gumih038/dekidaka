import { useMemo } from 'react'
import { EntityManager } from '../../components/EntityManager'
import { useDataStore } from '../../store/useDataStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useUiStore } from '../../store/useUiStore'
import { useAppData, nameResolver } from '../../store/selectors'
import { can } from '../../lib/permissions'
import { projectProgress } from '../../lib/aggregate'
import { formatPercent, formatYen } from '../../lib/format'
import { uid } from '../../lib/hash'
import { PROJECT_STATUS_LABELS, type Project } from '../../types/models'
import './projects.css'

export function ProjectsPage() {
  const data = useAppData()
  const upsert = useDataStore((s) => s.upsert)
  const remove = useDataStore((s) => s.remove)
  const notify = useUiStore((s) => s.notify)
  const user = useAuthStore((s) => s.currentUser)
  const canEdit = can(user, 'editMasters')
  const clientName = nameResolver(data.clients)

  const progressById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof projectProgress>>()
    for (const p of data.projects) map.set(p.id, projectProgress(p, data.sheets))
    return map
  }, [data.projects, data.sheets])

  return (
    <div className="page">
      <EntityManager<Project>
        title="工事台帳・現場管理"
        subtitle="契約金額に対する累積出来高（進捗率）と工事別の損益を管理します。"
        items={[...data.projects].sort((a, b) => b.code.localeCompare(a.code))}
        canEdit={canEdit}
        searchText={(p) => `${p.code} ${p.name}`}
        addLabel="工事を追加"
        columns={[
          { header: '工番', render: (p) => <code>{p.code}</code> },
          { header: '工事名', render: (p) => <strong>{p.name}</strong> },
          { header: '発注元', render: (p) => clientName(p.clientId) },
          { header: '契約金額', align: 'right', render: (p) => formatYen(p.contractAmount) },
          { header: '累積出来高', align: 'right', render: (p) => formatYen(progressById.get(p.id)?.totals.revenue ?? 0) },
          {
            header: '進捗率',
            render: (p) => {
              const pr = progressById.get(p.id)
              const pct = Math.min(100, Math.max(0, pr?.progress ?? 0))
              return (
                <div className="progress-cell">
                  <div className="progress-bar"><span style={{ width: `${pct}%` }} /></div>
                  <span className="progress-pct num">{formatPercent(pr?.progress ?? 0)}</span>
                </div>
              )
            },
          },
          {
            header: '工事利益',
            align: 'right',
            render: (p) => {
              const profit = progressById.get(p.id)?.totals.profit ?? 0
              return <span className={profit >= 0 ? 'profit' : 'loss'}>{formatYen(profit)}</span>
            },
          },
          { header: '状態', render: (p) => <span className="badge badge-closed">{PROJECT_STATUS_LABELS[p.status]}</span> },
        ]}
        fields={[
          { key: 'code', label: '工番', type: 'text', required: true },
          { key: 'name', label: '工事名', type: 'text', required: true, fullWidth: true },
          { key: 'clientId', label: '発注元', type: 'select', options: data.clients.map((c) => ({ value: c.id, label: c.name })) },
          { key: 'site', label: '現場住所', type: 'text', fullWidth: true },
          { key: 'startDate', label: '着工日', type: 'date' },
          { key: 'endDate', label: '完工予定日', type: 'date' },
          { key: 'contractAmount', label: '契約金額', type: 'yen', suffix: '円' },
          {
            key: 'status',
            label: '状態',
            type: 'select',
            options: Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          },
          { key: 'note', label: '備考', type: 'textarea', fullWidth: true },
        ]}
        makeNew={() => ({ id: uid(), code: '', name: '', clientId: '', site: '', startDate: '', endDate: '', contractAmount: 0, status: 'planned', note: '' })}
        onSave={(p) => { upsert('projects', p); notify('工事を保存しました') }}
        onDelete={(id) => remove('projects', id)}
      />
    </div>
  )
}
