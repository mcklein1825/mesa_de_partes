import { Status } from '../../types'
export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge ${status.toLowerCase().replace(' ', '-')}`}>
      <i /> {status}
    </span>
  )
}