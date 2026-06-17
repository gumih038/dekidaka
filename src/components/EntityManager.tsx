import { type ReactNode, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { Modal } from './Modal'
import './entity-manager.css'

export type FieldType =
  | 'text'
  | 'number'
  | 'yen'
  | 'textarea'
  | 'checkbox'
  | 'select'
  | 'date'
  | 'image'
  | 'password'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
  suffix?: string
  fullWidth?: boolean
  help?: string
}

export interface ColumnDef<T> {
  header: string
  align?: 'right'
  render: (item: T) => ReactNode
}

interface EntityManagerProps<T extends { id: string }> {
  title: string
  subtitle?: string
  items: T[]
  columns: ColumnDef<T>[]
  fields: FieldDef[]
  makeNew: () => T
  onSave: (item: T) => void
  onDelete: (id: string) => void
  canEdit: boolean
  searchText?: (item: T) => string
  addLabel?: string
}

type Draft = Record<string, unknown>

export function EntityManager<T extends { id: string }>({
  title,
  subtitle,
  items,
  columns,
  fields,
  makeNew,
  onSave,
  onDelete,
  canEdit,
  searchText,
  addLabel = '新規追加',
}: EntityManagerProps<T>) {
  const [editing, setEditing] = useState<Draft | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim() || !searchText) return items
    const q = query.trim().toLowerCase()
    return items.filter((it) => searchText(it).toLowerCase().includes(q))
  }, [items, query, searchText])

  function startNew() {
    setEditing(makeNew() as Draft)
    setIsNew(true)
  }
  function startEdit(item: T) {
    setEditing({ ...(item as object) } as Draft)
    setIsNew(false)
  }
  function save() {
    if (!editing) return
    onSave(editing as unknown as T)
    setEditing(null)
  }

  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="muted em-subtitle">{subtitle}</p>}
        </div>
        <div className="row">
          {searchText && (
            <div className="em-search">
              <Icon name="search" size={15} />
              <input
                className="em-search-input"
                placeholder="検索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={startNew}>
              <Icon name="plus" size={15} />
              {addLabel}
            </button>
          )}
        </div>
      </header>
      <div className="em-table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={c.align === 'right' ? 'right' : undefined}>
                  {c.header}
                </th>
              ))}
              {canEdit && <th style={{ width: 96 }} />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                {columns.map((c, i) => (
                  <td key={i} className={c.align === 'right' ? 'right num' : undefined}>
                    {c.render(item)}
                  </td>
                ))}
                {canEdit && (
                  <td className="right">
                    <div className="row em-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(item)} aria-label="編集">
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm danger-hover"
                        onClick={() => {
                          if (confirm('削除しますか？')) onDelete(item.id)
                        }}
                        aria-label="削除"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="empty">
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal
          title={isNew ? `${title} — 新規追加` : `${title} — 編集`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>
                キャンセル
              </button>
              <button className="btn btn-primary" onClick={save}>
                保存
              </button>
            </>
          }
        >
          <div className="em-form">
            {fields.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={editing[f.key]}
                onChange={(v) => setEditing({ ...editing, [f.key]: v })}
              />
            ))}
          </div>
        </Modal>
      )}
    </section>
  )
}

interface FieldInputProps {
  field: FieldDef
  value: unknown
  onChange: (value: unknown) => void
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  const cls = field.fullWidth ? 'field em-field-full' : 'field'

  if (field.type === 'checkbox') {
    return (
      <label className="em-checkbox">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span>{field.label}</span>
      </label>
    )
  }

  if (field.type === 'image') {
    const src = typeof value === 'string' ? value : ''
    return (
      <div className={cls}>
        <label>{field.label}</label>
        <div className="em-image">
          {src ? <img src={src} alt="ロゴ" className="em-logo-preview" /> : <span className="muted">未設定</span>}
          <div className="row">
            <label className="btn btn-sm">
              画像を選択
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => onChange(reader.result as string)
                  reader.readAsDataURL(file)
                }}
              />
            </label>
            {src && (
              <button className="btn btn-sm" onClick={() => onChange('')}>
                削除
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cls}>
      <label>{field.label}</label>
      {field.type === 'select' ? (
        <select className="select" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">（選択）</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          className="textarea"
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="em-input-suffix">
          <input
            className={`input ${field.type === 'number' || field.type === 'yen' ? 'num' : ''}`}
            type={field.type === 'password' ? 'password' : field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'yen' ? 'number' : 'text'}
            value={value === undefined || value === null ? '' : String(value)}
            placeholder={field.placeholder}
            onChange={(e) =>
              onChange(
                field.type === 'number' || field.type === 'yen'
                  ? e.target.value === ''
                    ? 0
                    : Number(e.target.value)
                  : e.target.value,
              )
            }
          />
          {field.suffix && <span className="em-suffix">{field.suffix}</span>}
        </div>
      )}
      {field.help && <span className="em-help muted">{field.help}</span>}
    </div>
  )
}
