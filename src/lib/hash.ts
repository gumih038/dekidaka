// 簡易パスワードハッシュ（社内1台運用前提）。Web Crypto の SHA-256。

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** ランダムID（UUID） */
export function uid(): string {
  return crypto.randomUUID()
}
