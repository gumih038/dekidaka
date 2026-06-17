import type { SheetStatus } from '../types/models'
import { SHEET_STATUS_LABELS } from '../types/models'

export function StatusBadge({ status }: { status: SheetStatus }) {
  return <span className={`badge badge-${status}`}>{SHEET_STATUS_LABELS[status]}</span>
}
