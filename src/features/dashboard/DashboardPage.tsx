import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAppData, nameResolver } from '../../store/selectors'
import { calcSheet, sumTotals } from '../../lib/calc'
import {
  budgetVariance,
  companyTotals,
  monthlyTotals,
  projectProgress,
} from '../../lib/aggregate'
import { formatPercent, formatYearMonth, formatYen, yearMonthOf } from '../../lib/format'
import { Icon } from '../../components/Icon'
import './dashboard.css'

const ACCENT = '#1763d6'
const GREEN = '#0f8a4f'
const RED = '#d13b3b'
const PALETTE = ['#1763d6', '#0f8a4f', '#c77800', '#7c5cff', '#0b8aa6', '#d13b3b']

function thisYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function DashboardPage() {
  const data = useAppData()
  const companyName = nameResolver(data.companies)
  const ym = thisYearMonth()

  const monthSheets = useMemo(() => data.sheets.filter((s) => yearMonthOf(s.date) === ym), [data.sheets, ym])
  const monthTotals = useMemo(() => sumTotals(monthSheets.map((s) => calcSheet(s))), [monthSheets])
  const allTotals = useMemo(() => sumTotals(data.sheets.map((s) => calcSheet(s))), [data.sheets])

  const monthly = useMemo(
    () =>
      monthlyTotals(data.sheets)
        .slice(-8)
        .map((g) => ({ name: formatYearMonth(g.key), 売上: g.revenue, 原価: g.costTotal, 利益: g.profit })),
    [data.sheets],
  )

  const byCompany = useMemo(
    () => companyTotals(monthSheets, companyName).map((g) => ({ name: g.label, 利益: g.profit, 売上: g.revenue })),
    [monthSheets, companyName],
  )

  const overallBudget = useMemo(
    () => data.budgets.find((b) => b.scope === 'overall' && b.yearMonth === ym),
    [data.budgets, ym],
  )
  const variance = useMemo(() => budgetVariance(overallBudget, monthTotals), [overallBudget, monthTotals])

  const activeProjects = useMemo(
    () =>
      data.projects
        .filter((p) => p.status === 'active')
        .map((p) => projectProgress(p, data.sheets))
        .sort((a, b) => b.totals.revenue - a.totals.revenue)
        .slice(0, 6),
    [data.projects, data.sheets],
  )

  const budgetData = [
    { name: '売上', 予算: variance.revenueBudget, 実績: variance.revenueActual },
    { name: '原価', 予算: variance.costBudget, 実績: variance.costActual },
    { name: '利益', 予算: variance.profitBudget, 実績: variance.profitActual },
  ]

  return (
    <div className="page">
      <div className="kpi-grid">
        <KpiCard label={`当月売上（${formatYearMonth(ym)}）`} value={formatYen(monthTotals.revenue)} icon="yen" tone="accent" sub={`${monthSheets.length}件の出来高`} />
        <KpiCard label="当月原価" value={formatYen(monthTotals.costTotal)} icon="truck" tone="neutral" sub={`人件費 ${formatYen(monthTotals.laborCost)}`} />
        <KpiCard label="当月 総利益" value={formatYen(monthTotals.profit)} icon="dashboard" tone={monthTotals.profit >= 0 ? 'profit' : 'loss'} sub={`利益率 ${formatPercent(monthTotals.margin)}`} />
        <KpiCard label="予算達成率（利益）" value={formatPercent(variance.profitRate)} icon="check" tone="neutral" sub={overallBudget ? `予算 ${formatYen(variance.profitBudget)}` : '当月予算 未設定'} />
        <KpiCard label="累計 総利益" value={formatYen(allTotals.profit)} icon="reports" tone={allTotals.profit >= 0 ? 'profit' : 'loss'} sub={`全${data.sheets.length}件 / 利益率 ${formatPercent(allTotals.margin)}`} />
      </div>

      <div className="dash-grid">
        <section className="card dash-wide">
          <header className="card-head"><h3>月次推移（売上・原価・利益）</h3></header>
          <div className="card-body chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={monthly} margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
                <CartesianGrid stroke="#e5eaf2" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 10000)}万`} tick={{ fontSize: 11 }} width={48} />
                <Tooltip formatter={(value) => formatYen(Number(value))} />
                <Legend />
                <Bar dataKey="売上" fill={ACCENT} radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Bar dataKey="原価" fill="#b9c2d4" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Line dataKey="利益" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <header className="card-head"><h3>当月 予実比較</h3></header>
          <div className="card-body chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={budgetData} margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
                <CartesianGrid stroke="#e5eaf2" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 10000)}万`} tick={{ fontSize: 11 }} width={48} />
                <Tooltip formatter={(value) => formatYen(Number(value))} />
                <Legend />
                <Bar dataKey="予算" fill="#b9c2d4" radius={[3, 3, 0, 0]} maxBarSize={26} />
                <Bar dataKey="実績" fill={ACCENT} radius={[3, 3, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <header className="card-head"><h3>当月 会社別 利益</h3></header>
          <div className="card-body chart-body">
            {byCompany.length === 0 ? (
              <p className="empty">当月のデータがありません</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byCompany} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid stroke="#e5eaf2" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 10000)}万`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatYen(Number(value))} />
                  <Bar dataKey="利益" radius={[0, 3, 3, 0]} maxBarSize={26}>
                    {byCompany.map((d, i) => (
                      <Cell key={i} fill={d.利益 >= 0 ? PALETTE[i % PALETTE.length] : RED} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card dash-wide">
          <header className="card-head"><h3>進行中の工事 進捗</h3></header>
          <div className="em-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>工番 / 工事名</th>
                  <th className="right">契約金額</th>
                  <th className="right">累積出来高</th>
                  <th>進捗率</th>
                  <th className="right">工事利益</th>
                </tr>
              </thead>
              <tbody>
                {activeProjects.map(({ project, totals, progress }) => {
                  const pct = Math.min(100, Math.max(0, progress))
                  return (
                    <tr key={project.id}>
                      <td><code>{project.code}</code> {project.name}</td>
                      <td className="right num">{formatYen(project.contractAmount)}</td>
                      <td className="right num">{formatYen(totals.revenue)}</td>
                      <td>
                        <div className="progress-cell">
                          <div className="progress-bar"><span style={{ width: `${pct}%` }} /></div>
                          <span className="progress-pct num">{formatPercent(progress)}</span>
                        </div>
                      </td>
                      <td className={`right num ${totals.profit >= 0 ? 'profit' : 'loss'}`}>{formatYen(totals.profit)}</td>
                    </tr>
                  )
                })}
                {activeProjects.length === 0 && <tr><td colSpan={5} className="empty">進行中の工事がありません</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: Parameters<typeof Icon>[0]['name']
  tone: 'accent' | 'profit' | 'loss' | 'neutral'
}

function KpiCard({ label, value, sub, icon, tone }: KpiCardProps) {
  return (
    <div className={`kpi-card kpi-${tone}`}>
      <div className="kpi-icon"><Icon name={icon} size={20} /></div>
      <div className="kpi-meta">
        <span className="kpi-label">{label}</span>
        <strong className="kpi-value num">{value}</strong>
        {sub && <span className="kpi-sub">{sub}</span>}
      </div>
    </div>
  )
}
