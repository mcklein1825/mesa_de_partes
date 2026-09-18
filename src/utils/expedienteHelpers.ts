import { Expediente, HistoryEntry } from '../types'
import { AREA_RESPONSABLES } from '../constants'

export const splitRemitente = (value: string) => {
  const [name, ...cargo] = value.split(/\s*-\s*/, 2)
  return { nombre: name.trim(), cargo: cargo.join(' - ').trim() }
}

export const getRemitenteNombre = (item: Expediente) =>
  item.remitenteNombre || splitRemitente(item.remitente).nombre

export const getRemitenteCargo = (item: Expediente) =>
  item.remitenteCargo || splitRemitente(item.remitente).cargo

export const getAreaDestino = (item: Expediente) =>
  item.areaDestino || item.entregadoA || item.area || 'Pendiente de asignación'

export const formatNroExp = (nroExp: string, esDuplicado = false) =>
  `EXP-2026-${String(nroExp).padStart(5, '0')}${esDuplicado ? ' *' : ''}`

export const getRecordedResponsible = (item: Expediente) => {
  const followUp = item.documentoSeguimiento || ''
  const match = followUp.match(/(?:a|por)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ]+){1,3})/)
  return match?.[1]?.trim() || ''
}

export const createInitialHistory = (item: Expediente): HistoryEntry[] => [
  {
    fechaHora: item.fechaIngreso || item.fecha || 'Fecha pendiente',
    fechaIngreso: item.fechaIngreso || item.fecha || 'Fecha pendiente',
    areaOrigen: 'Mesa de Partes',
    areaDestino: getAreaDestino(item),
    accion: 'Pendiente',
    observacion: 'Expediente recibido y pendiente de asignación.',
    responsable: item.usuarioRegistro || 'Responsable no registrado'
  },
  ...(item.estado !== 'Pendiente' ? [{
    fechaHora: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
    fechaSalida: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
    fechaIngreso: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
    areaOrigen: 'Mesa de Partes',
    areaDestino: getAreaDestino(item),
    accion: 'Derivado para atención',
    observacion: 'Expediente enviado al área responsable para su revisión.',
    responsable: item.usuarioRegistro || 'Responsable no registrado'
  }] : []),
  ...(['Atendido', 'Archivado'].includes(item.estado) ? [{
    fechaHora: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
    fechaSalida: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
    areaOrigen: getAreaDestino(item),
    areaDestino: 'Mesa de Partes',
    accion: item.estado === 'Archivado' ? 'Archivado' : 'Atendido',
    observacion: item.estado === 'Archivado' ? 'Expediente archivado luego de su atención.' : 'La oficina responsable registró la atención del expediente.',
    responsable: getRecordedResponsible(item) || 'Responsable no registrado'
  }] : [])
]

export const normalizeExpediente = (item: Expediente): Expediente => {
  const parts = splitRemitente(item.remitente)
  return {
    ...item,
    remitenteNombre: item.remitenteNombre || parts.nombre,
    remitenteCargo: item.remitenteCargo || parts.cargo,
    areaDestino: item.areaDestino || item.entregadoA || item.area || '',
    historial: item.historial?.length ? item.historial : createInitialHistory(item)
  }
}

export const formatDate = (value: string) => {
  const cleanValue = value.trim()
  if (cleanValue.includes('-')) {
    const [year, month, day] = cleanValue.split('-')
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
  }
  const parts = cleanValue.split('/')
  return parts.length === 3 ? `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}` : cleanValue
}

export const todayInputValue = () => new Date().toISOString().slice(0, 10)
export const displayDate = (value: string) => formatDate(value) || 'Pendiente'

export const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export const daysUntilDeadline = (deadlineDate: string): number => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const deadline = new Date(deadlineDate.split('/').reverse().join('-'))
  const diffTime = deadline.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export const calculateAverageResolutionTime = (expedientes: Expediente[]): number => {
  const attended = expedientes.filter(e => e.estado === 'Atendido' || e.estado === 'Archivado')
  if (attended.length === 0) return 0
  let totalDays = 0, count = 0
  attended.forEach(exp => {
    const startDate = exp.fechaIngreso || exp.fecha
    if (!startDate) return
    const attendedEntry = exp.historial?.find(h => h.accion === 'Atendido' || h.accion === 'Archivado')
    if (!attendedEntry?.fechaHora) return
    const start = new Date(startDate.split('/').reverse().join('-'))
    const end = new Date(attendedEntry.fechaHora)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return
    const diffTime = Math.abs(end.getTime() - start.getTime())
    totalDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    count++
  })
  return count > 0 ? Math.round(totalDays / count) : 0
}

export const exportReportToCSV = (expedientes: Expediente[]) => {
  const headers = ['Nro. Expediente', 'Fecha', 'Remitente', 'Asunto', 'Área', 'Estado', 'Prioridad', 'Plazo']
  const rows = expedientes.map(e => [
    formatNroExp(e.nroExp), e.fechaIngreso || e.fecha, getRemitenteNombre(e),
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