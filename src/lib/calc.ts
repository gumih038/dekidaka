// 出来高表 1枚の利益計算（純関数・副作用なし）
import type { DailySheet, SheetLineItem, SheetVehicle } from '../types/models'

/** 出来高表1枚の計算結果 */
export interface SheetTotals {
  /** 出来高合計（売上） */
  revenue: number
  /** 人件費 = 人数 × 日当 */
  laborCost: number
  /** 車両費合計 */
  vehicleCost: number
  /** 高速代 */
  tollCost: number
  /** 燃料代 */
  fuelCost: number
  /** 原価合計 = 人件費 + 高速 + 燃料 + 車両費 */
  costTotal: number
  /** 総利益 = 売上 − 原価 */
  profit: number
  /** 利益率(%) */
  margin: number
}

/** 明細1行の金額 = 単価 × 数量 */
export function lineAmount(item: Pick<SheetLineItem, 'unitPrice' | 'quantity'>): number {
  return Math.round((item.unitPrice || 0) * (item.quantity || 0))
}

/** 明細合計（出来高/売上） */
export function sumLineItems(items: SheetLineItem[]): number {
  return items.reduce((acc, it) => acc + lineAmount(it), 0)
}

/** 使用車両の日額合計 */
export function sumVehicles(vehicles: SheetVehicle[]): number {
  return vehicles.reduce((acc, v) => acc + (v.dailyCost || 0), 0)
}

/** 人件費 = 人数 × 日当 */
export function laborCost(headcount: number, dailyWage: number): number {
  return Math.round((headcount || 0) * (dailyWage || 0))
}

/**
 * 出来高表1枚を集計する。
 * @param sheet 対象シート
 * @param dailyWage 日当（未指定時は sheet.dailyWageSnapshot を使用）
 */
export function calcSheet(sheet: DailySheet, dailyWage?: number): SheetTotals {
  const wage = dailyWage ?? sheet.dailyWageSnapshot ?? 0
  const revenue = sumLineItems(sheet.lineItems)
  const labor = laborCost(sheet.headcount, wage)
  const vehicleCost = sumVehicles(sheet.vehicles)
  const tollCost = Math.round(sheet.tollCost || 0)
  const fuelCost = Math.round(sheet.fuelCost || 0)
  const costTotal = labor + tollCost + fuelCost + vehicleCost
  const profit = revenue - costTotal
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0
  return {
    revenue,
    laborCost: labor,
    vehicleCost,
    tollCost,
    fuelCost,
    costTotal,
    profit,
    margin,
  }
}

/** 複数シートの合算（一覧の合計行・集計の基礎） */
export function sumTotals(list: SheetTotals[]): SheetTotals {
  const base: SheetTotals = {
    revenue: 0,
    laborCost: 0,
    vehicleCost: 0,
    tollCost: 0,
    fuelCost: 0,
    costTotal: 0,
    profit: 0,
    margin: 0,
  }
  const acc = list.reduce(
    (a, t) => ({
      revenue: a.revenue + t.revenue,
      laborCost: a.laborCost + t.laborCost,
      vehicleCost: a.vehicleCost + t.vehicleCost,
      tollCost: a.tollCost + t.tollCost,
      fuelCost: a.fuelCost + t.fuelCost,
      costTotal: a.costTotal + t.costTotal,
      profit: a.profit + t.profit,
      margin: 0,
    }),
    base,
  )
  return { ...acc, margin: acc.revenue > 0 ? (acc.profit / acc.revenue) * 100 : 0 }
}
