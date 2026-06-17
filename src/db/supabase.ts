// Supabase クライアント。VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が設定されていれば
// サーバー保存モード、未設定ならローカルJSON保存（開発/プレビュー用フォールバック）。
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** サーバー（Supabase）保存モードか */
export function isRemote(): boolean {
  return Boolean(URL && ANON)
}

let client: SupabaseClient | null = null

/** 共有Supabaseクライアント（メインセッション用） */
export function getSupabase(): SupabaseClient {
  if (!isRemote()) throw new Error('Supabase is not configured')
  if (!client) {
    client = createClient(URL as string, ANON as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}

/**
 * 管理者がユーザー追加する時用の使い捨てクライアント。
 * 別ストレージキーで作るので、signUp しても管理者のメインセッションを乗っ取らない。
 */
export function createTempClient(): SupabaseClient {
  return createClient(URL as string, ANON as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** ログインID → 内部用の合成メールアドレス（非IT者は名前＋パスワードだけで運用） */
export function loginIdToEmail(loginId: string): string {
  return `${loginId.trim().toLowerCase()}@dekidaka.local`
}
