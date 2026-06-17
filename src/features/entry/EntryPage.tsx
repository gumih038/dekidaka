import { useEffect, useMemo, useState } from 'react'
import { useDataStore } from '../../store/useDataStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useUiStore } from '../../store/useUiStore'
import { useAppData } from '../../store/selectors'
import { can } from '../../lib/permissions'
import { calcSheet, sumTotals } from '../../lib/calc'
import { formatYen, formatPercent, todayIso } from '../../lib/format'
import { uid } from '../../lib/hash'
import { Icon } from '../../components/Icon'
import { JobForm } from './JobForm'
import type { DailySheet } from '../../types/models'
import './entry.css'

export function EntryPage() {
  const data = useAppData()
  const editingSheetId = useUiStore((s) => s.editingSheetId)
  const openDayPrint = useUiStore((s) => s.openDayPrint)
  const setRoute = useUiStore((s) => s.setRoute)
  const notify = useUiStore((s) => s.notify)
  const upsert = useDataStore((s) => s.upsert)
  const remove = useDataStore((s) => s.remove)
  const audit = useDataStore((s) => s.audit)
  const user = useAuthStore((s) => s.currentUser)

  // 1日 = 複数件名（jobs）。日付と会社は1日で共有。
  const [date, setDate] = useState(todayIso())
  const [companyId, setCompanyId] = useState(data.companies.find((c) => c.active)?.id ?? '')
  const [jobs, setJobs] = useState<DailySheet[]>(() => [makeNewJob(data, user?.id ?? '-', todayIso(), '')])
  const [active, setActive] = useState(0)
  const [originalIds, setOriginalIds] = useState<string[]>([])

  useEffect(() => {
    const uid0 = user?.id ?? '-'
    if (editingSheetId) {
      const target = data.sheets.find((s) => s.id === editingSheetId)
      if (target) {
        // 同じ日付＋会社の件名をすべて集めてタブにする
        const sameDay = data.sheets
          .filter((s) => s.date === target.date && s.companyId === target.companyId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        const loaded = sameDay.map((s) => structuredClone(s))
        setDate(target.date)
        setCompanyId(target.companyId)
        setJobs(loaded.length ? loaded : [structuredClone(target)])
        setOriginalIds(loaded.map((s) => s.id))
        setActive(Math.max(0, loaded.findIndex((s) => s.id === target.id)))
        return
      }
    }
    const d = todayIso()
    const cid = data.companies.find((c) => c.active)?.id ?? ''
    setDate(d)
    setCompanyId(cid)
    setJobs([makeNewJob(data, uid0, d, cid)])
    setOriginalIds([])
    setActive(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSheetId])

  const locked = useMemo(
    () => jobs.some((j) => j.status === 'closed') || (jobs.some((j) => j.status === 'approved') && !can(user, 'approveSheets')),
    [jobs, user],
  )
  const perJobTotals = useMemo(() => jobs.map((j) => calcSheet(j)), [jobs])
  const dayTotals = useMemo(() => sumTotals(perJobTotals), [perJobTotals])
  const activeTotals = perJobTotals[active] ?? perJobTotals[0]

  function updateJob(idx: number, job: DailySheet) {
    setJobs((prev) => prev.map((j, i) => (i === idx ? job : j)))
  }
  function addJob() {
    setJobs((prev) => [...prev, makeNewJob(data, user?.id ?? '-', date, companyId)])
    setActive(jobs.length)
  }
  function removeJob(idx: number) {
    if (jobs.length <= 1) return
    setJobs((prev) => prev.filter((_, i) => i !== idx))
    setActive((a) => Math.max(0, a >= idx ? a - 1 : a))
  }

  function persist(status: DailySheet['status'], message: string) {
    if (!companyId) {
      notify('会社を選んでください', 'error')
      return
    }
    const now = new Date().toISOString()
    const saved = jobs.map((j) => ({
      ...j,
      date,
      companyId,
      status,
      dailyWageSnapshot: data.settings.dailyWage,
      updatedAt: now,
      approvedBy: status === 'approved' ? user?.id : j.approvedBy,
      approvedAt: status === 'approved' ? now : j.approvedAt,
    }))
    // 削除されたタブをサーバー/ローカルから消す
    const currentIds = new Set(saved.map((s) => s.id))
    originalIds.filter((id) => !currentIds.has(id)).forEach((id) => remove('sheets', id))
    // 保存
    saved.forEach((s) => upsert('sheets', s, true))
    audit(message, `${date}（${saved.length}件名）`)
    setJobs(saved)
    setOriginalIds(saved.map((s) => s.id))
    notify(message)
  }

  const companyName = data.companies.find((c) => c.id === companyId)?.name ?? ''

  return (
    <div className="page entry-layout">
      <div className="entry-main col">
        {/* 1日の共通情報 */}
        <section className="card">
          <header className="card-head"><h3>日付・会社（この1日でまとめて1枚に印刷します）</h3></header>
          <div className="card-body entry-day-head">
            <div className="field">
              <label>日付</label>
              <input className="input" type="date" value={date} disabled={locked} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>会社</label>
              <select className="select" value={companyId} disabled={locked} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">（選択）</option>
                {data.companies.filter((c) => c.active).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 件名タブ */}
        <div className="job-tabs">
          {jobs.map((j, i) => (
            <button key={j.id} className={`job-tab ${i === active ? 'active' : ''}`} onClick={() => setActive(i)}>
              <span className="job-tab-no">{i + 1}</span>
              <span className="job-tab-label">{j.siteName || `件名 ${i + 1}`}</span>
              <span className={`job-tab-amount num ${perJobTotals[i].profit >= 0 ? 'profit' : 'loss'}`}>{formatYen(perJobTotals[i].profit)}</span>
              {!locked && jobs.length > 1 && (
                <span
                  className="job-tab-close"
                  role="button"
                  aria-label="この件名を削除"
                  onClick={(e) => { e.stopPropagation(); if (confirm('この件名を削除しますか？')) removeJob(i) }}
                >
                  <Icon name="close" size={13} />
                </span>
              )}
            </button>
          ))}
          {!locked && (
            <button className="job-tab job-tab-add" onClick={addJob}>
              <Icon name="plus" size={16} /> 件名を追加
            </button>
          )}
        </div>

        {/* 選択中の件名フォーム */}
        <JobForm job={jobs[active]} locked={locked} onChange={(j) => updateJob(active, j)} />
      </div>

      {/* ライブ集計サイドバー */}
      <aside className="entry-summary">
        <div className="summary-card">
          <h3>1日の合計（全{jobs.length}件名）</h3>
          <div className="summary-profit">
            <span className="summary-label">総利益</span>
            <span className={`summary-profit-value num ${dayTotals.profit >= 0 ? 'profit' : 'loss'}`}>{formatYen(dayTotals.profit)}</span>
            <span className={`summary-margin ${dayTotals.profit >= 0 ? 'profit' : 'loss'}`}>利益率 {formatPercent(dayTotals.margin)}</span>
          </div>
          <dl className="summary-list num">
            <div className="summary-row revenue"><dt>出来高（売上）</dt><dd>{formatYen(dayTotals.revenue)}</dd></div>
            <div className="summary-row"><dt>原価合計</dt><dd>{formatYen(dayTotals.costTotal)}</dd></div>
            <div className="summary-sep">選択中の件名「{jobs[active]?.siteName || `件名 ${active + 1}`}」</div>
            <div className="summary-row"><dt>出来高</dt><dd>{formatYen(activeTotals.revenue)}</dd></div>
            <div className="summary-row"><dt>原価</dt><dd>{formatYen(activeTotals.costTotal)}</dd></div>
            <div className="summary-row total"><dt>利益</dt><dd className={activeTotals.profit >= 0 ? 'profit' : 'loss'}>{formatYen(activeTotals.profit)}</dd></div>
          </dl>

          <div className="summary-actions">
            {!locked && (
              <button className="btn btn-primary summary-save" onClick={() => persist('draft', '下書きを保存しました')}>
                <Icon name="check" size={16} /> 下書き保存
              </button>
            )}
            {!locked && can(user, 'submitSheets') && (
              <button className="btn summary-save" onClick={() => persist('submitted', '申請しました')}>
                <Icon name="send" size={15} /> 申請する
              </button>
            )}
            <button
              className="btn summary-save"
              onClick={() => {
                if (!companyId) { notify('会社を選んでください', 'error'); return }
                persist(jobs[0]?.status ?? 'draft', '保存しました')
                openDayPrint(date, companyId)
              }}
            >
              <Icon name="print" size={15} /> 保存して印刷画面へ
            </button>
            <button className="btn btn-ghost summary-save" onClick={() => setRoute('sheets')}>一覧へ戻る</button>
          </div>
          {companyName && <p className="summary-foot muted">{date} ／ {companyName}</p>}
        </div>
      </aside>
    </div>
  )
}

function makeNewJob(data: ReturnType<typeof useAppData>, userId: string, date: string, companyId: string): DailySheet {
  return {
    id: uid(),
    date,
    companyId,
    projectId: undefined,
    teamId: undefined,
    siteName: '',
    headcount: 0,
    tollCost: 0,
    fuelCost: 0,
    note: '',
    lineItems: [],
    vehicles: [],
    dailyWageSnapshot: data.settings.dailyWage,
    status: 'draft',
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
