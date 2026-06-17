import { useMemo, useState } from 'react'
import { useUiStore } from '../../store/useUiStore'
import { useAppData, nameResolver } from '../../store/selectors'
import {
  companyTotals,
  monthlyTotals,
  projectProgress,
  type GroupTotals,
} from '../../lib/aggregate'
import { formatDate, formatPercent, formatYearMonth, formatYen } from '../../lib/format'
import { exportCsv } from '../../lib/excel'
import { Icon } from '../../components/Icon'
import { SheetPrint } from '../print/SheetPrint'
import '../../styles/print.css'
import './reports.css'

type Tab = 'sheet' | 'monthly' | 'company' | 'project'

const TABS: { key: Tab; label: string }[] = [
  { key: 'sheet', label: '出来高報告書（印刷）' },
  { key: 'monthly', label: '月次集計' },
  { key: 'company', label: '会社別集計' },
  { key: 'project', label: '工事別損益' },
]

export function ReportsPage() {
  const data = useAppData()
  const printSheetId = useUiStore((s) => s.printSheetId)
  const notify = useUiStore((s) => s.notify)
  const [tab, setTab] = useState<Tab>(printSheetId ? 'sheet' : 'monthly')
  const companyName = nameResolver(data.companies)

  const sortedSheets = useMemo(
    () => [...data.sheets].sort((a, b) => b.date.localeCompare(a.date)),
    [data.sheets],
  )
  const [selectedId, setSelectedId] = useState(printSheetId ?? sortedSheets[0]?.id ?? '')
  const selected = data.sheets.find((s) => s.id === selectedId)

  function printNow() {
    document.body.classList.add('printing')
    const cleanup = () => {
      document.body.classList.remove('printing')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    // レンダリング反映後に印刷ダイアログを開く
    setTimeout(() => window.print(), 60)
    // afterprint が来ない環境向けの保険
    setTimeout(cleanup, 4000)
  }

  return (
    <div className="page">
      <nav className="tabs" aria-label="帳票種別">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'sheet' && (
        <section className="card">
          <header className="card-head no-print">
            <div className="field reports-select">
              <label>印刷する出来高表</label>
              <select className="select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {sortedSheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDate(s.date)} ／ {companyName(s.companyId)} ／ {s.siteName || '現場未設定'}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary btn-lg" onClick={printNow} disabled={!selected}>
              <Icon name="print" size={18} /> 印刷する / PDFで保存
            </button>
          </header>
          <div className="card-body">
            <p className="muted no-print reports-hint">
              「印刷する」を押すと印刷画面が開きます。紙に印刷する場合はプリンターを、PDFで保存したい場合は
              送信先（プリンター）から「Microsoft Print to PDF」や「PDF」を選んでください。
            </p>
            {selected ? (
              <div className="print-preview print-area">
                <SheetPrint sheet={selected} />
              </div>
            ) : (
              <p className="empty">出来高表がありません</p>
            )}
          </div>
        </section>
      )}

      {tab === 'monthly' && (
        <SummaryTable
          title="月次集計表"
          rows={monthlyTotals(data.sheets)}
          labelHeader="年月"
          labelOf={(g) => formatYearMonth(g.key)}
          onExport={() =>
            exportCsv(
              '月次集計.csv',
              ['年月', '件数', '売上', '原価', '利益', '利益率%'],
              monthlyTotals(data.sheets).map((g) => [formatYearMonth(g.key), g.count, g.revenue, g.costTotal, g.profit, g.margin.toFixed(1)]),
            ).then(() => notify('月次集計をCSV出力しました'))
          }
        />
      )}

      {tab === 'company' && (
        <SummaryTable
          title="会社別集計"
          rows={companyTotals(data.sheets, companyName)}
          labelHeader="会社"
          labelOf={(g) => g.label}
          onExport={() =>
            exportCsv(
              '会社別集計.csv',
              ['会社', '件数', '売上', '原価', '利益', '利益率%'],
              companyTotals(data.sheets, companyName).map((g) => [g.label, g.count, g.revenue, g.costTotal, g.profit, g.margin.toFixed(1)]),
            ).then(() => notify('会社別集計をCSV出力しました'))
          }
        />
      )}

      {tab === 'project' && <ProjectReport />}
    </div>
  )
}

interface SummaryTableProps {
  title: string
  rows: GroupTotals[]
  labelHeader: string
  labelOf: (g: GroupTotals) => string
  onExport: () => void
}

function SummaryTable({ title, rows, labelHeader, labelOf, onExport }: SummaryTableProps) {
  const totalRevenue = rows.reduce((a, g) => a + g.revenue, 0)
  const totalCost = rows.reduce((a, g) => a + g.costTotal, 0)
  const totalProfit = rows.reduce((a, g) => a + g.profit, 0)
  return (
    <section className="card">
      <header className="card-head">
        <h3>{title}</h3>
        <button className="btn btn-sm" onClick={onExport}><Icon name="download" size={15} /> CSV出力</button>
      </header>
      <div className="em-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{labelHeader}</th>
              <th className="right">件数</th>
              <th className="right">売上</th>
              <th className="right">原価</th>
              <th className="right">利益</th>
              <th className="right">利益率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.key}>
                <td><strong>{labelOf(g)}</strong></td>
                <td className="right num">{g.count}</td>
                <td className="right num">{formatYen(g.revenue)}</td>
                <td className="right num">{formatYen(g.costTotal)}</td>
                <td className={`right num ${g.profit >= 0 ? 'profit' : 'loss'}`}>{formatYen(g.profit)}</td>
                <td className="right num">{formatPercent(g.margin)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="empty">データがありません</td></tr>}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td>合計</td>
                <td className="right num">{rows.reduce((a, g) => a + g.count, 0)}</td>
                <td className="right num">{formatYen(totalRevenue)}</td>
                <td className="right num">{formatYen(totalCost)}</td>
                <td className={`right num ${totalProfit >= 0 ? 'profit' : 'loss'}`}>{formatYen(totalProfit)}</td>
                <td className="right num">{formatPercent(totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  )
}

function ProjectReport() {
  const data = useAppData()
  const notify = useUiStore((s) => s.notify)
  const rows = data.projects.map((p) => projectProgress(p, data.sheets))

  return (
    <section className="card">
      <header className="card-head">
        <h3>工事別損益</h3>
        <button
          className="btn btn-sm"
          onClick={() =>
            exportCsv(
              '工事別損益.csv',
              ['工番', '工事名', '契約金額', '累積出来高', '進捗率%', '原価', '利益', '利益率%'],
              rows.map((r) => [
                r.project.code,
                r.project.name,
                r.project.contractAmount,
                r.totals.revenue,
                r.progress.toFixed(1),
                r.totals.costTotal,
                r.totals.profit,
                r.totals.margin.toFixed(1),
              ]),
            ).then(() => notify('工事別損益をCSV出力しました'))
          }
        >
          <Icon name="download" size={15} /> CSV出力
        </button>
      </header>
      <div className="em-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>工番 / 工事名</th>
              <th className="right">契約金額</th>
              <th className="right">累積出来高</th>
              <th className="right">進捗率</th>
              <th className="right">原価</th>
              <th className="right">利益</th>
              <th className="right">利益率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.project.id}>
                <td><code>{r.project.code}</code> {r.project.name}</td>
                <td className="right num">{formatYen(r.project.contractAmount)}</td>
                <td className="right num">{formatYen(r.totals.revenue)}</td>
                <td className="right num">{formatPercent(r.progress)}</td>
                <td className="right num">{formatYen(r.totals.costTotal)}</td>
                <td className={`right num ${r.totals.profit >= 0 ? 'profit' : 'loss'}`}>{formatYen(r.totals.profit)}</td>
                <td className="right num">{formatPercent(r.totals.margin)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="empty">工事がありません</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
