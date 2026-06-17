import { useMemo, useState } from 'react'
import { useDataStore } from '../../store/useDataStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useUiStore } from '../../store/useUiStore'
import { useAppData } from '../../store/selectors'
import { can } from '../../lib/permissions'
import { calcSheet, sumTotals } from '../../lib/calc'
import { filterByPeriod } from '../../lib/aggregate'
import { formatDate, formatPercent, formatYen } from '../../lib/format'
import { uid } from '../../lib/hash'
import { Icon } from '../../components/Icon'
import { StatusBadge } from '../../components/StatusBadge'
import { nameResolver } from '../../store/selectors'
import type { DailySheet, SheetStatus } from '../../types/models'
import { SHEET_STATUS_LABELS } from '../../types/models'
import './sheets.css'

export function SheetsPage() {
  const data = useAppData()
  const upsert = useDataStore((s) => s.upsert)
  const remove = useDataStore((s) => s.remove)
  const audit = useDataStore((s) => s.audit)
  const openSheet = useUiStore((s) => s.openSheet)
  const openPrint = useUiStore((s) => s.openPrint)
  const notify = useUiStore((s) => s.notify)
  const user = useAuthStore((s) => s.currentUser)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [status, setStatus] = useState<SheetStatus | ''>('')

  const companyName = nameResolver(data.companies)
  const projectName = nameResolver(data.projects.map((p) => ({ id: p.id, name: `${p.code} ${p.name}` })))
  const teamName = nameResolver(data.teams)

  const filtered = useMemo(() => {
    let list = filterByPeriod(data.sheets, from || undefined, to || undefined)
    if (companyId) list = list.filter((s) => s.companyId === companyId)
    if (status) list = list.filter((s) => s.status === status)
    return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [data.sheets, from, to, companyId, status])

  const totals = useMemo(() => sumTotals(filtered.map((s) => calcSheet(s))), [filtered])

  function setStatusOf(sheet: DailySheet, next: SheetStatus, label: string) {
    upsert(
      'sheets',
      {
        ...sheet,
        status: next,
        approvedBy: next === 'approved' ? user?.id : sheet.approvedBy,
        approvedAt: next === 'approved' ? new Date().toISOString() : sheet.approvedAt,
        updatedAt: new Date().toISOString(),
      },
      true,
    )
    audit(label, `${sheet.date} ${sheet.siteName}`)
    notify(label)
  }

  function duplicate(sheet: DailySheet) {
    const copy: DailySheet = {
      ...structuredClone(sheet),
      id: uid(),
      status: 'draft',
      approvedBy: undefined,
      approvedAt: undefined,
      lineItems: sheet.lineItems.map((l) => ({ ...l, id: uid() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    upsert('sheets', copy, true)
    audit('出来高表を複製', `${sheet.date} ${sheet.siteName}`)
    openSheet(copy.id)
  }

  return (
    <div className="page">
      <section className="card">
        <header className="card-head sheets-filter">
          <div className="row sheets-filter-fields">
            <div className="field">
              <label>開始日</label>
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="field">
              <label>終了日</label>
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="field">
              <label>会社</label>
              <select className="select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">すべて</option>
                {data.companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>状態</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value as SheetStatus | '')}>
                <option value="">すべて</option>
                {Object.entries(SHEET_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {(from || to || companyId || status) && (
              <button className="btn btn-sm" onClick={() => { setFrom(''); setTo(''); setCompanyId(''); setStatus('') }}>
                クリア
              </button>
            )}
          </div>
        </header>

        <div className="em-table-wrap sheets-table">
          <table className="table">
            <thead>
              <tr>
                <th>日付</th>
                <th>会社</th>
                <th>工事 / 現場</th>
                <th>班</th>
                <th className="right">出来高</th>
                <th className="right">原価</th>
                <th className="right">利益</th>
                <th className="right">利益率</th>
                <th>状態</th>
                <th style={{ width: 150 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const t = calcSheet(s)
                return (
                  <tr key={s.id}>
                    <td className="num clickable" onClick={() => openSheet(s.id)}>{formatDate(s.date)}</td>
                    <td>{companyName(s.companyId)}</td>
                    <td>
                      <div className="sheets-site">
                        {s.projectId && <span className="muted sheets-proj">{projectName(s.projectId)}</span>}
                        <span>{s.siteName || '—'}</span>
                      </div>
                    </td>
                    <td>{teamName(s.teamId)}</td>
                    <td className="right num">{formatYen(t.revenue)}</td>
                    <td className="right num">{formatYen(t.costTotal)}</td>
                    <td className={`right num ${t.profit >= 0 ? 'profit' : 'loss'}`}><strong>{formatYen(t.profit)}</strong></td>
                    <td className="right num">{formatPercent(t.margin)}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="right">
                      <div className="row sheets-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openSheet(s.id)} aria-label="編集" title="編集"><Icon name="edit" size={15} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openPrint(s.id)} aria-label="印刷" title="印刷"><Icon name="print" size={15} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => duplicate(s)} aria-label="複製" title="複製"><Icon name="copy" size={15} /></button>
                        {s.status === 'submitted' && can(user, 'approveSheets') && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setStatusOf(s, 'approved', '承認しました')} title="承認"><Icon name="check" size={15} /></button>
                        )}
                        {can(user, 'manageData') && (
                          <button className="btn btn-ghost btn-sm danger-hover" onClick={() => { if (confirm('削除しますか？')) remove('sheets', s.id) }} aria-label="削除" title="削除"><Icon name="trash" size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="empty">該当する出来高表がありません</td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4}>合計（{filtered.length}件）</td>
                  <td className="right num">{formatYen(totals.revenue)}</td>
                  <td className="right num">{formatYen(totals.costTotal)}</td>
                  <td className={`right num ${totals.profit >= 0 ? 'profit' : 'loss'}`}>{formatYen(totals.profit)}</td>
                  <td className="right num">{formatPercent(totals.margin)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  )
}
