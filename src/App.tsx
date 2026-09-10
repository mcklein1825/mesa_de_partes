import { FormEvent, useEffect, useMemo, useState, useRef } from 'react'
import { 
  FileText, 
  PlusCircle, 
  Search, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Archive, 
  Users, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ChevronDown, 
  LogOut,
  UserCircle,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  X,
  Check,
  ArrowRight,
  FolderOpen,
  Bell,
  Settings,
  HelpCircle,
  Menu,
  Home,
  FilePlus,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import importedExpedientes from './data/expedientes.csv.json'

// Estados permitidos durante el ciclo de vida de un expediente (Máquina de Estados Finita).
type Status = 'Pendiente' | 'En atención' | 'Atendido' | 'Archivado'
// Pantallas principales disponibles en la aplicación.
type View = 'inicio' | 'expedientes' | 'nuevo' | 'reportes'

// Roles del sistema con permisos específicos
type Role = 'MesaPartes' | 'AreaOperativa' | 'Administrador' | 'Auditor'

// Usuario del sistema con autenticación básica
type User = {
  id: string
  nombre: string
  email: string
  rol: Role
  area?: string
  activo: boolean
}

// Permisos por rol
const ROLE_PERMISSIONS: Record<Role, {
  puedeRegistrar: boolean
  puedeDerivar: boolean
  puedeAtender: boolean
  puedeArchivar: boolean
  puedeEditar: boolean
  puedeVerReportes: boolean
  puedeVerTodos: boolean
}> = {
  MesaPartes: { puedeRegistrar: true, puedeDerivar: true, puedeAtender: false, puedeArchivar: false, puedeEditar: true, puedeVerReportes: true, puedeVerTodos: true },
  AreaOperativa: { puedeRegistrar: false, puedeDerivar: false, puedeAtender: true, puedeArchivar: false, puedeEditar: false, puedeVerReportes: false, puedeVerTodos: false },
  Administrador: { puedeRegistrar: true, puedeDerivar: true, puedeAtender: true, puedeArchivar: true, puedeEditar: true, puedeVerReportes: true, puedeVerTodos: true },
  Auditor: { puedeRegistrar: false, puedeDerivar: false, puedeAtender: false, puedeArchivar: false, puedeEditar: false, puedeVerReportes: true, puedeVerTodos: true },
}

// Transiciones válidas de estado (Máquina de Estados Finita)
const VALID_TRANSITIONS: Record<Status, Status[]> = {
  'Pendiente': ['En atención'],
  'En atención': ['Atendido', 'Archivado'],
  'Atendido': ['Archivado'],
  'Archivado': [], // Estado terminal
}

// Usuario actual por defecto (en producción esto vendría de un backend)
const DEFAULT_USER: User = {
  id: 'USR-001',
  nombre: 'Lucía Ramírez',
  email: 'lucia.ramirez@institucion.gob.pe',
  rol: 'MesaPartes',
  area: 'Mesa de Partes',
  activo: true,
}

// Un movimiento representa un paso de trazabilidad del expediente.
type HistoryEntry = {
  fechaHora: string
  fechaIngreso?: string
  fechaSalida?: string
  areaOrigen: string
  areaDestino: string
  accion: string
  observacion: string
  responsable: string
}

type Expediente = {
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

// Catálogo local utilizado para derivar expedientes desde la consulta.
const areas = ['Dirección General', 'Recursos Humanos', 'Administración', 'Oficina de TI', 'Asesoría Jurídica']

// Divide los datos históricos que estaban guardados como "Nombre-Cargo".
const splitRemitente = (value: string) => {
  const [name, ...cargo] = value.split(/\s*-\s*/, 2)
  return { nombre: name.trim(), cargo: cargo.join(' - ').trim() }
}

// Devuelve el nombre normalizado, con compatibilidad para registros antiguos.
const getRemitenteNombre = (item: Expediente) => item.remitenteNombre || splitRemitente(item.remitente).nombre
// Devuelve el cargo normalizado, sin mostrar textos vacíos como "No especificado".
const getRemitenteCargo = (item: Expediente) => item.remitenteCargo || splitRemitente(item.remitente).cargo
// Obtiene el área actual; si aún no se deriva, informa que está pendiente.
const getAreaDestino = (item: Expediente) => item.areaDestino || item.entregadoA || item.area || 'Pendiente de asignación'

// Extrae un nombre escrito dentro de una observación histórica, si existe.
const getRecordedResponsible = (item: Expediente) => {
  const followUp = item.documentoSeguimiento || ''
  const match = followUp.match(/(?:a|por)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ]+){1,3})/)
  return match?.[1]?.trim() || ''
}

// Construye una trazabilidad mínima para expedientes importados sin historial.
const createInitialHistory = (item: Expediente): HistoryEntry[] => [{
  fechaHora: item.fechaIngreso || item.fecha || 'Fecha pendiente',
  fechaIngreso: item.fechaIngreso || item.fecha || 'Fecha pendiente',
  areaOrigen: 'Mesa de Partes',
  areaDestino: getAreaDestino(item),
  accion: 'Pendiente',
  observacion: 'Expediente recibido y pendiente de asignación.',
  responsable: item.usuarioRegistro || 'Responsable no registrado',
}, ...(item.estado !== 'Pendiente' ? [{
  fechaHora: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
  fechaSalida: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
  fechaIngreso: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
  areaOrigen: 'Mesa de Partes',
  areaDestino: getAreaDestino(item),
  accion: 'Derivado para atención',
  observacion: 'Expediente enviado al área responsable para su revisión.',
  responsable: item.usuarioRegistro || 'Responsable no registrado',
}] : []), ...(['Atendido', 'Archivado'].includes(item.estado) ? [{
  fechaHora: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
  fechaSalida: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
  areaOrigen: getAreaDestino(item),
  areaDestino: 'Mesa de Partes',
  accion: item.estado === 'Archivado' ? 'Archivado' : 'Atendido',
  observacion: item.estado === 'Archivado' ? 'Expediente archivado luego de su atención.' : 'La oficina responsable registró la atención del expediente.',
  responsable: getRecordedResponsible(item) || 'Responsable no registrado',
}] : [])]
// Completa campos nuevos en datos antiguos sin modificar la fuente JSON original.
const normalizeExpediente = (item: Expediente): Expediente => {
  const parts = splitRemitente(item.remitente)
  return {
    ...item,
    remitenteNombre: item.remitenteNombre || parts.nombre,
    remitenteCargo: item.remitenteCargo || parts.cargo,
    areaDestino: item.areaDestino || item.entregadoA || item.area || '',
    historial: item.historial?.length ? item.historial : createInitialHistory(item),
  }
}

// Convierte fechas ISO o separadas por barras al formato mostrado en pantalla.
const formatDate = (value: string) => {
  const cleanValue = value.trim()
  if (cleanValue.includes('-')) {
    const [year, month, day] = cleanValue.split('-')
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
  }
  const parts = cleanValue.split('/')
  return parts.length === 3
    ? `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`
    : cleanValue
}

// Importa el histórico, elimina placeholders y crea campos compatibles.
const csvExpedientes = (importedExpedientes as Expediente[])
  .filter((item) => !(item.remitente === 'Pendiente de registro' && (item.asunto === 'Pendiente de registro' || item.asunto === '0')))
  .map((item) => normalizeExpediente({ ...item, fechaIngreso: formatDate(item.fechaIngreso || item.fecha) }))
const storageKey = 'mesa-partes-expedientes-v7'
// Fecha actual para el campo HTML date del formulario.
const todayInputValue = () => new Date().toISOString().slice(0, 10)
// Fecha segura para mostrar en tablas y reportes.
const displayDate = (value: string) => formatDate(value) || 'Pendiente'
// Calcula la fecha límite sumando días al ingreso.
const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + days)
  return formatDate(date.toISOString().slice(0, 10))
}

// Calcula días restantes hasta el vencimiento
const daysUntilDeadline = (deadlineDate: string): number => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(deadlineDate.split('/').reverse().join('-'))
  const diffTime = deadline.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Valida formato de DNI (8 dígitos) y RUC (11 dígitos)
const validateDocument = (tipo: string, numero: string): { valid: boolean; message: string } => {
  const cleanNumber = numero.trim()
  if (tipo === 'DNI') {
    if (!/^\d{8}$/.test(cleanNumber)) {
      return { valid: false, message: 'DNI debe tener 8 dígitos' }
    }
    // Algoritmo de validación DNI peruano
    const dni = parseInt(cleanNumber)
    const summary = Math.floor(dni / 10000000) * 2 + Math.floor((dni % 10000000) / 1000000) * 3
      + Math.floor((dni % 1000000) / 100000) * 4 + Math.floor((dni % 100000) / 10000) * 5
      + Math.floor((dni % 10000) / 1000) * 6 + Math.floor((dni % 1000) / 100) * 7
      + Math.floor((dni % 100) / 10) * 8 + (dni % 10) * 9
    const checkDigit = 11 - (summary % 11)
    const expectedCheckDigit = checkDigit === 11 ? 0 : checkDigit === 10 ? 1 : checkDigit
    if (parseInt(cleanNumber[7]) !== expectedCheckDigit) {
      return { valid: false, message: 'DNI inválido (no pasa verificación)' }
    }
    return { valid: true, message: 'DNI válido' }
  } else if (tipo === 'RUC') {
    if (!/^\d{11}$/.test(cleanNumber)) {
      return { valid: false, message: 'RUC debe tener 11 dígitos' }
    }
    // Algoritmo de validación RUC peruano
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanNumber[i]) * weights[i]
    }
    const remainder = sum % 11
    const checkDigit = remainder === 0 ? 0 : 11 - remainder
    if (parseInt(cleanNumber[10]) !== checkDigit) {
      return { valid: false, message: 'RUC inválido (no pasa verificación)' }
    }
    return { valid: true, message: 'RUC válido' }
  }
  return { valid: true, message: 'Documento válido' }
}

// Calcula tiempo promedio de atención en días
const calculateAverageResolutionTime = (expedientes: Expediente[]): number => {
  const attended = expedientes.filter(e => e.estado === 'Atendido' || e.estado === 'Archivado')
  if (attended.length === 0) return 0
  
  let totalDays = 0
  let count = 0
  
  attended.forEach(exp => {
    const startDate = exp.fechaIngreso || exp.fecha
    if (!startDate) return
    
    // Buscar fecha de atención en el historial
    const attendedEntry = exp.historial?.find(h => h.accion === 'Atendido' || h.accion === 'Archivado')
    const endDate = attendedEntry?.fechaHora || new Date().toLocaleString('es-PE')
    
    const start = new Date(startDate.split('/').reverse().join('-'))
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    totalDays += diffDays
    count++
  })
  
  return count > 0 ? Math.round(totalDays / count) : 0
}

// Exporta reporte a CSV
const exportReportToCSV = (expedientes: Expediente[]) => {
  const headers = ['ID', 'Fecha', 'Remitente', 'Asunto', 'Área', 'Estado', 'Prioridad', 'Plazo']
  const rows = expedientes.map(e => [
    e.id,
    e.fechaIngreso,
    getRemitenteNombre(e),
    `"${e.asunto.replace(/"/g, '""')}"`,
    getAreaDestino(e),
    e.estado,
    e.prioridad,
    e.plazo
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

// Lee un archivo del navegador como Data URL para conservarlo localmente.
const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer el archivo.'))
  reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo.'))
  reader.readAsDataURL(file)
})

// Componente raíz: coordina navegación, datos, filtros, acciones y modales.
function App() {
  // Usuario actual con sesión
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const stored = localStorage.getItem('mesa-partes-user')
    if (stored) {
      try {
        return JSON.parse(stored) as User
      } catch {
        return DEFAULT_USER
      }
    }
    return DEFAULT_USER
  })
  
  // Timeout de sesión (30 minutos)
  const sessionTimeoutRef = useRef<number | null>(null)
  const resetSessionTimeout = () => {
    if (sessionTimeoutRef.current) window.clearTimeout(sessionTimeoutRef.current)
    sessionTimeoutRef.current = window.setTimeout(() => {
      notify('Sesión expirada por inactividad')
      setCurrentUser({ ...DEFAULT_USER }) // En producción, cerrar sesión completamente
      localStorage.removeItem('mesa-partes-user')
    }, 30 * 60 * 1000) // 30 minutos
  }
  
  useEffect(() => {
    resetSessionTimeout()
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => window.addEventListener(event, resetSessionTimeout))
    return () => {
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current)
      events.forEach(event => window.removeEventListener(event, resetSessionTimeout))
    }
  }, [])
  
  // Permisos del usuario actual
  const userPermissions = ROLE_PERMISSIONS[currentUser.rol]
  
  // Pantalla visible actualmente.
  const [view, setView] = useState<View>('nuevo')
  // Carga primero localStorage y usa el histórico como respaldo.
  const [expedientes, setExpedientes] = useState<Expediente[]>(() => {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return csvExpedientes
    try {
      const parsed: unknown = JSON.parse(stored)
      return Array.isArray(parsed) ? (parsed as Expediente[]).map(normalizeExpediente) : csvExpedientes
    } catch {
      return csvExpedientes
    }
  })
  // Estado de los filtros de consulta.
  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('Todas')
  const [remitenteFilter, setRemitenteFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [toast, setToast] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null)
  const [pendingAction, setPendingAction] = useState<{ type: 'derive' | 'complete' | 'archive'; id: string; area?: string } | null>(null)
  const areaOptions = useMemo(() => Array.from(new Set([...areas, ...expedientes.map(getAreaDestino).filter(Boolean)])).sort(), [expedientes])

  // Fecha actual dinámica para el dashboard
  const currentDate = useMemo(() => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    return now.toLocaleDateString('es-PE', options).toUpperCase()
  }, [])

  // Persiste cambios antes de actualizar la interfaz para evitar estados falsos.
  const saveExpedientes = (next: Expediente[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setExpedientes(next)
      return true
    } catch (error) {
      notify(error instanceof DOMException && error.name === 'QuotaExceededError'
        ? 'No hay espacio suficiente en el navegador para guardar el archivo'
        : 'No se pudo guardar el expediente')
      return false
    }
  }

  // Aplica todos los filtros simultáneamente.
  const filtered = useMemo(() => expedientes.filter((item) => {
    const matchesQuery = `${item.id} ${item.asunto}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesArea = areaFilter === 'Todas' || getAreaDestino(item) === areaFilter
    const matchesRemitente = getRemitenteNombre(item).toLowerCase().includes(remitenteFilter.trim().toLowerCase())
    return matchesQuery && matchesArea && matchesRemitente && (statusFilter === 'Todos' || item.estado === statusFilter)
  }), [expedientes, query, areaFilter, remitenteFilter, statusFilter])

  // Muestra mensajes temporales de validación o resultado.
  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  // Valida, lee, crea y guarda un expediente nuevo junto con su archivo.
  const addExpediente = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(event.currentTarget)
    const nextNumber = expedientes.reduce((highest, item) => Math.max(highest, Number(item.id.match(/^EXP-\d{4}-(\d+)/)?.[1] || 0)), 0) + 1
    const currentYear = new Date().getFullYear()
    const nextId = `EXP-${currentYear}-${String(nextNumber).padStart(5, '0')}`
    const selectedFile = data.get('archivo')
    const fileName = selectedFile instanceof File && selectedFile.name ? selectedFile.name : 'Sin adjunto'
    let fileData = ''
    if (!(selectedFile instanceof File) || !selectedFile.size) {
      notify('Seleccione un archivo antes de registrar el expediente')
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      notify('El archivo supera el límite de 5 MB')
      return
    }
    try {
      setIsSaving(true)
      fileData = await readFileAsDataUrl(selectedFile)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo leer el archivo seleccionado')
      return
    } finally {
      setIsSaving(false)
    }
    const newExpediente: Expediente = {
      id: nextId,
      fechaIngreso: formatDate(String(data.get('fechaIngreso'))),
      remitente: String(data.get('remitente') || '').trim(),
      remitenteNombre: String(data.get('remitente') || '').trim(),
      remitenteCargo: String(data.get('cargoRemitente') || '').trim(),
      documento: `${String(data.get('tipoDocumento'))} ${String(data.get('numeroDocumento'))}`,
      representante: String(data.get('representante') || ''),
      cargoRepresentante: String(data.get('cargoRepresentante') || ''),
      tipo: String(data.get('tipo')),
      asunto: String(data.get('asunto')),
      contenido: String(data.get('contenido')),
      area: '',
      areaDestino: '',
      estado: 'Pendiente',
      fecha: formatDate(String(data.get('fechaIngreso'))),
      plazo: addDays(String(data.get('fechaIngreso')), 7),
      prioridad: String(data.get('prioridad') || 'Normal') as 'Normal' | 'Alta',
      archivo: fileName,
      archivoData: fileData,
      archivoTipo: selectedFile.type || 'application/octet-stream',
      archivoTamano: selectedFile.size,
      archivoDescripcion: String(data.get('archivoDescripcion') || '').trim(),
      documentos: String(data.get('documentos')),
      modalidadRecepcion: String(data.get('canalRecepcion')).toLowerCase().includes('virtual') ? 'Virtual' : 'Presencial',
      entregadoA: '',
      documentoSeguimiento: String(data.get('documentoSeguimiento') || 'Pendiente'),
      canalRecepcion: String(data.get('canalRecepcion') || ''),
      folios: Number(data.get('folios') || 0),
      anexos: Number(data.get('anexos') || 0),
      direccion: String(data.get('direccion') || ''),
      correo: String(data.get('correo') || ''),
      celular: String(data.get('celular') || ''),
      usuarioRegistro: 'Lucía Ramírez - Mesa de Partes',
      fechaHoraRecepcion: new Date().toISOString(),
      constanciaRecepcion: `Cargo generado para ${nextId}`,
    }
    newExpediente.historial = createInitialHistory(newExpediente)
    if (!saveExpedientes([newExpediente, ...expedientes])) return
    form.reset()
    setView('expedientes')
    notify(`Expediente ${nextId} registrado correctamente`)
  }

  // Deriva desde Mesa de Partes al área elegida por el director con confirmación.
  const deriveExpediente = (id: string, targetArea: string) => {
    if (!userPermissions.puedeDerivar) {
      notify('No tiene permisos para derivar expedientes')
      return
    }
    if (!targetArea) {
      notify('Seleccione el área de destino antes de derivar')
      return
    }
    const expediente = expedientes.find(e => e.id === id)
    if (expediente && !VALID_TRANSITIONS[expediente.estado].includes('En atención')) {
      notify(`No se puede derivar: estado actual "${expediente.estado}" no permite transición a "En atención"`)
      return
    }
    setPendingAction({ type: 'derive', id, area: targetArea })
  }

  // Confirma y ejecuta la derivación del expediente.
  const confirmDerive = () => {
    if (!pendingAction || pendingAction.type !== 'derive' || !pendingAction.area) return
    
    const { id, area: targetArea } = pendingAction
    const expediente = expedientes.find(e => e.id === id)
    if (expediente && !VALID_TRANSITIONS[expediente.estado].includes('En atención')) {
      notify(`No se puede derivar: estado actual "${expediente.estado}" no permite esta transición`)
      setPendingAction(null)
      return
    }
    
    const timestamp = new Date().toLocaleString('es-PE')
    saveExpedientes(expedientes.map((item) => item.id === id ? {
      ...item,
      estado: 'En atención',
      area: targetArea,
      areaDestino: getAreaDestino(item),
      historial: [...(item.historial || createInitialHistory(item)), {
        fechaHora: timestamp,
        fechaSalida: timestamp,
        fechaIngreso: timestamp,
        areaOrigen: 'Mesa de Partes',
        areaDestino: getAreaDestino(item),
        accion: 'Derivado para atención',
        observacion: 'Expediente enviado al área responsable para su revisión.',
        responsable: `${currentUser.nombre} - ${currentUser.area}`,
      }],
    } : item))
    notify('Expediente derivado y enviado a En atención')
    setPendingAction(null)
  }

  // Marca como atendido por el área que recibió la derivación con confirmación.
  const completeExpediente = (id: string) => {
    if (!userPermissions.puedeAtender) {
      notify('No tiene permisos para atender expedientes')
      return
    }
    const expediente = expedientes.find(e => e.id === id)
    if (expediente && !VALID_TRANSITIONS[expediente.estado].includes('Atendido')) {
      notify(`No se puede atender: estado actual "${expediente.estado}" no permite transición a "Atendido"`)
      return
    }
    setPendingAction({ type: 'complete', id })
  }

  // Confirma y ejecuta la atención del expediente.
  const confirmComplete = () => {
    if (!pendingAction || pendingAction.type !== 'complete') return
    
    const { id } = pendingAction
    const expediente = expedientes.find(e => e.id === id)
    if (expediente && !VALID_TRANSITIONS[expediente.estado].includes('Atendido')) {
      notify(`No se puede atender: estado actual "${expediente.estado}" no permite esta transición`)
      setPendingAction(null)
      return
    }
    
    const timestamp = new Date().toLocaleString('es-PE')
    saveExpedientes(expedientes.map((item) => item.id === id ? {
      ...item,
      estado: 'Atendido',
      historial: [...(item.historial || createInitialHistory(item)), {
        fechaHora: timestamp,
        fechaSalida: timestamp,
        fechaIngreso: timestamp,
        areaOrigen: getAreaDestino(item),
        areaDestino: 'Mesa de Partes',
        accion: 'Atendido',
        observacion: 'La oficina responsable registró la atención del expediente.',
        responsable: `${currentUser.nombre} - ${currentUser.area || getAreaDestino(item)}`,
      }],
    } : item))
    notify('Expediente marcado como Atendido')
    setPendingAction(null)
  }

  // Archiva un expediente con confirmación
  const archiveExpediente = (id: string) => {
    if (!userPermissions.puedeArchivar) {
      notify('No tiene permisos para archivar expedientes')
      return
    }
    const expediente = expedientes.find(e => e.id === id)
    if (expediente && !VALID_TRANSITIONS[expediente.estado].includes('Archivado')) {
      notify(`No se puede archivar: estado actual "${expediente.estado}" no permite transición a "Archivado"`)
      return
    }
    setPendingAction({ type: 'archive', id })
  }

  // Confirma y ejecuta el archivado del expediente
  const confirmArchive = () => {
    if (!pendingAction || pendingAction.type !== 'archive') return
    
    const { id } = pendingAction
    const expediente = expedientes.find(e => e.id === id)
    if (expediente && !VALID_TRANSITIONS[expediente.estado].includes('Archivado')) {
      notify(`No se puede archivar: estado actual "${expediente.estado}" no permite esta transición`)
      setPendingAction(null)
      return
    }
    
    const timestamp = new Date().toLocaleString('es-PE')
    saveExpedientes(expedientes.map((item) => item.id === id ? {
      ...item,
      estado: 'Archivado',
      historial: [...(item.historial || createInitialHistory(item)), {
        fechaHora: timestamp,
        fechaSalida: timestamp,
        areaOrigen: getAreaDestino(item),
        areaDestino: 'Archivo Central',
        accion: 'Archivado',
        observacion: 'Expediente archivado luego de su atención.',
        responsable: `${currentUser.nombre} - ${currentUser.area}`,
      }],
    } : item))
    notify('Expediente archivado correctamente')
    setPendingAction(null)
  }

  // Cancela una acción pendiente.
  const cancelPendingAction = () => {
    setPendingAction(null)
  }

  return (
    <div className="app-shell portal-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">MP</div>
          <div><strong>Mesa de Partes</strong><span>Gestión documental</span></div>
        </div>
        <div className="menu-label">MENÚ PRINCIPAL</div>
        <nav className="nav-menu">
          <NavItem icon="⌂" label="Inicio" active={view === 'inicio'} onClick={() => setView('inicio')} />
          <NavItem icon="▤" label="Expedientes" active={view === 'expedientes'} onClick={() => setView('expedientes')} count={expedientes.filter((item) => item.estado === 'Pendiente').length} />
          <NavItem icon="＋" label="Nuevo expediente" active={view === 'nuevo'} onClick={() => setView('nuevo')} />
          <NavItem icon="▥" label="Reportes" active={view === 'reportes'} onClick={() => setView('reportes')} />
        </nav>
        <div className="sidebar-footer">
          <div className="secure-note"><span>⌁</span><div><b>Entorno local</b><small>Datos guardados en este equipo</small></div></div>
          <div className="user-mini" onClick={() => setShowProfile(!showProfile)} role="button" tabIndex={0}>
            <div className="avatar">{currentUser.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
            <div><b>{currentUser.nombre}</b><small>{currentUser.rol === 'MesaPartes' ? 'Mesa de Partes' : currentUser.rol}</small></div>
            <span>⋮</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar portal-bar">
          <div className="portal-brand"><div className="portal-mark">MP</div><strong>Mesa de Partes Virtual</strong></div>
          <nav className="portal-links">
            <button className={view === 'nuevo' ? 'selected' : ''} onClick={() => setView('nuevo')}>Registro de Expediente</button>
            <button onClick={() => setView('expedientes')}>Consulta de Expedientes</button>
            <button onClick={() => setView('reportes')}>Reportes</button>
            <button onClick={() => setView('inicio')}>Inicio</button>
          </nav>
          <div className="top-actions">
            <button className="profile-button" onClick={() => setShowProfile(!showProfile)}>
              <div className="avatar">{currentUser.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
              <span>{currentUser.nombre}</span><b>⌄</b>
            </button>
            {showProfile && (
              <div className="profile-popover">
                <b>{currentUser.nombre}</b>
                <span>Rol: {currentUser.rol === 'MesaPartes' ? 'Mesa de Partes' : currentUser.rol}</span>
                <span>Área: {currentUser.area || 'N/A'}</span>
                <hr />
                <button onClick={() => { notify('Configuración disponible en versión completa'); setShowProfile(false); }}>Configuración</button>
                <button onClick={() => { 
                  setCurrentUser(DEFAULT_USER);
                  localStorage.removeItem('mesa-partes-user');
                  notify('Sesión cerrada correctamente');
                  setShowProfile(false);
                }}>Cerrar sesión</button>
              </div>
            )}
          </div>
        </header>

        <div className="page">
          {view === 'inicio' && <Dashboard expedientes={expedientes} onNew={() => setView('nuevo')} onViewAll={() => setView('expedientes')} currentDate={currentDate} />}
          {view === 'expedientes' && <ExpedientesView items={filtered} query={query} setQuery={setQuery} areaFilter={areaFilter} areaOptions={areaOptions} setAreaFilter={setAreaFilter} remitenteFilter={remitenteFilter} setRemitenteFilter={setRemitenteFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onNew={() => setView('nuevo')} onDerive={deriveExpediente} onComplete={completeExpediente} onTracking={setTrackingId} />}
          {view === 'nuevo' && <NewExpediente onSubmit={addExpediente} onCancel={() => setView('inicio')} isSaving={isSaving} />}
          {view === 'reportes' && <Reports expedientes={expedientes} notify={notify} />}
        </div>
      </main>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {trackingId && <TrackingModal item={expedientes.find((item) => item.id === trackingId)} onClose={() => setTrackingId(null)} />}
      {pendingAction && (
        <div className="modal-backdrop" role="presentation" onClick={cancelPendingAction}>
          <section className="confirmation-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="confirmation-header">
              <h2>Confirmar acción</h2>
              <button className="modal-close" onClick={cancelPendingAction} aria-label="Cerrar">×</button>
            </div>
            <div className="confirmation-body">
              {pendingAction.type === 'derive' ? (
                <>
                  <p>¿Está seguro que desea derivar este expediente al área seleccionada?</p>
                  <p className="confirmation-detail">Esta acción no se puede deshacer.</p>
                </>
              ) : pendingAction.type === 'complete' ? (
                <>
                  <p>¿Está seguro que desea marcar este expediente como atendido?</p>
                  <p className="confirmation-detail">Esta acción cambiará el estado del expediente.</p>
                </>
              ) : (
                <>
                  <p>¿Está seguro que desea archivar este expediente?</p>
                  <p className="confirmation-detail">El expediente pasará a estado "Archivado" y no podrá ser modificado.</p>
                </>
              )}
            </div>
            <div className="confirmation-actions">
              <button className="outline-button" onClick={cancelPendingAction}>Cancelar</button>
              <button className="primary-button" onClick={() => {
                if (pendingAction?.type === 'derive') confirmDerive()
                else if (pendingAction?.type === 'complete') confirmComplete()
                else if (pendingAction?.type === 'archive') confirmArchive()
              }}>
                {pendingAction.type === 'derive' ? '✓ Derivar' : pendingAction.type === 'complete' ? '✓ Atender' : '✓ Archivar'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

// Botón de navegación lateral con estado activo y contador opcional.
function NavItem({ icon, label, active, count, onClick }: { icon: string; label: string; active: boolean; count?: number; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}><span className="nav-icon">{icon}</span>{label}{count ? <em>{count}</em> : null}</button>
}

// Panel inicial con indicadores, expedientes recientes y vencimientos.
function Dashboard({ expedientes, onNew, onViewAll, currentDate }: { expedientes: Expediente[]; onNew: () => void; onViewAll: () => void; currentDate: string }) {
  const pending = expedientes.filter((item) => item.estado === 'Pendiente').length
  const attention = expedientes.filter((item) => item.estado === 'En atención').length
  const attended = expedientes.filter((item) => item.estado === 'Atendido').length
  
  // Calcular vencimientos dinámicamente
  const upcomingDeadlines = expedientes
    .filter((item) => (item.estado === 'Pendiente' || item.estado === 'En atención') && item.plazo)
    .map(item => ({
      ...item,
      daysLeft: daysUntilDeadline(item.plazo)
    }))
    .filter(item => item.daysLeft >= 0 && item.daysLeft <= 15)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3)
  
  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr.split('/').reverse().join('-'))
    return { day: date.getDate(), month: date.toLocaleString('es-PE', { month: 'short' }).toUpperCase() }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{currentDate}</p>
          <h1>Buenos días, Lucía <span>👋</span></h1>
          <p className="muted">Aquí tienes el resumen de tu mesa de partes.</p>
        </div>
        <button className="primary-button" onClick={onNew}>＋ Nuevo expediente</button>
      </div>
      <section className="stats-grid">
        <StatCard label="Por atender" value={pending} detail="Requieren derivación" tone="orange" icon="◷" />
        <StatCard label="En atención" value={attention} detail="En las áreas responsables" tone="blue" icon="↗" />
        <StatCard label="Atendidos" value={attended} detail="Registros con seguimiento" tone="green" icon="✓" />
        <StatCard label="Total de expedientes" value={expedientes.length} detail={`Año ${new Date().getFullYear()}`} tone="purple" icon="▤" />
      </section>
      <div className="content-grid">
        <section className="panel recent-panel">
          <div className="panel-header">
            <div><h2>Expedientes recientes</h2><p>Últimos documentos registrados en el sistema</p></div>
            <button className="text-button" onClick={onViewAll}>Ver todos <span>→</span></button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>N° DE EXPEDIENTE</th><th>REMITENTE</th><th>ASUNTO</th><th>ÁREA DESTINO</th><th>ESTADO</th><th /></tr></thead>
              <tbody>
                {expedientes.slice(0, 4).map((item) => (
                  <tr key={item.id}>
                    <td><b className="exp-id">{item.id}</b><small>{item.fecha}</small></td>
                    <td><span className="person-cell"><span className="small-avatar">{getRemitenteNombre(item).split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>{getRemitenteNombre(item)}</span></td>
                    <td>{item.asunto}</td>
                    <td>{getAreaDestino(item)}</td>
                    <td><StatusBadge status={item.estado} /></td>
                    <td><button className="dots">•••</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel deadlines-panel">
          <div className="panel-header">
            <div><h2>Próximos vencimientos</h2><p>Expedientes que requieren atención</p></div>
            <span className="warning-icon">!</span>
          </div>
          <div className="deadline-list">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((item) => {
                const { day, month } = formatDateShort(item.plazo)
                return (
                  <div className="deadline-item" key={item.id}>
                    <div className={`deadline-date ${item.daysLeft <= 3 ? 'urgent' : ''}`}>
                      <b>{day}</b><span>{month}</span>
                    </div>
                    <div>
                      <b>{item.id}</b>
                      <p>{item.asunto}</p>
                      <small>{item.daysLeft === 0 ? 'Vence hoy' : item.daysLeft === 1 ? 'Vence mañana' : `Vence en ${item.daysLeft} días`}</small>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>No hay vencimientos próximos</div>
            )}
          </div>
          <button className="outline-button" onClick={onViewAll}>Ver calendario de vencimientos</button>
        </section>
      </div>
      <div className="quick-tip"><span>✦</span><div><b>Todo bajo control</b><p>No tienes expedientes vencidos. Recuerda revisar tu bandeja al inicio de cada jornada.</p></div><button>×</button></div>
    </>
  )
}

// Tarjeta reutilizable para mostrar un indicador numérico.
function StatCard({ label, value, detail, tone, icon }: { label: string; value: number; detail: string; tone: string; icon: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small className={tone === 'green' ? 'positive' : ''}>{detail}</small></div></div>
}

// Etiqueta visual consistente para el estado del expediente.
function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge ${status.toLowerCase().replace(' ', '-')}`}><i />{status}</span>
}

// Enlace al archivo local o texto descriptivo para históricos sin archivo digital.
function DocumentLink({ item }: { item: Expediente }) {
  if (!item.archivoData) return <span className="table-cell-text" title={item.documentos || item.archivo}>{item.documentos || item.archivo}</span>
  return <a className="document-link" href={item.archivoData} target="_blank" rel="noreferrer" title={`Abrir ${item.archivo}`}>▣ {item.archivo}</a>
}

// Tabla de consulta: filtros, paginación, derivación, atención y seguimiento.
function ExpedientesView({ items, query, setQuery, areaFilter, areaOptions, setAreaFilter, remitenteFilter, setRemitenteFilter, statusFilter, setStatusFilter, onNew, onDerive, onComplete, onTracking }: { items: Expediente[]; query: string; setQuery: (v: string) => void; areaFilter: string; areaOptions: string[]; setAreaFilter: (v: string) => void; remitenteFilter: string; setRemitenteFilter: (v: string) => void; statusFilter: string; setStatusFilter: (v: string) => void; onNew: () => void; onDerive: (id: string, area: string) => void; onComplete: (id: string) => void; onTracking: (id: string) => void }) {
  const pageSize = 20
  const [page, setPage] = useState(1)
  const [selectedAreaById, setSelectedAreaById] = useState<Record<string, string>>({})
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const updateQuery = (value: string) => {
    setQuery(value)
    setPage(1)
  }
  const updateStatus = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }
  const updateArea = (value: string) => {
    setAreaFilter(value)
    setPage(1)
  }
  const updateRemitente = (value: string) => {
    setRemitenteFilter(value)
    setPage(1)
  }
  const cell = (value: string, className = '') => <span className={`table-cell-text ${className}`} title={value}>{value}</span>

  return <><div className="page-heading compact"><div><p className="eyebrow">GESTIÓN DOCUMENTAL</p><h1>Expedientes</h1><p className="muted">Consulta, filtra y gestiona los documentos registrados.</p></div><button className="primary-button" onClick={onNew}>＋ Nuevo expediente</button></div><section className="panel list-panel"><div className="toolbar"><div className="search-box"><span>⌕</span><input value={query} onChange={(e) => updateQuery(e.target.value)} placeholder="Buscar por N.° de expediente o asunto..." /></div><input className="filter-input" value={remitenteFilter} onChange={(e) => updateRemitente(e.target.value)} placeholder="Filtrar por remitente..." /><select value={areaFilter} onChange={(e) => updateArea(e.target.value)}><option>Todas</option>{areaOptions.map((area) => <option key={area}>{area}</option>)}</select><select value={statusFilter} onChange={(e) => updateStatus(e.target.value)}><option>Todos</option><option>Pendiente</option><option>En atención</option><option>Atendido</option><option>Archivado</option></select><span className="result-count">{items.length} resultados</span></div><div className="table-wrap"><table><thead><tr><th>N.° EXP</th><th>FECHA</th><th>NOMBRE / APELLIDO</th><th>ASUNTO</th><th>DOCUMENTOS</th><th>RECIBIDO</th><th>UBICACIÓN ACTUAL</th><th>SEGUIMIENTO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>{pageItems.map((item) => { const cargo = getRemitenteCargo(item); return <tr key={item.id}><td><b className="exp-id">{item.id}</b></td><td>{displayDate(item.fechaIngreso || item.fecha)}</td><td><span className="person-cell"><span className="small-avatar">{getRemitenteNombre(item).split(' ').map((x) => x[0]).slice(0, 2).join('')}</span><span className="table-cell-group">{cell(getRemitenteNombre(item))}{cargo ? <small>{cargo}</small> : null}</span></span></td><td><span className="table-cell-group">{cell(item.asunto)}<small>{item.tipo}</small></span></td>  <td><DocumentLink item={item} /></td><td>{cell(item.canalRecepcion || item.modalidadRecepcion || 'No especificado')}</td><td><span className="table-cell-group">{cell(getAreaDestino(item))}<small>Ubicación del trámite</small></span></td><td>{cell(item.documentoSeguimiento || 'Pendiente')}</td><td><StatusBadge status={item.estado} /></td>  <td className="actions-cell"><button className="tracking-button" onClick={() => onTracking(item.id)}>◉ Ver seguimiento</button>{item.estado === 'Pendiente' ? <><select className="action-area-select" value={selectedAreaById[item.id] || ''} onChange={(event) => setSelectedAreaById({ ...selectedAreaById, [item.id]: event.target.value })}><option value="">Derivar a...</option>{areas.map((area) => <option key={area}>{area}</option>)}</select><button className="action-link" onClick={() => onDerive(item.id, selectedAreaById[item.id] || '')}>Derivar</button></> : item.estado === 'En atención' ? <button className="action-link" onClick={() => onComplete(item.id)}>Atender en {getAreaDestino(item)}</button> : null}</td></tr> })}</tbody></table>{items.length === 0 && <div className="empty-state">No se encontraron expedientes con esos criterios.</div>}</div><div className="pagination">Mostrando <b>{items.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, items.length)}</b> de <b>{items.length}</b> expedientes <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button><b className="current-page">{currentPage}</b><button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>›</button></div></section></>
}

// Modal con la línea de tiempo completa de un expediente.
function TrackingModal({ item, onClose }: { item?: Expediente; onClose: () => void }) {
  if (!item) return null
  const history = [...(item.historial || createInitialHistory(item))].reverse()
  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="tracking-modal" role="dialog" aria-modal="true" aria-labelledby="tracking-title" onClick={(event) => event.stopPropagation()}><div className="tracking-header"><div><p className="eyebrow">RUTA SEGUIDA POR EL EXPEDIENTE</p><h2 id="tracking-title">{item.id}</h2><p>{item.asunto}</p></div><button className="modal-close" onClick={onClose} aria-label="Cerrar seguimiento">×</button></div><div className="tracking-summary"><span><b>Remitente</b>{getRemitenteNombre(item)}</span><span><b>Estado actual</b><StatusBadge status={item.estado} /></span><span><b>Ubicación actual</b>{getAreaDestino(item)}</span></div>{item.archivoData && <div className="tracking-attachment"><b>Documento adjunto</b><DocumentLink item={item} />{item.archivoDescripcion && <small>{item.archivoDescripcion}</small>}</div>}<div className="timeline">{history.map((entry, index) => <div className="timeline-item" key={`${entry.fechaHora}-${index}`}><div className="timeline-dot" /><div className="timeline-card"><div className="timeline-card-header"><strong>{entry.accion}</strong><time>{entry.fechaHora}</time></div><p><b>{entry.areaOrigen}</b><span> → </span><b>{entry.areaDestino}</b></p><div className="timeline-dates"><span><b>Entrada:</b> {entry.fechaIngreso || 'No registrada'}</span><span><b>Salida:</b> {entry.fechaSalida || 'Pendiente'}</span></div><small className="timeline-responsible">Responsable: {entry.responsable || 'No registrado'}</small><small>{entry.observacion}</small></div></div>)}</div><button className="outline-button tracking-close" onClick={onClose}>Ocultar detalle</button></section></div>
}

// Formulario de alta; la asignación del área queda para la derivación posterior.
function NewExpediente({ onSubmit, onCancel, isSaving }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; isSaving: boolean }) {
  const [selectedFileName, setSelectedFileName] = useState('')
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>('.legacy-form-page .form-layout')
    if (!form) return
    ;['numeroDocumento', 'contenido', 'entregadoA'].forEach((name) => {
      const field = form.elements.namedItem(name)
      if (field instanceof Element) field.removeAttribute('required')
    })
    const areaField = form.elements.namedItem('area')
    if (areaField instanceof Element) areaField.removeAttribute('required')
    if (areaField instanceof HTMLSelectElement) {
      areaField.disabled = true
      areaField.closest('label')?.setAttribute('hidden', 'true')
    }
  }, [])
  return <div className="legacy-form-page"><form className="form-layout" onSubmit={onSubmit}>{isSaving && <div className="saving-notice">El archivo se está leyendo y guardando. No cierres ni recargues la página.</div>}<div className="legacy-title">▣ Registro de Expediente MPV</div><section className="panel form-panel"><div className="panel-header"><div><h2>Datos del trámite</h2><p>Complete los datos solicitados para registrar el expediente.</p></div></div><div className="form-grid"><label>Fecha de ingreso <input name="fechaIngreso" type="date" required defaultValue={todayInputValue()} /></label>  <label>Trámite <select name="tipo" required><option value="">Seleccione el tipo</option><option>Solicitud</option><option>Oficio</option><option>Memorando</option><option>Informe</option><option>Carta</option><option>Resolución</option></select></label>    <label className="wide">Nombre / apellido o razón social <input name="remitente" required placeholder="Ingrese el nombre completo o razón social." /></label><label>Cargo del remitente <input name="cargoRemitente" placeholder="Cargo o función del remitente" /></label><label>Representante (si aplica) <input name="representante" placeholder="Nombre del representante" /></label><label>Cargo del representante <input name="cargoRepresentante" placeholder="Cargo" /></label><label>Área destino   <select name="area" required><option value="">Seleccione el área</option>{areas.map((area) => <option key={area}>{area}</option>)}</select></label><label className="wide">Asunto de la solicitud <input name="asunto" required placeholder="Registre en forma clara el asunto por el cual ingresa el documento." /></label><label className="wide">Documentos <input name="documentos" required placeholder="Ej. Oficio Múltiple N.° 00129-2025-MINEDU/..." /></label></div></section><section className="panel form-panel"><div className="section-strip">▣ Datos del administrado</div><div className="form-grid"><label>Tipo de documento <select name="tipoDocumento"><option>RUC</option><option>DNI</option><option>CE</option></select></label><label>Número de documento <div className="inline-field"><input name="numeroDocumento" required placeholder="Número de documento" /><button type="button" className="legacy-blue-button">⌕ Validar</button></div></label><p className="helper-text wide">Si su documento corresponde a un contribuyente, recuerde que deberá autenticarse con RUC.</p>  <label className="wide">Contenido <textarea name="contenido" required placeholder="Ingrese en forma detallada el contenido de su solicitud, procedimiento o trámite." rows={3} /></label><label className="wide">Dirección <input name="direccion" placeholder="Ingrese la Dirección" /></label><label>Correo electrónico <input name="correo" type="email" placeholder="Necesario para notificación electrónica" /></label><label>Celular <input name="celular" placeholder="Teléfono de contacto" /></label><label>Folios <input name="folios" type="number" min="1" required defaultValue="1" /></label>  <label>Anexos <input name="anexos" type="number" min="0" required defaultValue="0" /></label><label>Prioridad <select name="prioridad" required><option>Normal</option><option>Alta</option></select></label></div></section><section className="panel form-panel"><div className="section-strip">▣ Recepción y seguimiento</div><div className="form-grid">    <label>Recibido presencial/virtual <select name="canalRecepcion" required><option value="">Seleccione el canal</option><option>Físico</option><option>Plataforma SINAD</option><option>Virtual</option><option>Presencial</option></select></label><label>Entregado presencial/virtual a <select name="entregadoA" required><option value="">Seleccione el destino</option>{areas.map((area) => <option key={area}>{area}</option>)}</select></label><label className="wide">Documento seguimiento <input name="documentoSeguimiento" placeholder="Ej. Informe técnico, memorando o cargo de atención" /></label></div></section><section className="panel form-panel"><div className="section-strip">▣ Archivos a Adjuntar</div><div className="form-grid attachment-grid"><label>Archivo <label className="file-button">▣ Seleccionar archivo<input name="archivo" type="file" accept=".pdf,.jpg,.jpeg,.png" required onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name || '')} /></label><small>{selectedFileName ? `Archivo seleccionado: ${selectedFileName}` : 'Ningún archivo seleccionado. Máximo 5 MB.'}</small></label><label>Descripción del archivo <input name="archivoDescripcion" placeholder="Ingrese la descripción de su archivo." /></label></div><div className="empty-files">{selectedFileName ? 'El archivo se guardará junto con el expediente.' : 'Seleccione un archivo para adjuntarlo al expediente.'}</div></section><div className="form-actions"><button type="button" className="legacy-light-button" onClick={onCancel}>‹ Anterior</button><button type="submit" className="legacy-blue-button">✓ Enviar</button><button type="reset" className="legacy-blue-button" onClick={() => setSelectedFileName('')}>▰ Limpiar</button></div></form></div>
}

function Reports({ expedientes, notify }: { expedientes: Expediente[]; notify: (message: string) => void }) {
  const total = expedientes.length
  const avgTime = calculateAverageResolutionTime(expedientes)
  
  // Calcular distribución real por área
  const areaDistribution = areas.map(area => {
    const count = expedientes.filter(e => getAreaDestino(e) === area).length
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0
    return { area, count, percentage }
  }).filter(item => item.count > 0)
  
  const handleExport = () => {
    exportReportToCSV(expedientes)
    notify('Reporte exportado correctamente')
  }

  return (
    <>
      <div className="page-heading compact">
        <div><p className="eyebrow">ANÁLISIS Y SEGUIMIENTO</p><h1>Reportes</h1><p className="muted">Indicadores de gestión de la mesa de partes.</p></div>
        <button className="outline-button" onClick={handleExport}>↓ Exportar reporte</button>
      </div>
      <section className="stats-grid">
        <StatCard label="Total registrados" value={total} detail={`Año ${new Date().getFullYear()}`} tone="purple" icon="▤" />
        <StatCard label="Pendientes" value={expedientes.filter((item) => item.estado === 'Pendiente').length} detail="Por derivar" tone="orange" icon="◷" />
        <StatCard label="Atendidos" value={expedientes.filter((item) => item.estado === 'Atendido').length} detail="Con seguimiento" tone="green" icon="✓" />
        <StatCard label="Tiempo promedio" value={avgTime} detail="Días de atención" tone="blue" icon="◴" />
      </section>
      <section className="panel report-panel">
        <div className="panel-header">
          <div><h2>Distribución por área</h2><p>Expedientes registrados durante el periodo actual</p></div>
        </div>
        {areaDistribution.length > 0 ? (
          areaDistribution.map(({ area, count, percentage }) => (
            <div className="bar-row" key={area}>
              <span>{area}</span>
              <div><i style={{ width: `${percentage}%` }} /></div>
              <b>{count}</b>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>No hay datos para mostrar</div>
        )}
      </section>
    </>
  )
}

export default App
