// Tipos centrales para la gestión de expedientes - Sincronizados con Supabase

export type Status = 'Pendiente' | 'En atención' | 'Atendido' | 'Archivado' | 'Anulado'
export type Prioridad = 'Normal' | 'Alta' | 'Urgente' | 'Muy Urgente'
export type TipoIdentificacion = 'DNI' | 'RUC' | 'CE' | 'Pasaporte'
export type RolSistema = 'Administrador' | 'MesaPartes' | 'AreaOperativa' | 'Auditor'
export type AccionMovimiento = 'Registro' | 'Derivación' | 'Atención' | 'Archivo' | 'Anulación'

export type HistoryEntry = {
  fechaHora: string
  fechaIngreso?: string
  fechaSalida?: string
  areaOrigen: string
  areaDestino: string
  accion: string
  observacion: string
  responsable: string
}

// Tipo para Expediente según esquema de Supabase
export type ExpedienteDB = {
  id: string
  numero_expediente: string
  anio: number
  correlativo: number
  remitente_id: string | null
  tipo_documento_id: string | null
  documento_numero: string | null
  tipo: string | null
  asunto: string
  contenido: string | null
  area_origen_id: string | null
  area_destino_id: string | null
  ubicacion_actual_id: string | null
  estado: Status
  prioridad: Prioridad
  fecha_ingreso: string
  fecha_limite: string | null
  fecha_atencion: string | null
  fecha_archivo: string | null
  canal_recepcion: string | null
  modalidad_recepcion: string | null
  entregado_a: string | null
  documento_seguimiento: string | null
  folios: number
  anexos: number
  constancia_recepcion: string | null
  observacion_anulacion: string | null
  registrado_por: string | null
  created_at: string
  updated_at: string
  
  // Campos virtuales para UI (se llenan con joins)
  remitente_nombre?: string
  area_origen_nombre?: string
  area_destino_nombre?: string
  ubicacion_actual_nombre?: string
  tipo_documento_nombre?: string
}

// Tipo legacy para compatibilidad con el frontend actual
export type Expediente = {
  id: string
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
  modalidadRecepcion?: 'Presencial' | 'Virtual'
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

export interface Movimiento {
  id: string
  expediente_id: string
  accion: AccionMovimiento
  area_origen_id?: string
  area_destino_id?: string
  responsable_id?: string
  fecha_salida?: string
  fecha_ingreso?: string
  fecha_atencion?: string
  observacion?: string
  created_at: string
}

export interface Area {
  id: string
  nombre: string
  codigo?: string
  area_padre_id?: string
  activa: boolean
  created_at: string
}

export interface Remitente {
  id: string
  tipo_identificacion?: TipoIdentificacion
  numero_identificacion?: string
  nombre_o_razon_social: string
  cargo?: string
  representante?: string
  cargo_representante?: string
  direccion?: string
  correo?: string
  celular?: string
  created_at: string
  updated_at: string
}

export interface TipoDocumento {
  id: string
  nombre: string
  codigo?: string
  plazo_dias: number
  activo: boolean
  created_at: string
}

export interface Perfil {
  id: string
  nombres: string
  apellidos: string
  cargo?: string
  correo_institucional?: string
  area_id?: string
  rol_id: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Rol {
  id: string
  nombre: RolSistema
  descripcion?: string
  created_at: string
}

export interface Adjunto {
  id: string
  expediente_id: string
  nombre_archivo: string
  ruta_storage: string
  mime_type: string
  tamano_bytes?: number
  sha256?: string
  descripcion?: string
  subido_por?: string
  created_at: string
}

export interface AccesoExpediente {
  id: string
  expediente_id: string
  usuario_id?: string
  accion: string
  ip?: string
  user_agent?: string
  created_at: string
}

export interface Auditoria {
  id: string
  usuario_id?: string
  tabla_afectada: string
  registro_id?: string
  operacion: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  datos_anteriores?: any
  datos_nuevos?: any
  created_at: string
}

// Roles del sistema
export type Role = 'MesaPartes' | 'AreaOperativa' | 'Administrador' | 'Auditor'

// Usuario del sistema
export type User = {
  id: string
  nombre: string
  email: string
  rol: Role
  area?: string
  activo: boolean
}

// Permisos por rol
export type RolePermissions = {
  puedeRegistrar: boolean
  puedeDerivar: boolean
  puedeAtender: boolean
  puedeArchivar: boolean
  puedeEditar: boolean
  puedeVerReportes: boolean
  puedeVerTodos: boolean
}

// Transiciones válidas de estado (Máquina de Estados Finita)
export const VALID_TRANSITIONS: Record<Status, Status[]> = {
  'Pendiente': ['En atención'],
  'En atención': ['Atendido', 'Archivado'],
  'Atendido': ['Archivado'],
  'Archivado': [], // Estado terminal
  'Anulado': [], // Estado terminal
}

// Permisos por rol
export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  MesaPartes: { puedeRegistrar: true, puedeDerivar: true, puedeAtender: false, puedeArchivar: false, puedeEditar: true, puedeVerReportes: true, puedeVerTodos: true },
  AreaOperativa: { puedeRegistrar: false, puedeDerivar: false, puedeAtender: true, puedeArchivar: false, puedeEditar: false, puedeVerReportes: false, puedeVerTodos: false },
  Administrador: { puedeRegistrar: true, puedeDerivar: true, puedeAtender: true, puedeArchivar: true, puedeEditar: true, puedeVerReportes: true, puedeVerTodos: true },
  Auditor: { puedeRegistrar: false, puedeDerivar: false, puedeAtender: false, puedeArchivar: false, puedeEditar: false, puedeVerReportes: true, puedeVerTodos: true },
}
