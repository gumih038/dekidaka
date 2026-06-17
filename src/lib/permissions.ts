// ロール別権限マトリクス
import type { User, UserRole } from '../types/models'

export type Permission =
  | 'editSheets' // 出来高表の入力・編集
  | 'submitSheets' // 申請
  | 'approveSheets' // 承認
  | 'closeSheets' // 月次締め
  | 'editMasters' // マスター（会社/班/車両/単価/発注元/工事/予算）
  | 'manageUsers' // ユーザー管理
  | 'manageData' // バックアップ/リストア/初期化
  | 'viewReports' // 帳票・集計閲覧

const MATRIX: Record<UserRole, Permission[]> = {
  admin: [
    'editSheets',
    'submitSheets',
    'approveSheets',
    'closeSheets',
    'editMasters',
    'manageUsers',
    'manageData',
    'viewReports',
  ],
  keiri: ['editSheets', 'submitSheets', 'approveSheets', 'closeSheets', 'editMasters', 'manageData', 'viewReports'],
  genba: ['editSheets', 'submitSheets', 'viewReports'],
  viewer: ['viewReports'],
}

export function can(user: User | null, perm: Permission): boolean {
  if (!user) return false
  return MATRIX[user.role]?.includes(perm) ?? false
}
