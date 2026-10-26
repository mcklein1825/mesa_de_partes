import { Expediente, HistoryEntry } from '../types'
import { AREA_RESPONSABLES } from '../constants'

export const getRemitenteNombre = (item: Expediente) =>
  item.remitenteNombre || ''

export const getAreaDestino = (item: Expediente) =>
  item.areaDestino || item.entregadoA || item.area || 'Pendiente de asignación'

export const formatNroExp = (nroExp: string, esDuplicado = false) =>
  `EXP-2026-${String(nroExp).padStart(5, '0')}${esDuplicado ? ' *' : ''}`

export const createInitialHistory = (item: Expediente): HistoryEntry[] => [
  {
    fechaHora: item.fechaIngreso || 'Fecha pendiente',
    fechaIngreso: item.fechaIngreso || 'Fecha pendiente',
    areaOrigen: 'Mesa de Partes',
    areaDestino: getAreaDestino(item),
    accion: 'Pendiente',
    observacion: 'Expediente recibido y pendiente de asignación.',
    responsable: item.usuarioRegistro || 'Responsable no registrado'
  },
  ...(item.estado !== 'Pendiente' ? [{
    fechaHora: item.fechaHoraRecepcion || item.fechaIngreso || 'Fecha pendiente',
    fechaSalida: item.fechaHoraRecepcion || item.fechaIngreso || 'Fecha pendiente',
    fechaIngreso: item.fechaHoraRecepcion || item.fechaIngreso || 'Fecha pendiente',
    areaOrigen: item.usuarioRegistro?.split(' - ')[1]?.trim() || 'Mesa de Partes',
    areaDestino: getAreaDestino(item),
    accion: 'Derivado para atención',
    observacion: 'Expediente enviado al área responsable para su revisión.',
    responsable: item.usuarioRegistro || 'Responsable no registrado'
  }] : []),
  ...(['Atendido', 'Archivado'].includes(item.estado) ? [{
    fechaHora: item.fechaHoraRecepcion || item.fechaIngreso || 'Fecha pendiente',
    fechaSalida: item.fechaHoraRecepcion || item.fechaIngreso || 'Fecha pendiente',
    areaOrigen: getAreaDestino(item),
    areaDestino: 'Mesa de Partes',
    accion: item.estado === 'Archivado' ? 'Archivado' : 'Atendido',
    observacion: item.estado === 'Archivado' ? 'Expediente archivado luego de su atención.' : 'La oficina responsable registró la atención del expediente.',
    responsable: item.usuarioRegistro || 'Responsable no registrado'
  }] : [])
]

export const normalizeExpediente = (item: Expediente): Expediente => {
  return {
    ...item,
    remitenteNombre: item.remitenteNombre || '',
    areaDestino: item.areaDestino || item.entregadoA || item.area || '',
    historial: item.historial?.length ? item.historial : createInitialHistory(item)
  }
}
export const parseDate = (value: string): Date | null => {
  if (!value) return null
  const clean = value.trim()

  // ISO con timezone explícito (Z, ±HH:MM, ±HHMM) → parser nativo
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/.test(clean)) {
    const d = new Date(clean)
    return isNaN(d.getTime()) ? null : d
  }

  // AAAA-MM-DD[ T HH:MM[:SS[.mmm]]] sin timezone → hora local
  const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/)
  if (iso) {
    const [, y, m, d, h, mi, s] = iso
    const date = new Date(+y, +m - 1, +d, h ? +h : 0, mi ? +mi : 0, s ? +s : 0)
    if (date.getFullYear() !== +y || date.getMonth() !== +m - 1 || date.getDate() !== +d) return null
    return date
  }

  // DD/MM/AAAA[ HH:MM[:SS]] → hora local
  const dmy = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (dmy) {
    const [, d, m, y, h, mi, s] = dmy
    const date = new Date(+y, +m - 1, +d, h ? +h : 0, mi ? +mi : 0, s ? +s : 0)
    if (date.getFullYear() !== +y || date.getMonth() !== +m - 1 || date.getDate() !== +d) return null
    return date
  }

  return null
}
export const formatDate = (value: string) => {
  const date = parseDate(value)
  if (!date) return value.trim()
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getFullYear()}`
}

export const formatDateTime = (value: string) => {
  const date = parseDate(value)
  if (!date) return value.trim()
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${d}/${m}/${date.getFullYear()} ${hh}:${mm}`
}

export const todayInputValue = () => new Date().toISOString().slice(0, 10)
export const displayDate = (value: string) => formatDate(value) || 'Pendiente'

export const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export const daysUntilDeadline = (deadlineDate: string): number => {
  const deadline = parseDate(deadlineDate)
  if (!deadline) return Number.NaN
  deadline.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
}
export type DeadlineKind =
  | 'sin_plazo'
  | 'no_aplica'
  | 'vencido'
  | 'por_vencer'
  | 'vigente'

export interface DeadlineState {
  kind: DeadlineKind
  daysLeft: number | null
  label: string
}

export const getDeadlineState = (
  item: Pick<Expediente, 'estado' | 'plazo'>
): DeadlineState => {
  const plazo = (item.plazo || '').trim()

  if (!plazo) {
    return { kind: 'sin_plazo', daysLeft: null, label: 'Sin fecha límite' }
  }

  const days = daysUntilDeadline(plazo)

  if (!Number.isFinite(days)) {
    return { kind: 'sin_plazo', daysLeft: null, label: 'Fecha inválida' }
  }

  const aplica =
    item.estado === 'Pendiente' || item.estado === 'Sin respuesta'

  if (!aplica) {
    return { kind: 'no_aplica', daysLeft: days, label: '' }
  }

  if (days < 0) {
    const n = Math.abs(days)
    return {
      kind: 'vencido',
      daysLeft: days,
      label: `Vencido hace ${n} ${n === 1 ? 'día' : 'días'}`
    }
  }

  if (days === 0) {
    return { kind: 'por_vencer', daysLeft: 0, label: 'Vence hoy' }
  }

  if (days === 1) {
    return { kind: 'por_vencer', daysLeft: 1, label: 'Vence mañana' }
  }

  if (days <= 3) {
    return {
      kind: 'por_vencer',
      daysLeft: days,
      label: `Vence en ${days} días`
    }
  }

  return {
    kind: 'vigente',
    daysLeft: days,
    label: `Vence en ${days} días`
  }
}

export const calculateAverageResolutionTime = (expedientes: Expediente[]): number => {
  const attended = expedientes.filter(e => e.estado === 'Atendido' || e.estado === 'Archivado')
  if (attended.length === 0) return 0
  let totalDays = 0, count = 0
  attended.forEach(exp => {
    const startDate = exp.fechaIngreso
    if (!startDate) return
    const attendedEntry = exp.historial?.find(h => h.accion === 'Atendido' || h.accion === 'Archivado')
    if (!attendedEntry?.fechaHora) return
    const start = parseDate(startDate)
    const end = parseDate(attendedEntry.fechaHora)
    if (!start || !end) return
    const diffTime = Math.abs(end.getTime() - start.getTime())
    totalDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    count++
  })
  return count > 0 ? Math.round(totalDays / count) : 0
}

export const exportReportToCSV = (expedientes: Expediente[]) => {
  const headers = ['Nro. Expediente', 'Fecha', 'Remitente', 'Asunto', 'Área', 'Estado', 'Prioridad', 'Plazo']
  const rows = expedientes.map(e => [
    formatNroExp(e.nroExp), e.fechaIngreso || '', getRemitenteNombre(e),
    `"${e.asunto.replace(/"/g, '""')}"`, getAreaDestino(e), e.estado, e.prioridad, e.plazo
  ])
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte-expedientes-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer el archivo.'))
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })