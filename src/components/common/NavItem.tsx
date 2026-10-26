
import type { ReactNode } from 'react'

export default function NavItem({
  icon,
  label,
  active,
  count,
  onClick
}: {
  icon: ReactNode
  label: string
  active: boolean
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`nav-item ${active ? 'active' : ''}`}
      onClick={onClick}
      title={label}
      aria-current={active ? 'page' : undefined}
    >
      <span className="nav-icon" aria-hidden="true">{icon}</span>
      <span className="nav-label">{label}</span>
      {count !== undefined && count > 0 ? (
        <em>{count}</em>
      ) : null}
    </button>
  )
}
