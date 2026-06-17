// Supabase 保存モードのデータアクセス層。
// 業務データは documents(collection,id,doc) に、ユーザーは profiles に保持する。
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createTempClient, getSupabase, loginIdToEmail } from './supabase'
import {
  DATA_VERSION,
  type AppData,
  type AppSettings,
  type AuditLog,
  type User,
  type UserRole,
} from '../types/models'

const DEFAULT_SETTINGS: AppSettings = { dailyWage: 18000, fiscalStartMonth: 4, reportFooter: '' }

/** AppData の配列コレクション → documents.collection 名 */
type ArrayCollection =
  | 'companies'
  | 'teams'
  | 'vehicles'
  | 'rateItems'
  | 'clients'
  | 'projects'
  | 'budgets'
  | 'sheets'
  | 'auditLogs'

interface DocumentRow {
  collection: string
  id: string
  doc: unknown
}

interface ProfileRow {
  id: string
  login_id: string
  name: string
  role: User['role']
  active: boolean
  created_at: string
}

const SETTINGS_ID = 'singleton'

/** 全データを取得して AppData を組み立てる */
export async function fetchAll(): Promise<AppData> {
  const sb = getSupabase()
  const [{ data: docs, error: docErr }, { data: profiles, error: profErr }] = await Promise.all([
    sb.from('documents').select('collection,id,doc'),
    sb.from('profiles').select('id,login_id,name,role,active,created_at'),
  ])
  if (docErr) throw docErr
  if (profErr) throw profErr

  const byCollection = new Map<string, unknown[]>()
  let settings: AppSettings = DEFAULT_SETTINGS
  for (const row of (docs ?? []) as DocumentRow[]) {
    if (row.collection === 'settings') {
      settings = { ...DEFAULT_SETTINGS, ...(row.doc as AppSettings) }
      continue
    }
    const arr = byCollection.get(row.collection) ?? []
    arr.push(row.doc)
    byCollection.set(row.collection, arr)
  }

  const col = <T,>(name: ArrayCollection): T[] => (byCollection.get(name) ?? []) as T[]
  const auditLogs = col<AuditLog>('auditLogs').sort((a, b) => b.at.localeCompare(a.at))

  const users: User[] = ((profiles ?? []) as ProfileRow[]).map((p) => ({
    id: p.id,
    loginId: p.login_id,
    name: p.name,
    role: p.role,
    active: p.active,
    createdAt: p.created_at,
  }))

  return {
    version: DATA_VERSION,
    settings,
    users,
    companies: col('companies'),
    teams: col('teams'),
    vehicles: col('vehicles'),
    rateItems: col('rateItems'),
    clients: col('clients'),
    projects: col('projects'),
    budgets: col('budgets'),
    sheets: col('sheets'),
    auditLogs,
  }
}

/** ドキュメントを1件追加/更新 */
export async function upsertDoc(collection: ArrayCollection, item: { id: string }): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('documents')
    .upsert({ collection, id: item.id, doc: item, updated_at: new Date().toISOString() })
  if (error) throw error
}

/** ドキュメントを削除 */
export async function removeDoc(collection: ArrayCollection, id: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('documents').delete().eq('collection', collection).eq('id', id)
  if (error) throw error
}

/** 設定を保存 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('documents')
    .upsert({ collection: 'settings', id: SETTINGS_ID, doc: settings, updated_at: new Date().toISOString() })
  if (error) throw error
}

/** 監査ログを1件追加 */
export async function appendAudit(log: AuditLog): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('documents')
    .upsert({ collection: 'auditLogs', id: log.id, doc: log, updated_at: log.at })
  if (error) throw error
}

/** プロフィール（氏名/権限/有効）を更新 */
export async function updateProfile(user: User): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('profiles')
    .update({ name: user.name, role: user.role, active: user.active })
    .eq('id', user.id)
  if (error) throw error
}

/** 全データを documents へ一括書き込み（デモ投入・復元用。users/profilesは対象外） */
export async function pushAll(data: AppData): Promise<void> {
  const sb = getSupabase()
  const rows: { collection: string; id: string; doc: unknown; updated_at: string }[] = []
  const now = new Date().toISOString()
  const add = (collection: ArrayCollection, items: { id: string }[]) => {
    for (const it of items) rows.push({ collection, id: it.id, doc: it, updated_at: now })
  }
  add('companies', data.companies)
  add('teams', data.teams)
  add('vehicles', data.vehicles)
  add('rateItems', data.rateItems)
  add('clients', data.clients)
  add('projects', data.projects)
  add('budgets', data.budgets)
  add('sheets', data.sheets)
  add('auditLogs', data.auditLogs)
  rows.push({ collection: 'settings', id: SETTINGS_ID, doc: data.settings, updated_at: now })
  // 1000件ずつに分割して upsert
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await sb.from('documents').upsert(rows.slice(i, i + 1000))
    if (error) throw error
  }
}

/** documents を全削除（全初期化用。profilesは残す） */
export async function clearDocuments(): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('documents').delete().neq('id', '')
  if (error) throw error
}

// --- 認証 / プロフィール ----------------------------------------------------

function rowToUser(p: ProfileRow): User {
  return {
    id: p.id,
    loginId: p.login_id,
    name: p.name,
    role: p.role,
    active: p.active,
    createdAt: p.created_at,
  }
}

/** 管理者ユーザーが1人でも存在するか（初回セットアップ判定・ログイン前でも可） */
export async function hasAnyUser(): Promise<boolean> {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('has_any_user')
  if (error) throw error
  return Boolean(data)
}

/** 自分のプロフィールを取得 */
export async function fetchProfile(id: string): Promise<User | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('profiles')
    .select('id,login_id,name,role,active,created_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? rowToUser(data as ProfileRow) : null
}

/** 最初の管理者を作成（メインクライアントで signUp → そのままログイン状態に） */
export async function createFirstAdmin(loginId: string, name: string, password: string): Promise<User> {
  const sb = getSupabase()
  const email = loginIdToEmail(loginId)
  const { data: signUp, error: signErr } = await sb.auth.signUp({ email, password })
  if (signErr) throw signErr
  const userId = signUp.user?.id
  if (!userId) throw new Error('アカウント作成に失敗しました（メール確認がOFFか確認してください）')
  if (!signUp.session) {
    await sb.auth.signInWithPassword({ email, password })
  }
  const profile = { id: userId, login_id: loginId.trim(), name: name.trim(), role: 'admin' as UserRole, active: true }
  const { error: profErr } = await sb.from('profiles').insert(profile)
  if (profErr) throw profErr
  const created = await fetchProfile(userId)
  if (!created) throw new Error('プロフィール作成に失敗しました')
  return created
}

/**
 * 管理者が新規ユーザーを追加（使い捨てクライアントで signUp→profile作成→signOut）。
 * 管理者の現在のログインセッションは維持される。
 */
export async function createUserAccount(
  loginId: string,
  name: string,
  password: string,
  role: UserRole,
): Promise<void> {
  const temp = createTempClient()
  const email = loginIdToEmail(loginId)
  const { data: signUp, error: signErr } = await temp.auth.signUp({ email, password })
  if (signErr) throw signErr
  const userId = signUp.user?.id
  if (!userId) throw new Error('アカウント作成に失敗しました（メール確認がOFFか確認してください）')
  if (!signUp.session) {
    await temp.auth.signInWithPassword({ email, password })
  }
  const { error: profErr } = await temp
    .from('profiles')
    .insert({ id: userId, login_id: loginId.trim(), name: name.trim(), role, active: true })
  await temp.auth.signOut()
  if (profErr) throw profErr
}

/** ログイン */
export async function signIn(loginId: string, password: string): Promise<User> {
  const sb = getSupabase()
  const { data, error } = await sb.auth.signInWithPassword({
    email: loginIdToEmail(loginId),
    password,
  })
  if (error) throw error
  const id = data.user?.id
  if (!id) throw new Error('ログインに失敗しました')
  const profile = await fetchProfile(id)
  if (!profile) throw new Error('プロフィールが見つかりません')
  if (!profile.active) {
    await sb.auth.signOut()
    throw new Error('このアカウントは無効です')
  }
  return profile
}

/** セッション復元（自動ログイン） */
export async function restoreSession(): Promise<User | null> {
  const sb = getSupabase()
  const { data } = await sb.auth.getSession()
  const id = data.session?.user?.id
  if (!id) return null
  return fetchProfile(id)
}

/** ログアウト */
export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut()
}

/** 自分のパスワードを変更（本人のみ） */
export async function changeOwnPassword(password: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ password })
  if (error) throw error
}

/** documents の変更を購読（他PCの更新反映用） */
export function subscribe(onChange: () => void): RealtimeChannel {
  const sb = getSupabase()
  return sb
    .channel('documents-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => onChange())
    .subscribe()
}
