// CSV エクスポート（Excelで開ける UTF-8 BOM 付き）
import { saveTextFile } from '../db/persistence'

export type CsvRow = (string | number)[]

function escapeCell(value: string | number): string {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(header: string[], rows: CsvRow[]): string {
  const lines = [header, ...rows].map((r) => r.map(escapeCell).join(','))
  return '﻿' + lines.join('\r\n')
}

/** CSVを保存（デスクトップはダイアログ、ブラウザはダウンロード） */
export async function exportCsv(filename: string, header: string[], rows: CsvRow[]): Promise<string | null> {
  const csv = toCsv(header, rows)
  return saveTextFile(filename, csv, 'csv', 'text/csv;charset=utf-8')
}
