import {
  Archive,
  Ban,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileCheck2,
  FolderOpen,
  Inbox,
  Send
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Clave CSS estable: minusculas, sin tildes, espacios como guiones. */
const normalizeStatus = (status: string): string =>
  (status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')

const STATUS_ICONS: Record<string, LucideIcon> = {
  pendiente: Clock3,
  'sin-respuesta': CircleAlert,
  'en-atencion': FolderOpen,
  atendido: CheckCircle2,
  recepcionado: CheckCircle2,
  entregado: CheckCircle2,
  archivado: Archive,
  anulado: Ban,
  enviado: Send,
  'solo-registro': FileCheck2
}

export const getStatusConfig = (status: string): { className: string; icon: LucideIcon } => {
  const className = normalizeStatus(status)
  return { className, icon: STATUS_ICONS[className] ?? Inbox }
}