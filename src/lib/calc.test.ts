import { describe, expect, it } from 'vitest'
import { calcSheet, laborCost, lineAmount, sumTotals, sumVehicles } from './calc'
import type { DailySheet } from '../types/models'

function makeSheet(over: Partial<DailySheet> = {}): DailySheet {
  return {
    id: 's1',
    date: '2026-06-16',
    companyId: 'c1',
    siteName: '現場A',
    headcount: 3,
    tollCost: 2000,
    fuelCost: 3000,
    lineItems: [
      { id: 'l1', rateItemId: 'r1', name: '規制標識', category: 'sign', unitPrice: 5000, quantity: 10, unit: '本' },
      { id: 'l2', rateItemId: 'r2', name: '案内板', category: 'board', unitPrice: 8000, quantity: 2, unit: '枚' },
    ],
    vehicles: [
      { vehicleId: 'v1', name: '2tダンプ', dailyCost: 6000 },
      { vehicleId: 'v2', name: '高所車', dailyCost: 9000 },
    ],
    dailyWageSnapshot: 18000,
    status: 'draft',
    createdBy: 'u1',
    createdAt: '2026-06-16T08:00:00',
    updatedAt: '2026-06-16T08:00:00',
    ...over,
  }
}

describe('lineAmount', () => {
  it('単価 × 数量 を四捨五入で返す', () => {
    expect(lineAmount({ unitPrice: 5000, quantity: 10 })).toBe(50000)
    expect(lineAmount({ unitPrice: 0, quantity: 5 })).toBe(0)
    expect(lineAmount({ unitPrice: 333, quantity: 3 })).toBe(999)
  })
})

describe('laborCost', () => {
  it('人数 × 日当', () => {
    expect(laborCost(3, 18000)).toBe(54000)
    expect(laborCost(0, 18000)).toBe(0)
  })
})

describe('sumVehicles', () => {
  it('車両日額を合算', () => {
    expect(sumVehicles([{ vehicleId: 'v1', name: 'a', dailyCost: 6000 }, { vehicleId: 'v2', name: 'b', dailyCost: 9000 }])).toBe(15000)
    expect(sumVehicles([])).toBe(0)
  })
})

describe('calcSheet', () => {
  it('売上・原価・総利益・利益率を正しく算出する', () => {
    const t = calcSheet(makeSheet())
    // 売上 = 5000*10 + 8000*2 = 66000
    expect(t.revenue).toBe(66000)
    // 人件費 = 3 * 18000 = 54000
    expect(t.laborCost).toBe(54000)
    // 車両費 = 15000
    expect(t.vehicleCost).toBe(15000)
    // 原価 = 54000 + 2000 + 3000 + 15000 = 74000
    expect(t.costTotal).toBe(74000)
    // 総利益 = 66000 - 74000 = -8000（赤字も正しく出る）
    expect(t.profit).toBe(-8000)
    // 利益率 = -8000/66000*100
    expect(t.margin).toBeCloseTo(-12.121, 2)
  })

  it('引数の日当を優先し、スナップショットを上書きできる', () => {
    const t = calcSheet(makeSheet(), 10000)
    expect(t.laborCost).toBe(30000)
  })

  it('売上0なら利益率は0', () => {
    const t = calcSheet(makeSheet({ lineItems: [] }))
    expect(t.revenue).toBe(0)
    expect(t.margin).toBe(0)
  })

  it('入力オブジェクトを変更しない（イミュータブル）', () => {
    const sheet = makeSheet()
    const snapshot = JSON.stringify(sheet)
    calcSheet(sheet)
    expect(JSON.stringify(sheet)).toBe(snapshot)
  })
})

describe('sumTotals', () => {
  it('複数シートの合計と再計算した利益率を返す', () => {
    const a = calcSheet(makeSheet())
    const b = calcSheet(makeSheet({ lineItems: [{ id: 'x', rateItemId: 'r', name: 'n', category: 'sign', unitPrice: 10000, quantity: 10, unit: '本' }], headcount: 1, tollCost: 0, fuelCost: 0, vehicles: [] }))
    const total = sumTotals([a, b])
    expect(total.revenue).toBe(66000 + 100000)
    expect(total.profit).toBe(a.profit + b.profit)
    expect(total.margin).toBeCloseTo((total.profit / total.revenue) * 100, 5)
  })
})
