// 起動時に自動アップデートを確認し、新バージョンがあれば更新する（デスクトップのみ）。
import { isDesktop } from '../db/persistence'

type Notify = (message: string, type?: 'success' | 'error' | 'info') => void

export async function checkForUpdate(notify?: Notify): Promise<void> {
  if (!isDesktop()) return
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update) return

    const ok = window.confirm(
      `新しいバージョン（${update.version}）があります。\n今すぐ更新しますか？\n\n更新すると最新の機能が使えます。更新後にアプリが自動で再起動します。`,
    )
    if (!ok) return

    notify?.('更新をダウンロードしています…', 'info')
    await update.downloadAndInstall()
    notify?.('更新を適用しました。再起動します。', 'success')
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  } catch {
    // オフライン・取得失敗時は何もしない（通常起動を続行）
  }
}
