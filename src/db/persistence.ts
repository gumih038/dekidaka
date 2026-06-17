// データ永続化レイヤ。
// Tauri 実行時は AppData 配下の JSON ファイル、ブラウザ（開発/プレビュー）時は localStorage。
import type { AppData } from '../types/models'

const FILE = 'dekidaka-data.json'
const LS_KEY = 'dekidaka-data'

/** Tauri webview 内で動作しているか */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** データファイルの絶対パス（AppData配下） */
async function dataFilePath(): Promise<string> {
  const { appDataDir, join } = await import('@tauri-apps/api/path')
  const dir = await appDataDir()
  return join(dir, FILE)
}

/** 生JSONを読む（無ければ null） */
export async function loadRaw(): Promise<string | null> {
  if (isDesktop()) {
    const { exists, readTextFile } = await import('@tauri-apps/plugin-fs')
    try {
      const path = await dataFilePath()
      if (!(await exists(path))) return null
      return await readTextFile(path)
    } catch {
      return null
    }
  }
  try {
    return localStorage.getItem(LS_KEY)
  } catch {
    return null
  }
}

/** 生JSONを保存 */
export async function saveRaw(json: string): Promise<void> {
  if (isDesktop()) {
    const { writeTextFile, mkdir } = await import('@tauri-apps/plugin-fs')
    const { appDataDir } = await import('@tauri-apps/api/path')
    const dir = await appDataDir()
    try {
      await mkdir(dir, { recursive: true })
    } catch {
      // 既に存在する場合は無視
    }
    await writeTextFile(await dataFilePath(), json)
    return
  }
  localStorage.setItem(LS_KEY, json)
}

/** データを読み込んでパース */
export async function loadData(): Promise<AppData | null> {
  const raw = await loadRaw()
  if (!raw) return null
  try {
    return JSON.parse(raw) as AppData
  } catch {
    return null
  }
}

/** データを保存（整形JSON） */
export async function saveData(data: AppData): Promise<void> {
  await saveRaw(JSON.stringify(data, null, 2))
}

// --- バックアップ / リストア -------------------------------------------

/** 現在のデータを任意ファイルに書き出す（ダイアログ） */
export async function exportBackup(data: AppData): Promise<string | null> {
  const json = JSON.stringify(data, null, 2)
  const stamp = new Date().toISOString().slice(0, 10)
  const suggested = `dekidaka-backup-${stamp}.json`
  if (isDesktop()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await save({
      defaultPath: suggested,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (!path) return null
    await writeTextFile(path, json)
    return path
  }
  // ブラウザ: ダウンロード
  downloadText(suggested, json)
  return suggested
}

/** ファイルからデータを読み込む（ダイアログ）。検証付き。 */
export async function importBackup(): Promise<AppData | null> {
  if (isDesktop()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] })
    if (!path || typeof path !== 'string') return null
    const raw = await readTextFile(path)
    return parseAppData(raw)
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const raw = await file.text()
      resolve(parseAppData(raw))
    }
    input.click()
  })
}

function parseAppData(raw: string): AppData | null {
  try {
    const data = JSON.parse(raw) as AppData
    if (!data || !Array.isArray(data.sheets) || !data.settings) return null
    return data
  } catch {
    return null
  }
}

/** CSV/JSON 等のテキストをブラウザでダウンロード */
export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** テキストを任意ファイルへ保存（デスクトップはダイアログ、ブラウザはDL） */
export async function saveTextFile(
  suggestedName: string,
  text: string,
  ext: string,
  mime: string,
): Promise<string | null> {
  if (isDesktop()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await save({
      defaultPath: suggestedName,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    })
    if (!path) return null
    await writeTextFile(path, text)
    return path
  }
  downloadText(suggestedName, text, mime)
  return suggestedName
}
