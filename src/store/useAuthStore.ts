// 認証セッション。Supabaseモード=Supabase Auth、ローカルモード=簡易ローカル認証。
import { create } from 'zustand'
import type { User } from '../types/models'
import { sha256 } from '../lib/hash'
import { isRemote } from '../db/supabase'
import * as remote from '../db/remote'
import { useDataStore } from './useDataStore'

const SESSION_KEY = 'dekidaka-session'

interface AuthResult {
  ok: boolean
  error?: string
}

interface AuthState {
  currentUser: User | null
  /** 初回起動でまだ管理者が居ない（Supabaseモードのみ true になりうる） */
  needsSetup: boolean
  login: (loginId: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
  createFirstAdmin: (loginId: string, name: string, password: string) => Promise<AuthResult>
  changePassword: (password: string) => Promise<AuthResult>
}

function errMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  needsSetup: false,

  async login(loginId, password) {
    if (isRemote()) {
      try {
        const user = await remote.signIn(loginId, password)
        set({ currentUser: user })
        useDataStore.getState().setActingUser({ id: user.id, name: user.name })
        await useDataStore.getState().load()
        useDataStore.getState().audit('ログイン', user.loginId)
        return { ok: true }
      } catch (e) {
        return { ok: false, error: errMessage(e, 'ログインに失敗しました') }
      }
    }

    // ローカルモード
    const data = useDataStore.getState().data
    if (!data) return { ok: false, error: 'データ未読み込みです' }
    const user = data.users.find((u) => u.loginId === loginId.trim() && u.active)
    if (!user) return { ok: false, error: 'ユーザーが見つかりません' }
    const hash = await sha256(password)
    if (hash !== user.passwordHash) return { ok: false, error: 'パスワードが違います' }
    set({ currentUser: user })
    useDataStore.getState().setActingUser({ id: user.id, name: user.name })
    try {
      sessionStorage.setItem(SESSION_KEY, user.id)
    } catch {
      // noop
    }
    useDataStore.getState().audit('ログイン', user.loginId)
    return { ok: true }
  },

  async logout() {
    if (isRemote()) {
      try {
        await remote.signOut()
      } catch {
        // noop
      }
    } else {
      try {
        sessionStorage.removeItem(SESSION_KEY)
      } catch {
        // noop
      }
    }
    set({ currentUser: null })
    useDataStore.getState().setActingUser(null)
  },

  async hydrate() {
    if (isRemote()) {
      try {
        const user = await remote.restoreSession()
        if (user) {
          set({ currentUser: user })
          useDataStore.getState().setActingUser({ id: user.id, name: user.name })
          await useDataStore.getState().load()
        } else {
          const exists = await remote.hasAnyUser()
          set({ needsSetup: !exists })
        }
      } catch {
        // 接続失敗時はログイン画面のまま
      }
      return
    }

    // ローカルモード：sessionStorage から復元
    let id: string | null = null
    try {
      id = sessionStorage.getItem(SESSION_KEY)
    } catch {
      id = null
    }
    if (!id) return
    const data = useDataStore.getState().data
    const user = data?.users.find((u) => u.id === id && u.active)
    if (user) {
      set({ currentUser: user })
      useDataStore.getState().setActingUser({ id: user.id, name: user.name })
    }
  },

  async createFirstAdmin(loginId, name, password) {
    if (!isRemote()) return { ok: false, error: 'ローカルモードでは不要です' }
    try {
      const user = await remote.createFirstAdmin(loginId, name, password)
      set({ currentUser: user, needsSetup: false })
      useDataStore.getState().setActingUser({ id: user.id, name: user.name })
      await useDataStore.getState().load()
      useDataStore.getState().audit('管理者を作成', user.loginId)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errMessage(e, '管理者の作成に失敗しました') }
    }
  },

  async changePassword(password) {
    if (!isRemote()) return { ok: false, error: 'ローカルモードでは未対応です' }
    try {
      await remote.changeOwnPassword(password)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errMessage(e, 'パスワード変更に失敗しました') }
    }
  },
}))
