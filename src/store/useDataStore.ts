// アプリ全データを保持する中央ストア（Zustand）。
// 全件メモリ保持・イミュータブル更新。保存先は env により Supabase / ローカルJSON を自動切替。
import { create } from 'zustand'
import type {
  AppData,
  AppSettings,
  AuditLog,
  Budget,
  Client,
  Company,
  DailySheet,
  Project,
  RateItem,
  Team,
  User,
  Vehicle,
} from '../types/models'
import { DATA_VERSION } from '../types/models'
import { loadData, saveData } from '../db/persistence'
import { buildEmptyData, buildSeedData } from '../db/seed'
import { isRemote } from '../db/supabase'
import * as remote from '../db/remote'
import { useUiStore } from './useUiStore'
import { uid } from '../lib/hash'

/** id を持つコレクション群（汎用CRUD用） */
interface Collections {
  users: User
  companies: Company
  teams: Team
  vehicles: Vehicle
  rateItems: RateItem
  clients: Client
  projects: Project
  budgets: Budget
  sheets: DailySheet
}

const COLLECTION_LABELS: Record<keyof Collections, string> = {
  users: 'ユーザー',
  companies: '会社',
  teams: '施工班',
  vehicles: '車両',
  rateItems: '単価',
  clients: '発注元',
  projects: '工事',
  budgets: '予算',
  sheets: '出来高表',
}

interface ActingUser {
  id: string
  name: string
}

interface DataState {
  data: AppData | null
  loaded: boolean
  actingUser: ActingUser | null

  load: () => Promise<void>
  reload: () => Promise<void>
  setActingUser: (user: ActingUser | null) => void

  apply: (mutator: (d: AppData) => AppData) => void
  audit: (action: string, target: string, detail?: string) => void
  upsert: <K extends keyof Collections>(key: K, item: Collections[K], silent?: boolean) => void
  remove: <K extends keyof Collections>(key: K, id: string) => void
  updateSettings: (patch: Partial<AppSettings>) => void

  replaceAll: (data: AppData, reason: string) => void
  seedDemo: () => Promise<void>
  resetEmpty: () => Promise<void>
}

function replaceInArray<T extends { id: string }>(arr: T[], item: T): { next: T[]; existed: boolean } {
  const existed = arr.some((x) => x.id === item.id)
  const next = existed ? arr.map((x) => (x.id === item.id ? item : x)) : [...arr, item]
  return { next, existed }
}

const DEFAULT_SETTINGS = { dailyWage: 18000, fiscalStartMonth: 4, reportFooter: '' }

/** 旧データの欠損フィールドを補完 */
function migrate(d: AppData): AppData {
  return {
    version: DATA_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...d.settings },
    users: d.users ?? [],
    companies: d.companies ?? [],
    teams: d.teams ?? [],
    vehicles: d.vehicles ?? [],
    rateItems: d.rateItems ?? [],
    clients: d.clients ?? [],
    projects: d.projects ?? [],
    budgets: d.budgets ?? [],
    sheets: d.sheets ?? [],
    auditLogs: d.auditLogs ?? [],
  }
}

let realtimeReady = false

export const useDataStore = create<DataState>((set, get) => {
  /** ローカル保存（ローカルモードのみ） */
  const persistLocal = () => {
    const d = get().data
    if (d && !isRemote()) void saveData(d)
  }

  /** サーバー書き込みを実行し、失敗時はトースト＋再取得で復旧 */
  const remoteWrite = (p: Promise<void>, errMsg: string) => {
    p.catch(() => {
      useUiStore.getState().notify(errMsg, 'error')
      void get().reload()
    })
  }

  const ensureRealtime = () => {
    if (realtimeReady || !isRemote()) return
    realtimeReady = true
    let timer: ReturnType<typeof setTimeout> | null = null
    remote.subscribe(() => {
      // 連続更新をまとめて再取得（自分の書込でも発火するが冪等）
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void get().reload(), 400)
    })
  }

  return {
    data: null,
    loaded: false,
    actingUser: null,

    async load() {
      if (isRemote()) {
        const d = await remote.fetchAll()
        set({ data: d, loaded: true })
        ensureRealtime()
        return
      }
      let d = await loadData()
      if (!d) {
        d = await buildSeedData()
        await saveData(d)
      } else {
        d = migrate(d)
      }
      set({ data: d, loaded: true })
    },

    async reload() {
      if (!isRemote()) return
      try {
        const d = await remote.fetchAll()
        set({ data: d })
      } catch {
        // 一時的な失敗は無視（次回更新で再取得）
      }
    },

    setActingUser(user) {
      set({ actingUser: user })
    },

    apply(mutator) {
      set((s) => (s.data ? { data: mutator(s.data) } : s))
      persistLocal()
    },

    audit(action, target, detail) {
      const user = get().actingUser
      const entry: AuditLog = {
        id: uid(),
        at: new Date().toISOString(),
        userId: user?.id ?? '-',
        userName: user?.name ?? 'システム',
        action,
        target,
        detail,
      }
      set((s) =>
        s.data ? { data: { ...s.data, auditLogs: [entry, ...s.data.auditLogs].slice(0, 2000) } } : s,
      )
      if (isRemote()) remoteWrite(remote.appendAudit(entry), '操作ログの保存に失敗しました')
      else persistLocal()
    },

    upsert(key, item, silent) {
      const d = get().data
      if (!d) return
      const arr = d[key] as { id: string }[]
      const { next, existed } = replaceInArray(arr, item as { id: string })
      set({ data: { ...d, [key]: next } as AppData })

      if (isRemote()) {
        if (key === 'users') remoteWrite(remote.updateProfile(item as User), 'ユーザーの保存に失敗しました')
        else remoteWrite(remote.upsertDoc(key, item as { id: string }), '保存に失敗しました')
      } else {
        persistLocal()
      }

      if (!silent) {
        get().audit(
          existed ? `${COLLECTION_LABELS[key]}を更新` : `${COLLECTION_LABELS[key]}を追加`,
          describe(item),
        )
      }
    },

    remove(key, id) {
      const d = get().data
      if (!d) return
      const arr = d[key] as { id: string }[]
      const target = arr.find((x) => x.id === id)
      set({ data: { ...d, [key]: arr.filter((x) => x.id !== id) } as AppData })

      if (isRemote()) {
        if (key !== 'users') remoteWrite(remote.removeDoc(key, id), '削除に失敗しました')
      } else {
        persistLocal()
      }
      get().audit(`${COLLECTION_LABELS[key]}を削除`, target ? describe(target) : id)
    },

    updateSettings(patch) {
      const d = get().data
      if (!d) return
      const settings = { ...d.settings, ...patch }
      set({ data: { ...d, settings } })
      if (isRemote()) remoteWrite(remote.saveSettings(settings), '設定の保存に失敗しました')
      else persistLocal()
      get().audit('設定を変更', Object.keys(patch).join(', '))
    },

    replaceAll(data, reason) {
      const migrated = migrate(data)
      set({ data: migrated })
      if (isRemote()) {
        remoteWrite(
          (async () => {
            await remote.clearDocuments()
            await remote.pushAll(migrated)
          })(),
          'データ復元に失敗しました',
        )
      } else {
        persistLocal()
      }
      get().audit('データを置換', reason)
    },

    async seedDemo() {
      const d = await buildSeedData()
      set({ data: d })
      if (isRemote()) {
        await remote.clearDocuments()
        await remote.pushAll(d)
      } else {
        await saveData(d)
      }
      get().audit('デモデータを投入', '全件')
    },

    async resetEmpty() {
      const d = await buildEmptyData()
      // サーバーモードではユーザー(profiles)は消さず、業務データのみ初期化
      if (isRemote()) {
        d.users = get().data?.users ?? []
        set({ data: d })
        await remote.clearDocuments()
      } else {
        set({ data: d })
        await saveData(d)
      }
      get().audit('データを初期化', '全件削除')
    },
  }
})

function describe(item: unknown): string {
  const o = item as Record<string, unknown>
  return (
    (o.name as string) ||
    (o.code as string) ||
    (o.siteName as string) ||
    (o.loginId as string) ||
    (o.id as string) ||
    ''
  )
}
