// 集計ロジック（日次/月次・会社別/工事別/班別・累積出来高・予実）純関数
import type { Budget, DailySheet, Project } from '../types/models'
import { calcSheet, sumTotals, type SheetTotals } from './calc'
import { yearMonthOf } from './format'

/** 集計の1グループ（キー + 合計） */
export interface GroupTotals extends SheetTotals {
  key: string
  label: string
  count: number
}

/** シート配列を totals に変換 */
function totalsOf(sheets: DailySheet[]): SheetTotals {
  return sumTotals(sheets.map((s) => calcSheet(s)))
}

/** 汎用グループ集計 */
export function groupBy(
  sheets: DailySheet[],
  keyOf: (s: DailySheet) => string,
  labelOf: (key: string) => string,
): GroupTotals[] {
  const map = new Map<string, DailySheet[]>()
  for (const s of sheets) {
    const k = keyOf(s)
    const arr = map.get(k)
    if (arr) arr.push(s)
    else map.set(k, [s])
  }
  return Array.from(map.entries())
    .map(([key, list]) => ({ key, label: labelOf(key), count: list.length, ...totalsOf(list) }))
    .sort((a, b) => b.revenue - a.revenue)
}

/** 月次集計（YYYY-MM 昇順） */
export function monthlyTotals(sheets: DailySheet[]): GroupTotals[] {
  return groupBy(
    sheets,
    (s) => yearMonthOf(s.date),
    (k) => k,
  ).sort((a, b) => a.key.localeCompare(b.key))
}

/** 会社別集計 */
export function companyTotals(
  sheets: DailySheet[],
  labelOf: (id: string) => string,
): GroupTotals[] {
  return groupBy(sheets, (s) => s.companyId, labelOf)
}

/** 工事別集計 */
export function projectTotals(
  sheets: DailySheet[],
  labelOf: (id: string) => string,
): GroupTotals[] {
  return groupBy(sheets, (s) => s.projectId ?? '(未割当)', (k) =>
    k === '(未割当)' ? k : labelOf(k),
  )
}

/** 班別集計 */
export function teamTotals(sheets: DailySheet[], labelOf: (id: string) => string): GroupTotals[] {
  return groupBy(sheets, (s) => s.teamId ?? '(未割当)', (k) =>
    k === '(未割当)' ? k : labelOf(k),
  )
}

/** 工事の進捗（累積出来高 vs 契約金額） */
export interface ProjectProgress {
  project: Project
  totals: SheetTotals
  /** 進捗率(%) = 累積出来高 / 契約金額 × 100 */
  progress: number
}

export function projectProgress(project: Project, sheets: DailySheet[]): ProjectProgress {
  const related = sheets.filter((s) => s.projectId === project.id)
  const totals = totalsOf(related)
  const progress =
    project.contractAmount > 0 ? (totals.revenue / project.contractAmount) * 100 : 0
  return { project, totals, progress }
}

/** 予実差異 */
export interface BudgetVariance {
  revenueBudget: number
  costBudget: number
  profitBudget: number
  revenueActual: number
  costActual: number
  profitActual: number
  /** 達成率(%)（売上ベース） */
  revenueRate: number
  profitRate: number
}

export function budgetVariance(budget: Budget | undefined, actual: SheetTotals): BudgetVariance {
  const b = budget ?? { revenue: 0, cost: 0, profit: 0 }
  return {
    revenueBudget: b.revenue,
    costBudget: b.cost,
    profitBudget: b.profit,
    revenueActual: actual.revenue,
    costActual: actual.costTotal,
    profitActual: actual.profit,
    revenueRate: b.revenue > 0 ? (actual.revenue / b.revenue) * 100 : 0,
    profitRate: b.profit > 0 ? (actual.profit / b.profit) * 100 : 0,
  }
}

/** 期間フィルタ（YYYY-MM-DD inclusive） */
export function filterByPeriod(sheets: DailySheet[], from?: string, to?: string): DailySheet[] {
  return sheets.filter((s) => (!from || s.date >= from) && (!to || s.date <= to))
}
