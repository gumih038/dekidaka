import { useState } from 'react'
import { EntityManager, type FieldDef } from '../../components/EntityManager'
import { useDataStore } from '../../store/useDataStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useUiStore } from '../../store/useUiStore'
import { useAppData } from '../../store/selectors'
import { can } from '../../lib/permissions'
import { formatYen } from '../../lib/format'
import { sha256, uid } from '../../lib/hash'
import { isRemote } from '../../db/supabase'
import { createUserAccount } from '../../db/remote'
import {
  RATE_CATEGORY_LABELS,
  USER_ROLE_LABELS,
  type Budget,
  type Client,
  type Company,
  type RateItem,
  type Team,
  type User,
  type Vehicle,
} from '../../types/models'
import { SettingsPanel } from './SettingsPanel'
import './masters.css'

type Tab = 'companies' | 'teams' | 'vehicles' | 'rateItems' | 'clients' | 'budgets' | 'users' | 'settings'

const TABS: { key: Tab; label: string }[] = [
  { key: 'companies', label: '会社' },
  { key: 'teams', label: '施工班' },
  { key: 'vehicles', label: '車両' },
  { key: 'rateItems', label: '単価' },
  { key: 'clients', label: '発注元' },
  { key: 'budgets', label: '予算' },
  { key: 'users', label: 'ユーザー' },
  { key: 'settings', label: '全般設定' },
]

export function MastersPage() {
  const [tab, setTab] = useState<Tab>('companies')
  const data = useAppData()
  const upsert = useDataStore((s) => s.upsert)
  const remove = useDataStore((s) => s.remove)
  const notify = useNotify()
  const user = useAuthStore((s) => s.currentUser)
  const canEdit = can(user, 'editMasters')
  const canUsers = can(user, 'manageUsers')

  const activeBadge = (active: boolean) =>
    active ? <span className="badge badge-approved">有効</span> : <span className="badge badge-draft">無効</span>

  return (
    <div className="page">
      <nav className="tabs" aria-label="マスター種別">
        {TABS.filter((t) => t.key !== 'users' || canUsers).map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'companies' && (
        <EntityManager<Company>
          title="会社（合同会社メンバー）"
          subtitle="出来高表ごとに選択する会社。ロゴは帳票ヘッダーに表示されます。"
          items={data.companies}
          canEdit={canEdit}
          searchText={(c) => c.name}
          columns={[
            { header: 'ロゴ', render: (c) => (c.logo ? <img src={c.logo} className="mini-logo" alt="" /> : <span className="muted">—</span>) },
            { header: '会社名', render: (c) => <strong>{c.name}</strong> },
            { header: 'TEL', render: (c) => c.tel ?? '—' },
            { header: '持分', render: (c) => c.shareNote ?? '—' },
            { header: '状態', render: (c) => activeBadge(c.active) },
          ]}
          fields={companyFields}
          makeNew={() => ({ id: uid(), name: '', logo: '', tel: '', address: '', shareNote: '', active: true })}
          onSave={(c) => { upsert('companies', c); notify('会社を保存しました') }}
          onDelete={(id) => remove('companies', id)}
        />
      )}

      {tab === 'teams' && (
        <EntityManager<Team>
          title="施工班"
          items={data.teams}
          canEdit={canEdit}
          searchText={(t) => t.name}
          columns={[
            { header: '班名', render: (t) => <strong>{t.name}</strong> },
            { header: '備考', render: (t) => t.note ?? '—' },
            { header: '状態', render: (t) => activeBadge(t.active) },
          ]}
          fields={[
            { key: 'name', label: '班名', type: 'text', required: true, fullWidth: true },
            { key: 'note', label: '備考', type: 'text', fullWidth: true },
            { key: 'active', label: '有効', type: 'checkbox' },
          ]}
          makeNew={() => ({ id: uid(), name: '', note: '', active: true })}
          onSave={(t) => { upsert('teams', t); notify('施工班を保存しました') }}
          onDelete={(id) => remove('teams', id)}
        />
      )}

      {tab === 'vehicles' && (
        <EntityManager<Vehicle>
          title="施工車両"
          subtitle="日額コストは出来高表で使用した日に自動で原価へ加算されます。"
          items={data.vehicles}
          canEdit={canEdit}
          searchText={(v) => v.name}
          columns={[
            { header: '車両名', render: (v) => <strong>{v.name}</strong> },
            { header: '日額コスト', align: 'right', render: (v) => formatYen(v.dailyCost) },
            { header: '状態', render: (v) => activeBadge(v.active) },
          ]}
          fields={[
            { key: 'name', label: '車両名／ナンバー', type: 'text', required: true, fullWidth: true },
            { key: 'dailyCost', label: '日額コスト', type: 'yen', suffix: '円/日' },
            { key: 'note', label: '備考', type: 'text' },
            { key: 'active', label: '有効', type: 'checkbox' },
          ]}
          makeNew={() => ({ id: uid(), name: '', dailyCost: 0, note: '', active: true })}
          onSave={(v) => { upsert('vehicles', v); notify('車両を保存しました') }}
          onDelete={(id) => remove('vehicles', id)}
        />
      )}

      {tab === 'rateItems' && (
        <EntityManager<RateItem>
          title="単価マスター（標識・板）"
          subtitle="出来高入力で選択し、本数/枚数を掛けて売上を自動計算します。"
          items={data.rateItems}
          canEdit={canEdit}
          searchText={(r) => r.name}
          columns={[
            { header: '名称', render: (r) => <strong>{r.name}</strong> },
            { header: '区分', render: (r) => RATE_CATEGORY_LABELS[r.category] },
            { header: '単価', align: 'right', render: (r) => formatYen(r.unitPrice) },
            { header: '単位', render: (r) => r.unit },
            { header: '状態', render: (r) => activeBadge(r.active) },
          ]}
          fields={[
            { key: 'name', label: '名称', type: 'text', required: true, fullWidth: true },
            {
              key: 'category',
              label: '区分',
              type: 'select',
              options: Object.entries(RATE_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
            },
            { key: 'unit', label: '単位', type: 'text', placeholder: '本・枚 など' },
            { key: 'unitPrice', label: '単価', type: 'yen', suffix: '円' },
            { key: 'active', label: '有効', type: 'checkbox' },
          ]}
          makeNew={() => ({ id: uid(), name: '', category: 'sign', unit: '本', unitPrice: 0, active: true })}
          onSave={(r) => { upsert('rateItems', r); notify('単価を保存しました') }}
          onDelete={(id) => remove('rateItems', id)}
        />
      )}

      {tab === 'clients' && (
        <EntityManager<Client>
          title="発注元（取引先）"
          items={data.clients}
          canEdit={canEdit}
          searchText={(c) => c.name}
          columns={[
            { header: '発注元名', render: (c) => <strong>{c.name}</strong> },
            { header: '担当', render: (c) => c.contact ?? '—' },
            { header: 'TEL', render: (c) => c.tel ?? '—' },
            { header: '状態', render: (c) => activeBadge(c.active) },
          ]}
          fields={[
            { key: 'name', label: '発注元名', type: 'text', required: true, fullWidth: true },
            { key: 'contact', label: '担当', type: 'text' },
            { key: 'tel', label: 'TEL', type: 'text' },
            { key: 'active', label: '有効', type: 'checkbox' },
          ]}
          makeNew={() => ({ id: uid(), name: '', contact: '', tel: '', active: true })}
          onSave={(c) => { upsert('clients', c); notify('発注元を保存しました') }}
          onDelete={(id) => remove('clients', id)}
        />
      )}

      {tab === 'budgets' && (
        <EntityManager<Budget>
          title="予算（予実管理）"
          subtitle="月次の売上・原価・利益の目標。ダッシュボードの予実比較に使用します。"
          items={data.budgets}
          canEdit={canEdit}
          columns={[
            { header: '対象', render: (b) => (b.scope === 'overall' ? '全社' : companyName(data.companies, b.refId)) },
            { header: '年月', render: (b) => b.yearMonth ?? '—' },
            { header: '売上予算', align: 'right', render: (b) => formatYen(b.revenue) },
            { header: '原価予算', align: 'right', render: (b) => formatYen(b.cost) },
            { header: '利益予算', align: 'right', render: (b) => formatYen(b.profit) },
          ]}
          fields={[
            {
              key: 'scope',
              label: '対象種別',
              type: 'select',
              options: [
                { value: 'overall', label: '全社' },
                { value: 'company', label: '会社別' },
              ],
            },
            {
              key: 'refId',
              label: '会社（会社別のとき）',
              type: 'select',
              options: data.companies.map((c) => ({ value: c.id, label: c.name })),
            },
            { key: 'yearMonth', label: '対象年月', type: 'text', placeholder: 'YYYY-MM' },
            { key: 'revenue', label: '売上予算', type: 'yen', suffix: '円' },
            { key: 'cost', label: '原価予算', type: 'yen', suffix: '円' },
          ]}
          makeNew={() => ({ id: uid(), scope: 'overall', refId: '', yearMonth: thisMonth(), revenue: 0, cost: 0, profit: 0 })}
          onSave={(b) => { upsert('budgets', { ...b, profit: (b.revenue || 0) - (b.cost || 0) }); notify('予算を保存しました') }}
          onDelete={(id) => remove('budgets', id)}
        />
      )}

      {tab === 'users' && canUsers && (
        <EntityManager<User & { password?: string }>
          title="ユーザー管理"
          subtitle="ロールにより操作権限が変わります。パスワードは編集時に空欄なら変更しません。"
          items={data.users}
          canEdit={canUsers}
          searchText={(u) => u.name + u.loginId}
          columns={[
            { header: '氏名', render: (u) => <strong>{u.name}</strong> },
            { header: 'ログインID', render: (u) => <code>{u.loginId}</code> },
            { header: '権限', render: (u) => USER_ROLE_LABELS[u.role] },
            { header: '状態', render: (u) => activeBadge(u.active) },
          ]}
          fields={[
            { key: 'name', label: '氏名', type: 'text', required: true },
            { key: 'loginId', label: 'ログインID', type: 'text', required: true },
            {
              key: 'role',
              label: '権限',
              type: 'select',
              options: Object.entries(USER_ROLE_LABELS).map(([value, label]) => ({ value, label })),
            },
            { key: 'password', label: 'パスワード', type: 'password', help: '変更時のみ入力' },
            { key: 'active', label: '有効', type: 'checkbox' },
          ]}
          makeNew={() => ({ id: uid(), name: '', loginId: '', role: 'genba', active: true, passwordHash: '', createdAt: new Date().toISOString(), password: '' })}
          onSave={(u) => { void saveUser(u) }}
          onDelete={(id) => remove('users', id)}
        />
      )}

      {tab === 'settings' && <SettingsPanel canEdit={canEdit} />}
    </div>
  )

  async function saveUser(u: User & { password?: string }) {
    const existing = data.users.find((x) => x.id === u.id)

    // サーバーモード：新規は Supabase Auth に登録、既存はプロフィール更新
    if (isRemote()) {
      if (!existing) {
        if (!u.loginId.trim() || !u.name.trim()) {
          notify('氏名とログインIDを入力してください', 'error')
          return
        }
        if (!u.password || u.password.trim().length < 6) {
          notify('新規ユーザーはパスワード6文字以上が必要です', 'error')
          return
        }
        try {
          await createUserAccount(u.loginId.trim(), u.name.trim(), u.password.trim(), u.role)
          await useDataStore.getState().reload()
          notify('ユーザーを追加しました')
        } catch (e) {
          notify(e instanceof Error ? e.message : 'ユーザー追加に失敗しました', 'error')
        }
        return
      }
      const { password: _pw, passwordHash: _ph, ...rest } = u
      void _pw
      void _ph
      upsert('users', rest)
      notify('ユーザーを保存しました')
      return
    }

    // ローカルモード：パスワードを SHA-256 で保存
    let passwordHash = existing?.passwordHash ?? ''
    if (u.password && u.password.trim()) {
      passwordHash = await sha256(u.password.trim())
    }
    if (!passwordHash) {
      notify('新規ユーザーはパスワードが必要です', 'error')
      return
    }
    const { password, ...rest } = u
    void password
    upsert('users', { ...rest, passwordHash })
    notify('ユーザーを保存しました')
  }
}

const companyFields: FieldDef[] = [
  { key: 'name', label: '会社名', type: 'text', required: true, fullWidth: true },
  { key: 'logo', label: 'ロゴ画像', type: 'image', fullWidth: true },
  { key: 'tel', label: 'TEL', type: 'text' },
  { key: 'shareNote', label: '持分メモ', type: 'text' },
  { key: 'address', label: '住所', type: 'text', fullWidth: true },
  { key: 'active', label: '有効', type: 'checkbox' },
]

function companyName(companies: Company[], id?: string): string {
  if (!id) return '—'
  return companies.find((c) => c.id === id)?.name ?? '—'
}

function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function useNotify() {
  return useUiStore((s) => s.notify)
}
