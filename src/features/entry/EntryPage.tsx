import { useEffect, useMemo, useState } from 'react'
import { useDataStore } from '../../store/useDataStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useUiStore } from '../../store/useUiStore'
import { useAppData } from '../../store/selectors'
import { can } from '../../lib/permissions'
import { calcSheet, lineAmount } from '../../lib/calc'
import { formatYen, formatPercent, todayIso } from '../../lib/format'
import { uid } from '../../lib/hash'
import { Icon } from '../../components/Icon'
import { Stepper } from '../../components/Stepper'
import { StatusBadge } from '../../components/StatusBadge'
import {
  RATE_CATEGORY_LABELS,
  type DailySheet,
  type SheetLineItem,
} from '../../types/models'
import './entry.css'

export function EntryPage() {
  const data = useAppData()
  const editingSheetId = useUiStore((s) => s.editingSheetId)
  const openPrint = useUiStore((s) => s.openPrint)
  const setRoute = useUiStore((s) => s.setRoute)
  const notify = useUiStore((s) => s.notify)
  const upsert = useDataStore((s) => s.upsert)
  const audit = useDataStore((s) => s.audit)
  const user = useAuthStore((s) => s.currentUser)

  const [sheet, setSheet] = useState<DailySheet>(() => makeNewSheet(data, user?.id ?? '-'))

  useEffect(() => {
    if (editingSheetId) {
      const found = data.sheets.find((s) => s.id === editingSheetId)
      if (found) setSheet(structuredClone(found))
    } else {
      setSheet(makeNewSheet(data, user?.id ?? '-'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSheetId])

  const totals = useMemo(() => calcSheet(sheet), [sheet])
  const locked = sheet.status === 'closed' || (sheet.status === 'approved' && !can(user, 'approveSheets'))
  const activeRates = data.rateItems.filter((r) => r.active)
  const activeVehicles = data.vehicles.filter((v) => v.active)

  function patch(p: Partial<DailySheet>) {
    setSheet((s) => ({ ...s, ...p }))
  }

  function addLine() {
    const r = activeRates[0]
    const line: SheetLineItem = r
      ? { id: uid(), rateItemId: r.id, name: r.name, category: r.category, unitPrice: r.unitPrice, quantity: 1, unit: r.unit }
      : { id: uid(), rateItemId: '', name: '', category: 'other', unitPrice: 0, quantity: 1, unit: '' }
    patch({ lineItems: [...sheet.lineItems, line] })
  }

  function updateLine(id: string, p: Partial<SheetLineItem>) {
    patch({ lineItems: sheet.lineItems.map((l) => (l.id === id ? { ...l, ...p } : l)) })
  }

  function pickRate(id: string, rateItemId: string) {
    const r = data.rateItems.find((x) => x.id === rateItemId)
    if (!r) return
    updateLine(id, { rateItemId: r.id, name: r.name, category: r.category, unitPrice: r.unitPrice, unit: r.unit })
  }

  function removeLine(id: string) {
    patch({ lineItems: sheet.lineItems.filter((l) => l.id !== id) })
  }

  function toggleVehicle(vehicleId: string) {
    const exists = sheet.vehicles.some((v) => v.vehicleId === vehicleId)
    if (exists) {
      patch({ vehicles: sheet.vehicles.filter((v) => v.vehicleId !== vehicleId) })
    } else {
      const v = data.vehicles.find((x) => x.id === vehicleId)
      if (v) patch({ vehicles: [...sheet.vehicles, { vehicleId: v.id, name: v.name, dailyCost: v.dailyCost }] })
    }
  }

  function persist(status: DailySheet['status'], message: string) {
    if (!sheet.companyId) {
      notify('会社を選択してください', 'error')
      return
    }
    const next: DailySheet = {
      ...sheet,
      status,
      dailyWageSnapshot: data.settings.dailyWage,
      updatedAt: new Date().toISOString(),
      approvedBy: status === 'approved' ? user?.id : sheet.approvedBy,
      approvedAt: status === 'approved' ? new Date().toISOString() : sheet.approvedAt,
    }
    upsert('sheets', next, true)
    audit(message, next.siteName || next.date)
    setSheet(next)
    notify(message)
  }

  return (
    <div className="page entry-layout">
      <div className="entry-main col">
        {/* 基本情報 */}
        <section className="card">
          <header className="card-head">
            <h3>基本情報</h3>
            <StatusBadge status={sheet.status} />
          </header>
          <div className="card-body entry-basic">
            <div className="field">
              <label>日付</label>
              <input className="input" type="date" value={sheet.date} disabled={locked} onChange={(e) => patch({ date: e.target.value })} />
            </div>
            <div className="field">
              <label>会社</label>
              <select className="select" value={sheet.companyId} disabled={locked} onChange={(e) => patch({ companyId: e.target.value })}>
                <option value="">（選択）</option>
                {data.companies.filter((c) => c.active).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>工事</label>
              <select className="select" value={sheet.projectId ?? ''} disabled={locked} onChange={(e) => patch({ projectId: e.target.value || undefined })}>
                <option value="">（未割当）</option>
                {data.projects.filter((p) => p.status !== 'completed').map((p) => (
                  <option key={p.id} value={p.id}>{p.code} {p.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>施工班</label>
              <select className="select" value={sheet.teamId ?? ''} disabled={locked} onChange={(e) => patch({ teamId: e.target.value || undefined })}>
                <option value="">（未割当）</option>
                {data.teams.filter((t) => t.active).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="field entry-site">
              <label>現場名</label>
              <input className="input" value={sheet.siteName} disabled={locked} placeholder="例：○○交差点 北側" onChange={(e) => patch({ siteName: e.target.value })} />
            </div>
          </div>
        </section>

        {/* 出来高明細 */}
        <section className="card">
          <header className="card-head">
            <div>
              <h3>出来高明細</h3>
              <p className="muted em-subtitle">単価マスターから選び、本数/枚数を入力すると金額が自動計算されます。</p>
            </div>
            {!locked && (
              <button className="btn btn-primary btn-sm" onClick={addLine}>
                <Icon name="plus" size={15} /> 明細を追加
              </button>
            )}
          </header>
          <div className="em-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>項目</th>
                  <th>区分</th>
                  <th className="right">単価</th>
                  <th className="right" style={{ width: 220 }}>数量</th>
                  <th className="right">金額</th>
                  {!locked && <th style={{ width: 44 }} />}
                </tr>
              </thead>
              <tbody>
                {sheet.lineItems.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <select className="select" value={l.rateItemId} disabled={locked} onChange={(e) => pickRate(l.id, e.target.value)}>
                        <option value="">（選択）</option>
                        {activeRates.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>{RATE_CATEGORY_LABELS[l.category]}</td>
                    <td className="right">
                      <input className="input num cell-num" type="number" value={l.unitPrice} disabled={locked} onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) })} />
                    </td>
                    <td className="right">
                      <div className="cell-stepper">
                        <Stepper value={l.quantity} disabled={locked} onChange={(n) => updateLine(l.id, { quantity: n })} suffix={l.unit} />
                      </div>
                    </td>
                    <td className="right num"><strong>{formatYen(lineAmount(l))}</strong></td>
                    {!locked && (
                      <td className="right">
                        <button className="btn btn-ghost btn-sm danger-hover" onClick={() => removeLine(l.id)} aria-label="削除">
                          <Icon name="trash" size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {sheet.lineItems.length === 0 && (
                  <tr><td colSpan={locked ? 5 : 6} className="empty">明細がありません。「明細を追加」で行を追加してください。</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>出来高合計（売上）</td>
                  <td className="right num">{formatYen(totals.revenue)}</td>
                  {!locked && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* 原価入力 */}
        <section className="card">
          <header className="card-head"><h3>原価（人件費・経費・車両）</h3></header>
          <div className="card-body entry-cost">
            <div className="field">
              <label>人数</label>
              <Stepper value={sheet.headcount} disabled={locked} onChange={(n) => patch({ headcount: n })} suffix="人" size="lg" />
              <span className="muted em-help">人件費 {formatYen(totals.laborCost)}（日当 {formatYen(data.settings.dailyWage)}）</span>
            </div>
            <div className="field">
              <label>高速代（実費）</label>
              <div className="em-input-suffix">
                <input className="input num" type="number" value={sheet.tollCost} disabled={locked} onChange={(e) => patch({ tollCost: Number(e.target.value) })} />
                <span className="em-suffix">円</span>
              </div>
            </div>
            <div className="field">
              <label>燃料代（実費）</label>
              <div className="em-input-suffix">
                <input className="input num" type="number" value={sheet.fuelCost} disabled={locked} onChange={(e) => patch({ fuelCost: Number(e.target.value) })} />
                <span className="em-suffix">円</span>
              </div>
            </div>
            <div className="field entry-site">
              <label>使用車両（チェックで原価に加算）</label>
              <div className="vehicle-grid">
                {activeVehicles.map((v) => {
                  const checked = sheet.vehicles.some((sv) => sv.vehicleId === v.id)
                  return (
                    <label key={v.id} className={`vehicle-chip ${checked ? 'checked' : ''}`}>
                      <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggleVehicle(v.id)} />
                      <Icon name="truck" size={15} />
                      <span className="vehicle-name">{v.name}</span>
                      <span className="vehicle-cost num">{formatYen(v.dailyCost)}</span>
                    </label>
                  )
                })}
                {activeVehicles.length === 0 && <span className="muted">車両マスターが未登録です</span>}
              </div>
            </div>
            <div className="field entry-site">
              <label>備考</label>
              <textarea className="textarea" value={sheet.note ?? ''} disabled={locked} onChange={(e) => patch({ note: e.target.value })} />
            </div>
          </div>
        </section>
      </div>

      {/* ライブ集計サイドバー */}
      <aside className="entry-summary">
        <div className="summary-card">
          <h3>本日の損益（ライブ）</h3>
          <div className="summary-profit">
            <span className="summary-label">総利益</span>
            <span className={`summary-profit-value num ${totals.profit >= 0 ? 'profit' : 'loss'}`}>
              {formatYen(totals.profit)}
            </span>
            <span className={`summary-margin ${totals.profit >= 0 ? 'profit' : 'loss'}`}>
              利益率 {formatPercent(totals.margin)}
            </span>
          </div>
          <dl className="summary-list num">
            <div className="summary-row revenue"><dt>出来高（売上）</dt><dd>{formatYen(totals.revenue)}</dd></div>
            <div className="summary-sep">原価内訳</div>
            <div className="summary-row"><dt>人件費</dt><dd>{formatYen(totals.laborCost)}</dd></div>
            <div className="summary-row"><dt>高速代</dt><dd>{formatYen(totals.tollCost)}</dd></div>
            <div className="summary-row"><dt>燃料代</dt><dd>{formatYen(totals.fuelCost)}</dd></div>
            <div className="summary-row"><dt>車両費</dt><dd>{formatYen(totals.vehicleCost)}</dd></div>
            <div className="summary-row total"><dt>原価合計</dt><dd>{formatYen(totals.costTotal)}</dd></div>
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
            <button className="btn summary-save" onClick={() => { persist(sheet.status, '保存しました'); openPrint(sheet.id) }}>
              <Icon name="print" size={15} /> 保存して印刷
            </button>
            <button className="btn btn-ghost summary-save" onClick={() => setRoute('sheets')}>一覧へ戻る</button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function makeNewSheet(data: ReturnType<typeof useAppData>, userId: string): DailySheet {
  return {
    id: uid(),
    date: todayIso(),
    companyId: data.companies.find((c) => c.active)?.id ?? '',
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
