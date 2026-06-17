// 画面遷移・編集対象・トースト通知の UI 状態
import { create } from 'zustand'
import { uid } from '../lib/hash'

export type Route =
  | 'home'
  | 'dashboard'
  | 'entry'
  | 'sheets'
  | 'projects'
  | 'masters'
  | 'reports'
  | 'admin'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

/** 印刷対象の1日（日付＋会社） */
export interface PrintDay {
  date: string
  companyId: string
}

interface UiState {
  route: Route
  /** entry 画面で編集中のシートID（新規時は null） */
  editingSheetId: string | null
  /** reports 画面で印刷対象の日（日付＋会社） */
  printDay: PrintDay | null
  toasts: Toast[]

  setRoute: (route: Route) => void
  openSheet: (id: string) => void
  newSheet: () => void
  openDayPrint: (date: string, companyId: string) => void
  notify: (message: string, type?: Toast['type']) => void
  dismiss: (id: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  route: 'home',
  editingSheetId: null,
  printDay: null,
  toasts: [],

  setRoute: (route) => set({ route }),
  openSheet: (id) => set({ route: 'entry', editingSheetId: id }),
  newSheet: () => set({ route: 'entry', editingSheetId: null }),
  openDayPrint: (date, companyId) => set({ route: 'reports', printDay: { date, companyId } }),

  notify: (message, type = 'success') => {
    const toast: Toast = { id: uid(), message, type }
    set((s) => ({ toasts: [...s.toasts, toast] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) })), 3200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
