// ===========================================================================
// 出来高表アプリ — データモデル定義
// 1台PC集中管理 / 単一JSONデータファイルを全件メモリ保持し、集計はTSで実行する。
// ===========================================================================

/** 現在のデータスキーマ版（マイグレーション判定用） */
export const DATA_VERSION = 1

// --- 列挙 ---------------------------------------------------------------

/** ユーザー権限ロール */
export type UserRole = 'admin' | 'keiri' | 'genba' | 'viewer'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理者',
  keiri: '経理',
  genba: '現場責任者',
  viewer: '閲覧のみ',
}

/** 出来高項目の区分 */
export type RateCategory = 'sign' | 'board' | 'other'

export const RATE_CATEGORY_LABELS: Record<RateCategory, string> = {
  sign: '標識',
  board: '板',
  other: 'その他',
}

/** 出来高表の状態（承認ワークフロー / 締め） */
export type SheetStatus = 'draft' | 'submitted' | 'approved' | 'closed'

export const SHEET_STATUS_LABELS: Record<SheetStatus, string> = {
  draft: '下書き',
  submitted: '申請中',
  approved: '承認済',
  closed: '締め済',
}

/** 工事の状態 */
export type ProjectStatus = 'planned' | 'active' | 'completed' | 'suspended'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: '予定',
  active: '進行中',
  completed: '完了',
  suspended: '中断',
}

/** 予算の対象種別 */
export type BudgetScope = 'company' | 'project' | 'overall'

// --- 基盤 / 権限 --------------------------------------------------------

export interface User {
  id: string
  name: string
  loginId: string
  /** 簡易ハッシュ（ローカル保存モードのみ・SHA-256）。Supabaseモードではパスワードは Auth が管理 */
  passwordHash?: string
  role: UserRole
  active: boolean
  createdAt: string
}

export interface AuditLog {
  id: string
  at: string
  userId: string
  userName: string
  action: string
  target: string
  detail?: string
}

/** key-value のアプリ設定（日当・自社情報・会計期首 等） */
export interface AppSettings {
  /** 1人あたり日当（円） */
  dailyWage: number
  /** 会計年度の期首月（1-12） */
  fiscalStartMonth: number
  /** 帳票の備考フッター */
  reportFooter: string
}

// --- マスター -----------------------------------------------------------

/** 会社（合同会社のメンバー社） */
export interface Company {
  id: string
  name: string
  /** ロゴ画像（dataURL base64） */
  logo?: string
  /** 住所・電話等の自社情報（帳票ヘッダー用） */
  address?: string
  tel?: string
  /** 持分メモ（任意） */
  shareNote?: string
  active: boolean
}

/** 施工班 */
export interface Team {
  id: string
  name: string
  note?: string
  active: boolean
}

/** 施工車両（日額コスト付き） */
export interface Vehicle {
  id: string
  name: string
  /** 1日あたりコスト（リース/減価償却等、円） */
  dailyCost: number
  note?: string
  active: boolean
}

/** 単価マスター（標識/板/その他） */
export interface RateItem {
  id: string
  name: string
  category: RateCategory
  /** 1本/1枚あたり単価（円） */
  unitPrice: number
  /** 単位表記（本・枚 等） */
  unit: string
  active: boolean
}

/** 発注元（取引先） */
export interface Client {
  id: string
  name: string
  contact?: string
  tel?: string
  active: boolean
}

/** 工事台帳 */
export interface Project {
  id: string
  /** 工番 */
  code: string
  name: string
  clientId?: string
  site?: string
  startDate?: string
  endDate?: string
  /** 契約金額（円） */
  contractAmount: number
  status: ProjectStatus
  note?: string
}

/** 予算（予実管理） */
export interface Budget {
  id: string
  scope: BudgetScope
  /** scope=company の会社ID / scope=project の工事ID（overall は空） */
  refId?: string
  /** 対象年月（YYYY-MM）。年間予算は空も可 */
  yearMonth?: string
  revenue: number
  cost: number
  profit: number
}

// --- 日次トランザクション ----------------------------------------------

/** 出来高明細（単価マスターからのスナップショット） */
export interface SheetLineItem {
  id: string
  rateItemId: string
  name: string
  category: RateCategory
  unitPrice: number
  quantity: number
  unit: string
}

/** 使用車両（車両マスターからのスナップショット） */
export interface SheetVehicle {
  vehicleId: string
  name: string
  dailyCost: number
}

/** 1日分の出来高表 */
export interface DailySheet {
  id: string
  /** YYYY-MM-DD */
  date: string
  companyId: string
  projectId?: string
  teamId?: string
  siteName: string
  /** 人数（人件費計算用） */
  headcount: number
  /** 高速代（実費・円） */
  tollCost: number
  /** 燃料代（実費・円） */
  fuelCost: number
  note?: string
  lineItems: SheetLineItem[]
  vehicles: SheetVehicle[]
  /** 計算時点の日当（スナップショット） */
  dailyWageSnapshot: number
  status: SheetStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  approvedBy?: string
  approvedAt?: string
}

// --- データ全体（永続化スナップショット） -----------------------------

export interface AppData {
  version: number
  users: User[]
  companies: Company[]
  teams: Team[]
  vehicles: Vehicle[]
  rateItems: RateItem[]
  clients: Client[]
  projects: Project[]
  budgets: Budget[]
  sheets: DailySheet[]
  auditLogs: AuditLog[]
  settings: AppSettings
}
