// 表示用フォーマッタ（通貨・パーセント・日付）

const yenFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 })

/** 円表記（¥1,234,567） */
export function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value || 0))
}

/** 桁区切りのみ（1,234） */
export function formatNumber(value: number): string {
  return numberFormatter.format(value || 0)
}

/** パーセント（小数1桁） */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${value.toFixed(1)}%`
}

/** YYYY-MM-DD → 2026/06/16（曜日付き） */
export function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}（${w}）`
}

/** YYYY-MM → 2026年6月 */
export function formatYearMonth(ym: string): string {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `${y}年${Number(m)}月`
}

/** 今日の YYYY-MM-DD（ローカル） */
export function todayIso(): string {
  return toIsoDate(new Date())
}

/** Date → YYYY-MM-DD（ローカルタイムゾーン） */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** YYYY-MM-DD → YYYY-MM */
export function yearMonthOf(iso: string): string {
  return iso.slice(0, 7)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
