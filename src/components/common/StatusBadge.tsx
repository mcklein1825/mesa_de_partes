
import type { Status } from '../../types'

const statusClasses: Record<Status, string> = {
  'Pendiente': 'pendiente',
  'Sin respuesta': 'sin-respuesta',
  'Atendido': 'atendido',
  'Archivado': 'archivado'
}

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`status-badge ${statusClasses[status]}`}
      role="status"
    >
      <i aria-hidden="true" />
      {status}
    </span>
  )
}
