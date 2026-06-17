import { useMemo } from 'react'
import { useAppData, nameResolver } from '../../store/selectors'
import { calcSheet, lineAmount, sumTotals } from '../../lib/calc'
import { formatDate, formatPercent, formatYen } from '../../lib/format'
import { RATE_CATEGORY_LABELS, type DailySheet } from '../../types/models'

interface DayPrintProps {
  date: string
  companyId: string
}

/** 1日分の全件名を1枚にまとめた日報（A4横・Excel風）。 */
export function DayPrint({ date, companyId }: DayPrintProps) {
  const data = useAppData()
  const company = data.companies.find((c) => c.id === companyId)
  const projectName = nameResolver(data.projects.map((p) => ({ id: p.id, name: `${p.code} ${p.name}` })))
  const teamName = nameResolver(data.teams)

  const jobs = useMemo(
    () =>
      data.sheets
        .filter((s) => s.date === date && s.companyId === companyId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data.sheets, date, companyId],
  )
  const grand = useMemo(() => sumTotals(jobs.map((j) => calcSheet(j))), [jobs])

  return (
    <div className="print-sheet day-print">
      <header className="print-head">
        <div className="print-company">
          {company?.logo && <img src={company.logo} alt="" className="print-logo" />}
          <div>
            <h1 className="print-company-name">{company?.name ?? '—'}</h1>
            {company?.address && <p className="print-company-sub">{company.address}</p>}
            {company?.tel && <p className="print-company-sub">TEL {company.tel}</p>}
          </div>
        </div>
        <div className="print-title-block">
          <h2 className="print-title">出 来 高 日 報</h2>
          <table className="print-meta">
            <tbody>
              <tr><th>日付</th><td>{formatDate(date)}</td></tr>
              <tr><th>件名数</th><td>{jobs.length} 件</td></tr>
            </tbody>
          </table>
        </div>
      </header>

      {jobs.map((job, idx) => (
        <DayJobBlock key={job.id} job={job} index={idx} projectName={projectName} teamName={teamName} />
      ))}
      {jobs.length === 0 && <p className="empty">この日の出来高表がありません</p>}

      {/* 1日の総合計 */}
      <table className="day-grand">
        <tbody>
          <tr>
            <th>1日 出来高合計（売上）</th>
            <td className="c-num">{formatYen(grand.revenue)}</td>
            <th>1日 原価合計</th>
            <td className="c-num">{formatYen(grand.costTotal)}</td>
            <th className="day-grand-profit-th">1日 総利益</th>
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

interface DayJobBlockProps {
  job: DailySheet
  index: number
  projectName: (id?: string) => string
  teamName: (id?: string) => string
}

function DayJobBlock({ job, index, projectName, teamName }: DayJobBlockProps) {
  const t = calcSheet(job)
  return (
    <div className="day-job">
      <div className="day-job-head">
        <span className="day-job-no">{index + 1}</span>
        <span className="day-job-site">{job.siteName || '（現場名なし）'}</span>
        <span className="day-job-meta">
          {job.projectId ? `工事:${projectName(job.projectId)}` : ''} {job.teamId ? `／ 班:${teamName(job.teamId)}` : ''}
        </span>
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
}
