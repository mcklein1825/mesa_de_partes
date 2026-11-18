import { getStatusConfig } from './statusConfig'

export default function StatusBadge({ status }: { status: string }) {
  const { className, icon: Icon } = getStatusConfig(status)

  return (
    <span className={`status-badge ${className}`} role="status">
      <Icon size={14} aria-hidden="true" />
      {status}
    </span>
  )
}