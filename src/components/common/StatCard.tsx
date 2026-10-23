import type { ReactNode } from 'react'

export default function StatCard({
  label,
  value,
  detail,
  tone,
  icon,
  onClick
}: {
  label: string
  value: number
  detail: string
  tone: string
  icon: ReactNode
  onClick?: () => void
}) {
  const isClickable = typeof onClick === 'function'

  return (
    <div
      className="stat-card"
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      style={{ cursor: isClickable ? 'pointer' : undefined }}
    >
      <div className={`stat-icon ${tone}`} aria-hidden="true">
        {icon}
      </div>
      <div className="stat-card-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={tone === 'green' ? 'positive' : ''}>
          {detail}
        </small>
      </div>
    </div>
  )
}