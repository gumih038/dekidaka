import { useMemo } from 'react'
import { useAppData, nameResolver } from '../../store/selectors'
import { calcSheet, lineAmount, sumTotals } from '../../lib/calc'
import { formatDate, formatPercent, formatYen } from '../../lib/format'
import { RATE_CATEGORY_LABELS } from '../../types/models'

interface ProjectPrintProps {
  projectId: string
}

/** 1つの工事（件名）の全出来高を1枚にまとめた明細書（A4横・Excel風）。 */
export function ProjectPrint({ projectId }: ProjectPrintProps) {
  const data = useAppData()
  const project = data.projects.find((p) => p.id === projectId)
  const clientName = nameResolver(data.clients)
  const companyName = nameResolver(data.companies)
  const teamName = nameResolver(data.teams)

  const rows = useMemo(
    () =>
      data.sheets
        .filter((s) => s.projectId === projectId)
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)),
    [data.sheets, projectId],
  )
  const grand = useMemo(() => sumTotals(rows.map((r) => calcSheet(r))), [rows])
  const progress = project && project.contractAmount > 0 ? (grand.revenue / project.contractAmount) * 100 : 0

  return (
    <div className="print-sheet day-print">
      <header className="print-head">
        <div className="print-company">
          <div>
            <h1 className="print-company-name">{project ? `${project.code} ${project.name}` : '工事'}</h1>
            <p className="print-company-sub">発注元：{project?.clientId ? clientName(project.clientId) : '—'}</p>
            {project?.site && <p className="print-company-sub">現場：{project.site}</p>}
          </div>
        </div>
        <div className="print-title-block">
          <h2 className="print-title">工事別 出来高明細書</h2>
          <table className="print-meta">
            <tbody>
              <tr><th>契約金額</th><td>{formatYen(project?.contractAmount ?? 0)}</td></tr>
              <tr><th>累計出来高</th><td>{formatYen(grand.revenue)}（進捗 {formatPercent(progress)}）</td></tr>
              <tr><th>件数</th><td>{rows.length} 件</td></tr>
            </tbody>
          </table>
        </div>
      </header>

      {rows.map((job, idx) => {
        const t = calcSheet(job)
        return (
          <div className="day-job" key={job.id}>
            <div className="day-job-head">
              <span className="day-job-no">{idx + 1}</span>
              <span className="day-job-site">{formatDate(job.date)}　{job.siteName || '（現場名なし）'}</span>
              <span className="day-job-meta">{job.teamId ? `班:${teamName(job.teamId)}` : ''}　{companyName(job.companyId)}</span>
              <span className={`day-job-profit ${t.profit >= 0 ? 'is-profit' : 'is-loss'}`}>利益 {formatYen(t.profit)}</span>
            </div>
            <div className="day-job-body">
              <table className="print-table day-job-table">
                <thead>
                  <tr>
                    <th className="c-no">No.</th>
                    <th>項目</th>
                    <th className="c-cat">区分</th>
                    <th className="c-num">単価</th>
                    <th className="c-qty">数量</th>
                    <th className="c-num">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {job.lineItems.map((l, i) => (
                    <tr key={l.id}>
                      <td className="c-no">{i + 1}</td>
                      <td>{l.name}</td>
                      <td className="c-cat">{RATE_CATEGORY_LABELS[l.category]}</td>
                      <td className="c-num">{formatYen(l.unitPrice)}</td>
                      <td className="c-qty">{l.quantity} {l.unit}</td>
                      <td className="c-num">{formatYen(lineAmount(l))}</td>
                    </tr>
                  ))}
                  {job.lineItems.length === 0 && (
                    <tr><td className="c-no">&nbsp;</td><td colSpan={5} className="muted">明細なし</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="print-total-label">出来高</td>
                    <td className="c-num print-total">{formatYen(t.revenue)}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="day-job-costline">
                <span>人件費(<span className="ci-num">{job.headcount}</span>人) <span className="ci-num">{formatYen(t.laborCost)}</span></span>
                <span>高速 <span className="ci-num">{formatYen(t.tollCost)}</span></span>
                <span>燃料 <span className="ci-num">{formatYen(t.fuelCost)}</span></span>
                <span>車両({job.vehicles.length}) <span className="ci-num">{formatYen(t.vehicleCost)}</span></span>
                <span className="ci-cost">原価計 <span className="ci-num">{formatYen(t.costTotal)}</span></span>
                <span className="ci-rev">出来高 {formatYen(t.revenue)}</span>
              </div>
            </div>
          </div>
        )
      })}
      {rows.length === 0 && <p className="empty">この工事の出来高表がありません</p>}

      <table className="day-grand">
        <tbody>
          <tr>
            <th>累計 出来高合計</th>
            <td className="c-num">{formatYen(grand.revenue)}</td>
            <th>累計 原価合計</th>
            <td className="c-num">{formatYen(grand.costTotal)}</td>
            <th className="day-grand-profit-th">累計 総利益</th>
            <td className="c-num day-grand-profit">{formatYen(grand.profit)}（{formatPercent(grand.margin)}）</td>
          </tr>
        </tbody>
      </table>

      <footer className="print-foot">
        <p className="print-footer-text">{data.settings.reportFooter}</p>
        <table className="print-stamps">
          <tbody>
            <tr>
              <th>作成</th><td className="stamp-cell" />
              <th>確認</th><td className="stamp-cell" />
              <th>承認</th><td className="stamp-cell" />
            </tr>
          </tbody>
        </table>
      </footer>
    </div>
  )
}
