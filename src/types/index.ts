export type Status = 'Pendiente' | 'En atención' | 'Atendido' | 'Archivado'
export type View = 'inicio' | 'expedientes' | 'nuevo' | 'reportes' | 'memos'
export type Role = 'MesaPartes' | 'AreaOperativa' | 'Administrador' | 'Auditor'

export type User = {
  id: string
  nombre: string
  email: string
  rol: Role
  area?: string
  activo: boolean
}

export type HistoryEntry = {
  fechaHora: string
  fechaIngreso?: string
  fechaSalida?: string
  areaOrigen: string
  areaDestino: string
  accion: string
  observacion: string
  responsable: string
  responsableDestino?: string
}

export type Memo = {
  id: string
  nroMemo: string
  expedienteId: string
  nroExpediente: string
  fecha: string
  destinatario: string
  asunto: string
  secretaria: string
  areaDestino: string
  recepcionadoPor: string
  fechaRecepcion: string
  estado: 'Enviado' | 'Recepcionado' | 'Atendido' | 'Anulado'
  createdAt?: string
}

export type Expediente = {
  id: string
  nroExp: string
  esDuplicado?: boolean
  fechaIngreso?: string
  remitente: string
  documento: string
  tipo: string
  asunto: string
  area: string
  estado: Status
  fecha: string
  plazo: string
  prioridad: 'Normal' | 'Alta'
  archivo: string
  archivoData?: string
  archivoTipo?: string
  archivoTamano?: number
  archivoDescripcion?: string
  documentos?: string
  modalidadRecepcion?: string
  entregadoA?: string
  documentoSeguimiento?: string
  canalRecepcion?: string
  contenido?: string
  folios?: number
  anexos?: number
  correo?: string
  celular?: string
  direccion?: string
  representante?: string
  cargoRepresentante?: string
  usuarioRegistro?: string
  fechaHoraRecepcion?: string
  constanciaRecepcion?: string
  remitenteNombre?: string
  remitenteCargo?: string
  areaDestino?: string
  historial?: HistoryEntry[]
}
