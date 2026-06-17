import { useAppData, nameResolver } from '../../store/selectors'
import { calcSheet, lineAmount } from '../../lib/calc'
import { formatDate, formatPercent, formatYen } from '../../lib/format'
import { RATE_CATEGORY_LABELS, type DailySheet } from '../../types/models'

/** A4 出来高報告書（Excel風グリッド）。print.css と組で使用。 */
export function SheetPrint({ sheet }: { sheet: DailySheet }) {
  const data = useAppData()
  const company = data.companies.find((c) => c.id === sheet.companyId)
  const projectName = nameResolver(data.projects.map((p) => ({ id: p.id, name: `${p.code} ${p.name}` })))
  const teamName = nameResolver(data.teams)
  const t = calcSheet(sheet)

  return (
    <div className="print-sheet">
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
          <h2 className="print-title">出 来 高 報 告 書</h2>
          <table className="print-meta">
            <tbody>
              <tr><th>日付</th><td>{formatDate(sheet.date)}</td></tr>
              <tr><th>工番</th><td>{sheet.projectId ? projectName(sheet.projectId) : '—'}</td></tr>
              <tr><th>施工班</th><td>{teamName(sheet.teamId)}</td></tr>
            </tbody>
          </table>
        </div>
      </header>

      <div className="print-siterow">
        <span className="print-site-label">現場名</span>
        <span className="print-site-value">{sheet.siteName || '—'}</span>
      </div>

      <table className="print-table">
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
          {sheet.lineItems.map((l, i) => (
            <tr key={l.id}>
              <td className="c-no">{i + 1}</td>
              <td>{l.name}</td>
              <td className="c-cat">{RATE_CATEGORY_LABELS[l.category]}</td>
              <td className="c-num">{formatYen(l.unitPrice)}</td>
              <td className="c-qty">{l.quantity} {l.unit}</td>
              <td className="c-num">{formatYen(lineAmount(l))}</td>
            </tr>
          ))}
          {padRows(sheet.lineItems.length).map((_, i) => (
            <tr key={`pad-${i}`} className="print-pad">
              <td className="c-no">&nbsp;</td><td /><td /><td /><td /><td />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="print-total-label">出来高合計（売上）</td>
            <td className="c-num print-total">{formatYen(t.revenue)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="print-bottom">
        <table className="print-cost">
          <thead><tr><th colSpan={2}>原価内訳</th></tr></thead>
          <tbody>
            <tr><th>人件費（{sheet.headcount}人 × {formatYen(sheet.dailyWageSnapshot)}）</th><td className="c-num">{formatYen(t.laborCost)}</td></tr>
            <tr><th>高速代</th><td className="c-num">{formatYen(t.tollCost)}</td></tr>
            <tr><th>燃料代</th><td className="c-num">{formatYen(t.fuelCost)}</td></tr>
            <tr><th>車両費（{sheet.vehicles.length}台）</th><td className="c-num">{formatYen(t.vehicleCost)}</td></tr>
            <tr className="print-cost-total"><th>原価合計</th><td className="c-num">{formatYen(t.costTotal)}</td></tr>
          </tbody>
        </table>

        <table className="print-summary">
          <tbody>
            <tr><th>出来高（売上）</th><td className="c-num">{formatYen(t.revenue)}</td></tr>
            <tr><th>原価合計</th><td className="c-num">{formatYen(t.costTotal)}</td></tr>
            <tr className="print-profit">
              <th>総利益</th>
              <td className="c-num">{formatYen(t.profit)}</td>
            </tr>
            <tr><th>利益率</th><td className="c-num">{formatPercent(t.margin)}</td></tr>
          </tbody>
        </table>
      </div>

      {sheet.note && <p className="print-note">備考：{sheet.note}</p>}

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

const MIN_ROWS = 12
function padRows(count: number): number[] {
  const n = Math.max(0, MIN_ROWS - count)
  return Array.from({ length: n }, (_, i) => i)
}
