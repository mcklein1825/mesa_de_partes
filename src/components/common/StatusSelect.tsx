import { ChevronDown } from 'lucide-react'
import { getStatusConfig } from './statusConfig'

export type StatusOption = {
  value: string
  label?: string
  disabled?: boolean
}

export default function StatusSelect({
  status,
  options,
  onChange,
  disabled = false,
  label = 'Cambiar estado'
}: {
  status: string
  options: StatusOption[]
  onChange: (next: string) => void
  disabled?: boolean
  label?: string
}) {
  const { className, icon: Icon } = getStatusConfig(status)

  return (
    <span
      className={`status-badge status-select ${className}${disabled ? ' is-disabled' : ''}`}
    >
      <Icon size={14} aria-hidden="true" />
      <span className="status-select-value">{status}</span>
      {!disabled && (
        <ChevronDown size={12} className="status-select-chevron" aria-hidden="true" />
      )}
      <select
        className="status-select-native"
        value={status}
        disabled={disabled}
        aria-label={label}
        title={disabled ? undefined : label}
        onChange={event => onChange(event.target.value)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label ?? option.value}
          </option>
        ))}
      </select>
    </span>
  )
}