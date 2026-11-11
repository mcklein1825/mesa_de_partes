export type Status = 'Pendiente' | 'Sin respuesta' | 'Atendido' | 'Archivado'
export type View = 'inicio' | 'expedientes' | 'reportes' | 'memos' | 'memos-multiples' | 'oficios' | 'proveidos'
export type Role = 'DireccionGeneral' | 'AreaOperativa' | 'Administrador' | 'Auditor'

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
  realizadoPor: string
  areaDestino: string
  responsable: string
  enviaCopia?: boolean
  destinatarioCopia?: string
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
  realizadoPor: string
  responsable: string
  codigoOad: string
  codigoOgesup: string
  anio: number
  areaDestino: string
  estado: 'Enviado' | 'Recepcionado' | 'Atendido' | 'Anulado'
  archivo?: string
  archivoData?: string
  archivoTipo?: string
  archivoTamano?: number
  fechaRegistro?: string
  createdAt?: string
}

export type Proveido = {
  id: string
  expedienteId: string
  nroExpediente: string
  fecha: string
  realizadoPor: string
  areaDestino: string
  responsable: string
  instruccion: string
  estado: 'Pendiente' | 'Atendido' | 'Archivado'
  archivo?: string
  archivoData?: string
  archivoTipo?: string
  archivoTamano?: number
  createdAt?: string
}

export type MemorandoMultipleCategoria =
  | 'Área / Jefatura'
  | 'Consejo Directivo'
  | 'Comité'
  | 'Grupo institucional'

export type MemorandoMultipleMedio = 'Correo' | 'Presencial'
export type MemorandoMultipleEstado = 'Pendiente' | 'Entregado' | 'Atendido'

export type MemorandoMultipleDestinatario = {
  id: string
  categoria: MemorandoMultipleCategoria
  nombre: string
  medioEntrega: MemorandoMultipleMedio
  estado: MemorandoMultipleEstado
  observacion: string
  fechaEntrega?: string
}

export type MemorandoMultiple = {
  id: string
  expedienteId: string
  nroExpediente: string
  nroRegistro: string
  fecha: string
  asunto: string
  realizadoPor: string
  estado: MemorandoMultipleEstado
  destinatarios: MemorandoMultipleDestinatario[]
  createdAt?: string
}

export type Expediente = {
  id: string
  nroExp: string
  esDuplicado?: boolean
  requiereGestion: boolean
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
