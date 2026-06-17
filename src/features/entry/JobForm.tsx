import { useAppData } from '../../store/selectors'
import { lineAmount, calcSheet } from '../../lib/calc'
import { formatYen } from '../../lib/format'
import { uid } from '../../lib/hash'
import { Icon } from '../../components/Icon'
import { Stepper } from '../../components/Stepper'
import { RATE_CATEGORY_LABELS, type DailySheet, type SheetLineItem } from '../../types/models'

interface JobFormProps {
  job: DailySheet
  locked: boolean
  onChange: (job: DailySheet) => void
}

/** 1件名（1現場）の入力フォーム。工事・班・現場・出来高明細・原価をまとめて編集する。 */
export function JobForm({ job, locked, onChange }: JobFormProps) {
  const data = useAppData()
  const activeRates = data.rateItems.filter((r) => r.active)
  const activeVehicles = data.vehicles.filter((v) => v.active)
  const totals = calcSheet(job)

  const patch = (p: Partial<DailySheet>) => onChange({ ...job, ...p })

  function addLine() {
    const r = activeRates[0]
    const line: SheetLineItem = r
      ? { id: uid(), rateItemId: r.id, name: r.name, category: r.category, unitPrice: r.unitPrice, quantity: 1, unit: r.unit }
      : { id: uid(), rateItemId: '', name: '', category: 'other', unitPrice: 0, quantity: 1, unit: '' }
    patch({ lineItems: [...job.lineItems, line] })
  }
  function updateLine(id: string, p: Partial<SheetLineItem>) {
    patch({ lineItems: job.lineItems.map((l) => (l.id === id ? { ...l, ...p } : l)) })
  }
  function pickRate(id: string, rateItemId: string) {
    const r = data.rateItems.find((x) => x.id === rateItemId)
    if (!r) return
    updateLine(id, { rateItemId: r.id, name: r.name, category: r.category, unitPrice: r.unitPrice, unit: r.unit })
  }
  function removeLine(id: string) {
    patch({ lineItems: job.lineItems.filter((l) => l.id !== id) })
  }
  function toggleVehicle(vehicleId: string) {
    const exists = job.vehicles.some((v) => v.vehicleId === vehicleId)
    if (exists) patch({ vehicles: job.vehicles.filter((v) => v.vehicleId !== vehicleId) })
    else {
      const v = data.vehicles.find((x) => x.id === vehicleId)
      if (v) patch({ vehicles: [...job.vehicles, { vehicleId: v.id, name: v.name, dailyCost: v.dailyCost }] })
    }
  }

  return (
    <div className="col">
      {/* 件名の基本情報 */}
      <section className="card">
        <header className="card-head"><h3>この件名の情報</h3></header>
        <div className="card-body job-basic">
          <div className="field job-site">
            <label>現場名・件名</label>
            <input className="input" value={job.siteName} disabled={locked} placeholder="例：○○交差点 北側 標識設置" onChange={(e) => patch({ siteName: e.target.value })} />
          </div>
          <div className="field">
            <label>工事</label>
            <select className="select" value={job.projectId ?? ''} disabled={locked} onChange={(e) => patch({ projectId: e.target.value || undefined })}>
              <option value="">（未割当）</option>
              {data.projects.filter((p) => p.status !== 'completed').map((p) => (
                <option key={p.id} value={p.id}>{p.code} {p.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>施工班</label>
            <select className="select" value={job.teamId ?? ''} disabled={locked} onChange={(e) => patch({ teamId: e.target.value || undefined })}>
              <option value="">（未割当）</option>
              {data.teams.filter((t) => t.active).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 出来高明細 */}
      <section className="card">
        <header className="card-head">
          <div>
            <h3>出来高明細</h3>
            <p className="muted em-subtitle">単価マスターから選び、本数/枚数を入れると金額が自動計算されます。</p>
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
              {job.lineItems.map((l) => (
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
              {job.lineItems.length === 0 && (
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

      {/* 原価 */}
      <section className="card">
        <header className="card-head"><h3>この件名の原価（人件費・経費・車両）</h3></header>
        <div className="card-body entry-cost">
          <div className="field">
            <label>人数</label>
            <Stepper value={job.headcount} disabled={locked} onChange={(n) => patch({ headcount: n })} suffix="人" size="lg" />
            <span className="muted em-help">人件費 {formatYen(totals.laborCost)}（日当 {formatYen(data.settings.dailyWage)}）</span>
          </div>
          <div className="field">
            <label>高速代（実費）</label>
            <div className="em-input-suffix">
              <input className="input num" type="number" value={job.tollCost} disabled={locked} onChange={(e) => patch({ tollCost: Number(e.target.value) })} />
              <span className="em-suffix">円</span>
            </div>
          </div>
          <div className="field">
            <label>燃料代（実費）</label>
            <div className="em-input-suffix">
              <input className="input num" type="number" value={job.fuelCost} disabled={locked} onChange={(e) => patch({ fuelCost: Number(e.target.value) })} />
              <span className="em-suffix">円</span>
            </div>
          </div>
          <div className="field entry-site">
            <label>使用車両（チェックで原価に加算）</label>
            <div className="vehicle-grid">
              {activeVehicles.map((v) => {
                const checked = job.vehicles.some((sv) => sv.vehicleId === v.id)
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
            <textarea className="textarea" value={job.note ?? ''} disabled={locked} onChange={(e) => patch({ note: e.target.value })} />
          </div>
        </div>
      </section>
    </div>
  )
}
