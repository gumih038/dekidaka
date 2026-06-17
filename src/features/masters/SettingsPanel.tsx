import { useState } from 'react'
import { useDataStore } from '../../store/useDataStore'
import { useUiStore } from '../../store/useUiStore'
import { useAppData } from '../../store/selectors'
import { formatYen } from '../../lib/format'

export function SettingsPanel({ canEdit }: { canEdit: boolean }) {
  const data = useAppData()
  const updateSettings = useDataStore((s) => s.updateSettings)
  const notify = useUiStore((s) => s.notify)

  const [wage, setWage] = useState(data.settings.dailyWage)
  const [fiscal, setFiscal] = useState(data.settings.fiscalStartMonth)
  const [footer, setFooter] = useState(data.settings.reportFooter)

  function save() {
    updateSettings({ dailyWage: wage, fiscalStartMonth: fiscal, reportFooter: footer })
    notify('全般設定を保存しました')
  }

  return (
    <section className="card">
      <header className="card-head">
        <h3>全般設定</h3>
      </header>
      <div className="card-body settings-grid">
        <div className="field">
          <label htmlFor="wage">1人あたり日当</label>
          <div className="em-input-suffix">
            <input
              id="wage"
              className="input num"
              type="number"
              value={wage}
              disabled={!canEdit}
              onChange={(e) => setWage(Number(e.target.value))}
            />
            <span className="em-suffix">円/人日</span>
          </div>
          <span className="muted em-help">人件費 = 人数 × この日当（現在 {formatYen(wage)}）</span>
        </div>

        <div className="field">
          <label htmlFor="fiscal">会計年度 期首月</label>
          <select
            id="fiscal"
            className="select"
            value={fiscal}
            disabled={!canEdit}
            onChange={(e) => setFiscal(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>

        <div className="field settings-full">
          <label htmlFor="footer">帳票フッター文言</label>
          <textarea
            id="footer"
            className="textarea"
            value={footer}
            disabled={!canEdit}
            onChange={(e) => setFooter(e.target.value)}
          />
        </div>

        {canEdit && (
          <div className="settings-full">
            <button className="btn btn-primary" onClick={save}>
              設定を保存
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
