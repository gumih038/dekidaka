// データストアの薄いセレクタ群（シェル内ではデータ読込済を前提）
import { useDataStore } from './useDataStore'
import type { AppData } from '../types/models'

/** 読込済みのアプリデータを取得（シェル内専用） */
export function useAppData(): AppData {
  const data = useDataStore((s) => s.data)
  if (!data) throw new Error('AppData not loaded')
  return data
}

/** id → 名称 の解決ヘルパを作る */
export function nameResolver(list: { id: string; name: string }[]): (id?: string) => string {
  const map = new Map(list.map((x) => [x.id, x.name]))
  return (id?: string) => (id ? map.get(id) ?? '—' : '—')
}
