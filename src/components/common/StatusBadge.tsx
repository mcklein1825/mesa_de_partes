import {
  Archive,
  Ban,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileCheck2,
  Inbox,
  Send
} from 'lucide-react'

export default function StatusBadge({ status }: { status: string }) {
  const statusClass = (status || '').toLowerCase().replace(/\s+/g, '-')
  const Icon = statusClass === 'atendido' || statusClass === 'recepcionado'
    ? CheckCircle2
    : statusClass === 'archivado'
      ? Archive
      : statusClass === 'anulado'
        ? Ban
        : statusClass === 'enviado'
          ? Send
          : statusClass === 'sin-respuesta'
            ? CircleAlert
            : statusClass === 'solo-registro'
              ? FileCheck2
              : statusClass === 'pendiente'
                ? Clock3
                : Inbox

  return (
    <span
      className={`status-badge ${statusClass}`}
      role="status"
    >
      <Icon size={14} aria-hidden="true" />
      {status}
    </span>
  )
}