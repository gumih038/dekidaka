// 初回起動時のデモ初期データ（標識施工会社の現実的なサンプル）。
// 全マスター＋直近2か月の出来高表を投入し、ダッシュボード/集計をすぐ体感できるようにする。
import type {
  AppData,
  Budget,
  Company,
  DailySheet,
  Project,
  RateItem,
  Team,
  Vehicle,
} from '../types/models'
import { DATA_VERSION } from '../types/models'
import { sha256, uid } from '../lib/hash'
import { toIsoDate } from '../lib/format'

const DEFAULT_WAGE = 18000

export async function buildSeedData(): Promise<AppData> {
  const adminHash = await sha256('admin')
  const userHash = await sha256('1234')
  const now = new Date()

  const companies: Company[] = [
    { id: 'co-1', name: '第一標識工業 合同会社', tel: '03-1234-5678', address: '東京都江東区豊洲1-1-1', shareNote: '持分 50%', active: true },
    { id: 'co-2', name: '関東サイン施工', tel: '048-222-3333', address: '埼玉県さいたま市大宮区桜木町2-2', shareNote: '持分 30%', active: true },
    { id: 'co-3', name: '東日本ロードテック', tel: '045-777-8888', address: '神奈川県横浜市西区みなとみらい3-3', shareNote: '持分 20%', active: true },
  ]

  const teams: Team[] = [
    { id: 'tm-1', name: 'A班（設置）', note: '新設・建込み', active: true },
    { id: 'tm-2', name: 'B班（撤去）', note: '撤去・復旧', active: true },
    { id: 'tm-3', name: 'C班（メンテ）', note: '点検・補修', active: true },
  ]

  const vehicles: Vehicle[] = [
    { id: 've-1', name: '2tダンプ（品川100あ11-11）', dailyCost: 6000, active: true },
    { id: 've-2', name: '高所作業車（品川100か22-22）', dailyCost: 12000, active: true },
    { id: 've-3', name: 'ユニック車（大宮800さ33-33）', dailyCost: 9000, active: true },
    { id: 've-4', name: '軽トラ（横浜480す44-44）', dailyCost: 3000, active: true },
  ]

  const rateItems: RateItem[] = [
    { id: 'ra-1', name: '規制標識 設置', category: 'sign', unitPrice: 8000, unit: '本', active: true },
    { id: 'ra-2', name: '案内標識 設置', category: 'sign', unitPrice: 12000, unit: '本', active: true },
    { id: 'ra-3', name: '警戒標識 設置', category: 'sign', unitPrice: 9000, unit: '本', active: true },
    { id: 'ra-4', name: '標識 撤去', category: 'sign', unitPrice: 5000, unit: '本', active: true },
    { id: 'ra-5', name: '標識板 交換（小）', category: 'board', unitPrice: 6000, unit: '枚', active: true },
    { id: 'ra-6', name: '標識板 交換（大）', category: 'board', unitPrice: 15000, unit: '枚', active: true },
    { id: 'ra-7', name: '支柱建込み', category: 'other', unitPrice: 7000, unit: '本', active: true },
    { id: 'ra-8', name: '基礎コンクリート', category: 'other', unitPrice: 11000, unit: '基', active: true },
  ]

  const clients = [
    { id: 'cl-1', name: '東京都建設局', contact: '管理課', tel: '03-5000-0000', active: true },
    { id: 'cl-2', name: '○○建設株式会社', contact: '工事部', tel: '03-6000-0000', active: true },
    { id: 'cl-3', name: 'NEXCO東日本', contact: '保全課', tel: '048-600-0000', active: true },
  ]

  const projects: Project[] = [
    { id: 'pr-1', code: '2026-001', name: '都道○号線 標識更新工事', clientId: 'cl-1', site: '江東区', startDate: iso(now, -50), endDate: iso(now, 40), contractAmount: 8_500_000, status: 'active' },
    { id: 'pr-2', code: '2026-002', name: '国道△号 案内標識新設', clientId: 'cl-3', site: 'さいたま市', startDate: iso(now, -30), endDate: iso(now, 60), contractAmount: 12_000_000, status: 'active' },
    { id: 'pr-3', code: '2025-088', name: '市道 標識撤去・復旧', clientId: 'cl-2', site: '横浜市', startDate: iso(now, -90), endDate: iso(now, -10), contractAmount: 4_200_000, status: 'completed' },
  ]

  const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const thisMonth = ym(now)
  const prevMonth = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  const budgets: Budget[] = [
    { id: uid(), scope: 'company', refId: 'co-1', yearMonth: thisMonth, revenue: 4_000_000, cost: 2_800_000, profit: 1_200_000 },
    { id: uid(), scope: 'company', refId: 'co-2', yearMonth: thisMonth, revenue: 2_500_000, cost: 1_800_000, profit: 700_000 },
    { id: uid(), scope: 'company', refId: 'co-3', yearMonth: thisMonth, revenue: 1_500_000, cost: 1_100_000, profit: 400_000 },
    { id: uid(), scope: 'overall', yearMonth: thisMonth, revenue: 8_000_000, cost: 5_700_000, profit: 2_300_000 },
    { id: uid(), scope: 'overall', yearMonth: prevMonth, revenue: 7_000_000, cost: 5_000_000, profit: 2_000_000 },
  ]

  const sheets = buildSheets(now, companies, teams, vehicles, rateItems, projects)

  return {
    version: DATA_VERSION,
    settings: { dailyWage: DEFAULT_WAGE, fiscalStartMonth: 4, reportFooter: '上記のとおり相違ありません。' },
    users: [
      { id: 'us-1', name: '管理者', loginId: 'admin', passwordHash: adminHash, role: 'admin', active: true, createdAt: now.toISOString() },
      { id: 'us-2', name: '経理 花子', loginId: 'keiri', passwordHash: userHash, role: 'keiri', active: true, createdAt: now.toISOString() },
      { id: 'us-3', name: '現場 太郎', loginId: 'genba', passwordHash: userHash, role: 'genba', active: true, createdAt: now.toISOString() },
    ],
    companies,
    teams,
    vehicles,
    rateItems,
    clients,
    projects,
    budgets,
    sheets,
    auditLogs: [],
  }
}

/** 空のデータ（初期化・全削除用） */
export async function buildEmptyData(): Promise<AppData> {
  const adminHash = await sha256('admin')
  return {
    version: DATA_VERSION,
    settings: { dailyWage: DEFAULT_WAGE, fiscalStartMonth: 4, reportFooter: '上記のとおり相違ありません。' },
    users: [
      { id: 'us-1', name: '管理者', loginId: 'admin', passwordHash: adminHash, role: 'admin', active: true, createdAt: new Date().toISOString() },
    ],
    companies: [],
    teams: [],
    vehicles: [],
    rateItems: [],
    clients: [],
    projects: [],
    budgets: [],
    sheets: [],
    auditLogs: [],
  }
}

// --- 内部ヘルパ --------------------------------------------------------

function iso(base: Date, offsetDays: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + offsetDays)
  return toIsoDate(d)
}

function buildSheets(
  now: Date,
  companies: Company[],
  teams: Team[],
  vehicles: Vehicle[],
  rateItems: RateItem[],
  projects: Project[],
): DailySheet[] {
  const sheets: DailySheet[] = []
  // 直近45日のうち平日中心に約28枚を生成
  let count = 0
  for (let offset = -45; offset <= 0 && count < 28; offset++) {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    const dow = d.getDay()
    if (dow === 0) continue // 日曜は休み
    if (offset % 2 !== 0 && dow !== 6) continue // 間引き
    const company = companies[count % companies.length]
    const team = teams[count % teams.length]
    const project = projects[count % projects.length]
    const date = toIsoDate(d)

    const r1 = rateItems[count % rateItems.length]
    const r2 = rateItems[(count + 3) % rateItems.length]
    const qty1 = 4 + (count % 8)
    const qty2 = 1 + (count % 4)

    const usedVehicles = vehicles.slice(0, 1 + (count % 3)).map((v) => ({
      vehicleId: v.id,
      name: v.name,
      dailyCost: v.dailyCost,
    }))

    const status = offset < -20 ? 'closed' : offset < -7 ? 'approved' : offset < -2 ? 'submitted' : 'draft'

    sheets.push({
      id: uid(),
      date,
      companyId: company.id,
      projectId: project.id,
      teamId: team.id,
      siteName: `${project.site} 現場`,
      headcount: 2 + (count % 4),
      tollCost: 1500 + (count % 5) * 600,
      fuelCost: 2500 + (count % 4) * 800,
      note: '',
      lineItems: [
        { id: uid(), rateItemId: r1.id, name: r1.name, category: r1.category, unitPrice: r1.unitPrice, quantity: qty1, unit: r1.unit },
        { id: uid(), rateItemId: r2.id, name: r2.name, category: r2.category, unitPrice: r2.unitPrice, quantity: qty2, unit: r2.unit },
      ],
      vehicles: usedVehicles,
      dailyWageSnapshot: DEFAULT_WAGE,
      status,
      createdBy: 'us-3',
      createdAt: d.toISOString(),
      updatedAt: d.toISOString(),
      approvedBy: status === 'approved' || status === 'closed' ? 'us-1' : undefined,
      approvedAt: status === 'approved' || status === 'closed' ? d.toISOString() : undefined,
    })
    count++
  }
  return sheets
}
