export type Status = 'Pendiente' | 'Sin respuesta' | 'Atendido' | 'Archivado'
export type View = 'inicio' | 'expedientes' | 'nuevo' | 'reportes' | 'memos' | 'oficios'| 'proveidos'
export type Role = 'MesaPartes' | 'AreaOperativa' | 'Administrador' | 'Auditor'

export type User = {
  id: string
  nombre: string
  email: string
  rol: Role
  area?: string
  secretaria?: string
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
  asunto: string
  registradoPor: string
  areaDestino: string
  responsable: string
  estado: 'Pendiente' | 'Sin respuesta' | 'Atendido' | 'Archivado'
  archivo?: string
  archivoData?: string
  archivoTipo?: string
  archivoTamano?: number
  createdAt?: string
}
export type Oficio = {
  id: string
  nRegistro: string
  expedienteId: string
  nroExpediente: string
  fecha: string
  destinatario: string
  asuntoTipo: string
  asuntoDetalle: string
  responsable: string
  codigoOad: string
  codigoOgesup: string
  anio: number
  areaDestino: string
  estado: 'Enviado' | 'Recepcionado' | 'Atendido' | 'Anulado'
  fechaRegistro?: string
  createdAt?: string
}
export type Proveido = {
  id: string
  expedienteId: string
  nroExpediente: string
  fecha: string
  areaDestino: string
  responsable: string
  instruccion: string
  estado: 'Pendiente' | 'Atendido' | 'Archivado'
  createdAt?: string
}

export type Expediente = {
  id: string
  nroExp: string
  esDuplicado?: boolean
  fechaIngreso?: string
  remitente: string
  asunto: string
  area: string
  estado: Status
  plazo: string
  fechaSinRespuesta?: string
  prioridad: 'Normal' | 'Alta'
  archivo: string
  archivoData?: string
  archivoTipo?: string
  archivoTamano?: number
  documentos?: string
  modalidadRecepcion?: string
  entregadoA?: string
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
  areaDestino?: string
  historial?: HistoryEntry[]
}
