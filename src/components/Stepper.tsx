import './stepper.css'

interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  step?: number
  disabled?: boolean
  suffix?: string
  size?: 'md' | 'lg'
}

/** ＋− ボタン付きの数値入力（PC不慣れな人でも打鍵せず増減できる） */
export function Stepper({ value, onChange, min = 0, step = 1, disabled, suffix, size = 'md' }: StepperProps) {
  const set = (n: number) => onChange(Math.max(min, n))
  return (
    <div className={`stepper stepper-${size} ${disabled ? 'is-disabled' : ''}`}>
      <button type="button" className="stepper-btn" onClick={() => set(value - step)} disabled={disabled} aria-label="減らす">
        −
      </button>
      <input
        className="stepper-input num"
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => set(e.target.value === '' ? min : Number(e.target.value))}
      />
      {suffix && <span className="stepper-suffix">{suffix}</span>}
      <button type="button" className="stepper-btn" onClick={() => set(value + step)} disabled={disabled} aria-label="増やす">
        ＋
      </button>
    </div>
  )
}
