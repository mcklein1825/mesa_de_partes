import { FormEvent, useEffect, useMemo, useState, useRef } from 'react'
import importedExpedientes from './data/expedientes.csv.json'

// Estados permitidos durante el ciclo de vida de un expediente (Máquina de Estados Finita)
type Status = 'Pendiente' | 'En atención' | 'Atendido' | 'Archivado'
type View = 'inicio' | 'expedientes' | 'nuevo' | 'reportes'

// Roles del sistema con permisos específicos
type Role = 'MesaPartes' | 'AreaOperativa' | 'Administrador' | 'Auditor'

type User = {
  id: string
  nombre: string
  email: string
  rol: Role
  area?: string
  activo: boolean
}

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

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  'Pendiente': ['En atención'],
  'En atención': ['Atendido', 'Archivado'],
  'Atendido': ['Archivado'],
  'Archivado': [],
}

const DEFAULT_USER: User = {
  id: 'USR-001',
  nombre: 'Lucía Ramírez',
  email: 'lucia.ramirez@institucion.gob.pe',
  rol: 'MesaPartes',
  area: 'Mesa de Partes',
  activo: true,
}

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

const areas = ['Dirección General', 'Recursos Humanos', 'Administración', 'Oficina de TI', 'Asesoría Jurídica']

const splitRemitente = (value: string) => {
  const [name, ...cargo] = value.split(/\s*-\s*/, 2)
  return { nombre: name.trim(), cargo: cargo.join(' - ').trim() }
}

const getRemitenteNombre = (item: Expediente) => item.remitenteNombre || splitRemitente(item.remitente).nombre
const getRemitenteCargo = (item: Expediente) => item.remitenteCargo || splitRemitente(item.remitente).cargo
const getAreaDestino = (item: Expediente) => item.areaDestino || item.entregadoA || item.area || 'Pendiente de asignación'

const getRecordedResponsible = (item: Expediente) => {
  const followUp = item.documentoSeguimiento || ''
  const match = followUp.match(/(?:a|por)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ]+){1,3})/)
  return match?.[1]?.trim() || ''
}

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

const csvExpedientes = (importedExpedientes as Expediente[])
  .filter((item) => !(item.remitente === 'Pendiente de registro' && (item.asunto === 'Pendiente de registro' || item.asunto === '0')))
  .map((item) => normalizeExpediente({ ...item, fechaIngreso: formatDate(item.fechaIngreso || item.fecha) }))

const storageKey = 'mesa-partes-expedientes-v7'
const todayInputValue = () => new Date().toISOString().slice(0, 10)
const displayDate = (value: string) => formatDate(value) || 'Pendiente'

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + days)
  return formatDate(date.toISOString().slice(0, 10))
}

const daysUntilDeadline = (deadlineDate: string): number => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(deadlineDate.split('/').reverse().join('-'))
  const diffTime = deadline.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const calculateAverageResolutionTime = (expedientes: Expediente[]): number => {
  const attended = expedientes.filter(e => e.estado === 'Atendido' || e.estado === 'Archivado')
  if (attended.length === 0) return 0
  
  let totalDays = 0
  let count = 0
  
  attended.forEach(exp => {
    const startDate = exp.fechaIngreso || exp.fecha
    if (!startDate) return
    
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

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer el archivo.'))
  reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo.'))
  reader.readAsDataURL(file)
})

function App() {
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
  
  const sessionTimeoutRef = useRef<number | null>(null)
  const resetSessionTimeout = () => {
    if (sessionTimeoutRef.current) window.clearTimeout(sessionTimeoutRef.current)
    sessionTimeoutRef.current = window.setTimeout(() => {
      notify('Sesión expirada por inactividad')
      setCurrentUser({ ...DEFAULT_USER })
      localStorage.removeItem('mesa-partes-user')
    }, 30 * 60 * 1000)
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
  
  const userPermissions = ROLE_PERMISSIONS[currentUser.rol]
  const [view, setView] = useState<View>('nuevo')
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

  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('Todas')
  const [remitenteFilter, setRemitenteFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [toast, setToast] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ type: 'derive' | 'complete' | 'archive'; id: string; area?: string } | null>(null)
  const areaOptions = useMemo(() => Array.from(new Set([...areas, ...expedientes.map(getAreaDestino).filter(Boolean)])).sort(), [expedientes])

  const currentDate = useMemo(() => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    return now.toLocaleDateString('es-PE', options).toUpperCase()
  }, [])

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

  const filtered = useMemo(() => expedientes.filter((item) => {
    const matchesQuery = `${item.id} ${item.asunto}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesArea = areaFilter === 'Todas' || getAreaDestino(item) === areaFilter
    const matchesRemitente = getRemitenteNombre(item).toLowerCase().includes(remitenteFilter.trim().toLowerCase())
    return matchesQuery && matchesArea && matchesRemitente && (statusFilter === 'Todos' || item.estado === statusFilter)
  }), [expedientes, query, areaFilter, remitenteFilter, statusFilter])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

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
      usuarioRegistro: `${currentUser.nombre} - ${currentUser.area}`,
      fechaHoraRecepcion: new Date().toISOString(),
      constanciaRecepcion: `Cargo generado para ${nextId}`,
    }
    newExpediente.historial = createInitialHistory(newExpediente)
    if (!saveExpedientes([newExpediente, ...expedientes])) return
    form.reset()
    setView('expedientes')
    notify(`Expediente ${nextId} registrado correctamente`)
  }

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

  const confirmDerive = () => {
    if (!pendingAction || pendingAction.type !== 'derive' || !pendingAction.area) return
    const { id, area: targetArea } = pendingAction
    const timestamp = new Date().toLocaleString('es-PE')
    saveExpedientes(expedientes.map((item) => item.id === id ? {
      ...item,
      estado: 'En atención',
      area: targetArea,
      areaDestino: targetArea,
      historial: [...(item.historial || createInitialHistory(item)), {
        fechaHora: timestamp,
        fechaSalida: timestamp,
        fechaIngreso: timestamp,
        areaOrigen: 'Mesa de Partes',
        areaDestino: targetArea,
        accion: 'Derivado para atención',
        observacion: 'Expediente enviado al área responsable para su revisión.',
        responsable: `${currentUser.nombre} - ${currentUser.area}`,
      }],
    } : item))
    notify('Expediente derivado y enviado a En atención')
    setPendingAction(null)
  }

  const completeExpediente = (id: string) => {
    if (!userPermissions.puedeAtender) {
      notify('No tiene permisos para atender expedientes')
      return
    }
    setPendingAction({ type: 'complete', id })
  }

  const confirmComplete = () => {
    if (!pendingAction || pendingAction.type !== 'complete') return
    const { id } = pendingAction
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
            <button className={view === 'expedientes' ? 'selected' : ''} onClick={() => setView('expedientes')}>Consulta de Expedientes</button>
            <button className={view === 'reportes' ? 'selected' : ''} onClick={() => setView('reportes')}>Reportes</button>
            <button className={view === 'inicio' ? 'selected' : ''} onClick={() => setView('inicio')}>Inicio</button>
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
              ) : (
                <>
                  <p>¿Está seguro que desea marcar este expediente como atendido?</p>
                  <p className="confirmation-detail">Esta acción cambiará el estado del expediente.</p>
                </>
              )}
            </div>
            <div className="confirmation-actions">
              <button className="outline-button" onClick={cancelPendingAction}>Cancelar</button>
              <button className="primary-button" onClick={() => {
                if (pendingAction?.type === 'derive') confirmDerive()
                else if (pendingAction?.type === 'complete') confirmComplete()
              }}>
                {pendingAction.type === 'derive' ? '✓ Derivar' : '✓ Atender'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function NavItem({ icon, label, active, count, onClick }: { icon: string; label: string; active: boolean; count?: number; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}><span className="nav-icon">{icon}</span>{label}{count ? <em>{count}</em> : null}</button>
}

function Dashboard({ expedientes, onNew, onViewAll, currentDate }: { expedientes: Expediente[]; onNew: () => void; onViewAll: () => void; currentDate: string }) {
  const pending = expedientes.filter((item) => item.estado === 'Pendiente').length
  const attention = expedientes.filter((item) => item.estado === 'En atención').length
  const attended = expedientes.filter((item) => item.estado === 'Atendido').length
  
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
    </>
  )
}

function StatCard({ label, value, detail, tone, icon }: { label: string; value: number; detail: string; tone: string; icon: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small className={tone === 'green' ? 'positive' : ''}>{detail}</small></div></div>
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge ${status.toLowerCase().replace(' ', '-')}`}><i />{status}</span>
}

function DocumentLink({ item }: { item: Expediente }) {
  if (!item.archivoData) return <span className="table-cell-text" title={item.documentos || item.archivo}>{item.documentos || item.archivo}</span>
  return <a className="document-link" href={item.archivoData} target="_blank" rel="noreferrer" title={`Abrir ${item.archivo}`}>▣ {item.archivo}</a>
}

function ExpedientesView({ items, query, setQuery, areaFilter, areaOptions, setAreaFilter, remitenteFilter, setRemitenteFilter, statusFilter, setStatusFilter, onNew, onDerive, onComplete, onTracking }: { items: Expediente[]; query: string; setQuery: (v: string) => void; areaFilter: string; areaOptions: string[]; setAreaFilter: (v: string) => void; remitenteFilter: string; setRemitenteFilter: (v: string) => void; statusFilter: string; setStatusFilter: (v: string) => void; onNew: () => void; onDerive: (id: string, area: string) => void; onComplete: (id: string) => void; onTracking: (id: string) => void }) {
  const pageSize = 20
  const [page, setPage] = useState(1)
  const [selectedAreaById, setSelectedAreaById] = useState<Record<string, string>>({})
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  
  const cell = (value: string, className = '') => <span className={`table-cell-text ${className}`} title={value}>{value}</span>

  return (
    <>
      <div className="page-heading compact">
        <div><p className="eyebrow">GESTIÓN DOCUMENTAL</p><h1>Expedientes</h1><p className="muted">Consulta, filtra y gestiona los documentos registrados.</p></div>
        <button className="primary-button" onClick={onNew}>＋ Nuevo expediente</button>
      </div>
      <section className="panel list-panel">
        <div className="toolbar">
          <div className="search-box"><span>⌕</span><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Buscar por N.° de expediente o asunto..." /></div>
          <input className="filter-input" value={remitenteFilter} onChange={(e) => { setRemitenteFilter(e.target.value); setPage(1); }} placeholder="Filtrar por remitente..." />
          <select value={areaFilter} onChange={(e) => { setAreaFilter(e.target.value); setPage(1); }}><option>Todas</option>{areaOptions.map((area) => <option key={area}>{area}</option>)}</select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}><option>Todos</option><option>Pendiente</option><option>En atención</option><option>Atendido</option><option>Archivado</option></select>
          <span className="result-count">{items.length} resultados</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>N.° EXP</th><th>FECHA</th><th>NOMBRE / APELLIDO</th><th>ASUNTO</th><th>DOCUMENTOS</th><th>RECIBIDO</th><th>UBICACIÓN ACTUAL</th><th>SEGUIMIENTO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
            <tbody>
              {pageItems.map((item) => {
                const cargo = getRemitenteCargo(item);
                return (
                  <tr key={item.id}>
                    <td><b className="exp-id">{item.id}</b></td>
                    <td>{displayDate(item.fechaIngreso || item.fecha)}</td>
                    <td><span className="person-cell"><span className="small-avatar">{getRemitenteNombre(item).split(' ').map((x) => x[0]).slice(0, 2).join('')}</span><span className="table-cell-group">{cell(getRemitenteNombre(item))}{cargo ? <small>{cargo}</small> : null}</span></span></td>
                    <td><span className="table-cell-group">{cell(item.asunto)}<small>{item.tipo}</small></span></td>
                    <td><DocumentLink item={item} /></td>
                    <td>{cell(item.canalRecepcion || item.modalidadRecepcion || 'No especificado')}</td>
                    <td><span className="table-cell-group">{cell(getAreaDestino(item))}<small>Ubicación del trámite</small></span></td>
                    <td>{cell(item.documentoSeguimiento || 'Pendiente')}</td>
                    <td><StatusBadge status={item.estado} /></td>
                    <td className="actions-cell">
                      <button className="tracking-button" onClick={() => onTracking(item.id)}>◉ Ver seguimiento</button>
                      {item.estado === 'Pendiente' ? (
                        <>
                          <select className="action-area-select" value={selectedAreaById[item.id] || ''} onChange={(event) => setSelectedAreaById({ ...selectedAreaById, [item.id]: event.target.value })}>
                            <option value="">Derivar a...</option>
                            {areas.map((area) => <option key={area}>{area}</option>)}
                          </select>
                          <button className="action-link" onClick={() => onDerive(item.id, selectedAreaById[item.id] || '')}>Derivar</button>
                        </>
                      ) : item.estado === 'En atención' ? (
                        <button className="action-link" onClick={() => onComplete(item.id)}>Atender</button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {items.length === 0 && <div className="empty-state">No se encontraron expedientes con esos criterios.</div>}
        </div>
        <div className="pagination">
          Mostrando <b>{items.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, items.length)}</b> de <b>{items.length}</b> expedientes 
          <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button>
          <b className="current-page">{currentPage}</b>
          <button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>›</button>
        </div>
      </section>
    </>
  )
}

function TrackingModal({ item, onClose }: { item?: Expediente; onClose: () => void }) {
  if (!item) return null
  const history = [...(item.historial || createInitialHistory(item))].reverse()
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="tracking-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="tracking-header">
          <div><p className="eyebrow">RUTA SEGUIDA POR EL EXPEDIENTE</p><h2>{item.id}</h2><p>{item.asunto}</p></div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar seguimiento">×</button>
        </div>
        <div className="tracking-summary">
          <span><b>Remitente</b>{getRemitenteNombre(item)}</span>
          <span><b>Estado actual</b><StatusBadge status={item.estado} /></span>
          <span><b>Ubicación actual</b>{getAreaDestino(item)}</span>
        </div>
        {item.archivoData && (
          <div className="tracking-attachment">
            <b>Documento adjunto</b>
            <DocumentLink item={item} />
            {item.archivoDescripcion && <small>{item.archivoDescripcion}</small>}
          </div>
        )}
        <div className="timeline">
          {history.map((entry, index) => (
            <div className="timeline-item" key={`${entry.fechaHora}-${index}`}>
              <div className="timeline-dot" />
              <div className="timeline-card">
                <div className="timeline-card-header"><strong>{entry.accion}</strong><time>{entry.fechaHora}</time></div>
                <p><b>{entry.areaOrigen}</b><span> → </span><b>{entry.areaDestino}</b></p>
                <small className="timeline-responsible">Responsable: {entry.responsable || 'No registrado'}</small>
                <small>{entry.observacion}</small>
              </div>
            </div>
          ))}
        </div>
        <button className="outline-button tracking-close" onClick={onClose}>Ocultar detalle</button>
      </section>
    </div>
  )
}

function NewExpediente({ onSubmit, onCancel, isSaving }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; isSaving: boolean }) {
  const [selectedFileName, setSelectedFileName] = useState('')

  return (
    <div className="legacy-form-page">
      <form className="form-layout" onSubmit={onSubmit}>
        {isSaving && <div className="saving-notice">Guardando archivo y expediente...</div>}
        <div className="legacy-title">▣ Registro de Expediente MPV</div>
        <section className="panel form-panel">
          <div className="panel-header"><div><h2>Datos del trámite</h2><p>Complete los datos solicitados para registrar el expediente.</p></div></div>
          <div className="form-grid">
            <label>Fecha de ingreso <input name="fechaIngreso" type="date" required defaultValue={todayInputValue()} /></label>
            <label>Trámite <select name="tipo" required><option value="">Seleccione el tipo</option><option>Solicitud</option><option>Oficio</option><option>Memorando</option><option>Informe</option><option>Carta</option><option>Resolución</option></select></label>
            <label className="wide">Nombre / apellido o razón social <input name="remitente" required placeholder="Ingrese el nombre completo o razón social." /></label>
            <label>Cargo del remitente <input name="cargoRemitente" placeholder="Cargo o función del remitente" /></label>
            <label>Representante (si aplica) <input name="representante" placeholder="Nombre del representante" /></label>
            <label>Cargo del representante <input name="cargoRepresentante" placeholder="Cargo" /></label>
            <label className="wide">Asunto de la solicitud <input name="asunto" required placeholder="Registre en forma clara el asunto por el cual ingresa el documento." /></label>
            <label className="wide">Documentos <input name="documentos" required placeholder="Ej. Oficio Múltiple N.° 00129-2025-MINEDU/..." /></label>
          </div>
        </section>
        <section className="panel form-panel">
          <div className="section-strip">▣ Datos del administrado</div>
          <div className="form-grid">
            <label>Tipo de documento <select name="tipoDocumento"><option>RUC</option><option>DNI</option><option>CE</option></select></label>
            <label>Número de documento <div className="inline-field"><input name="numeroDocumento" placeholder="Número de documento" /><button type="button" className="legacy-blue-button">⌕ Validar</button></div></label>
            <label className="wide">Contenido <textarea name="contenido" placeholder="Ingrese el detalle de la solicitud" rows={3} /></label>
            <label className="wide">Dirección <input name="direccion" placeholder="Ingrese la Dirección" /></label>
            <label>Correo electrónico <input name="correo" type="email" placeholder="Correo electrónico" /></label>
            <label>Celular <input name="celular" placeholder="Teléfono de contacto" /></label>
            <label>Folios <input name="folios" type="number" min="1" required defaultValue="1" /></label>
            <label>Anexos <input name="anexos" type="number" min="0" required defaultValue="0" /></label>
            <label>Prioridad <select name="prioridad" required><option>Normal</option><option>Alta</option></select></label>
          </div>
        </section>
        <section className="panel form-panel">
          <div className="section-strip">▣ Recepción y seguimiento</div>
          <div className="form-grid">
            <label>Recibido presencial/virtual <select name="canalRecepcion" required><option value="">Seleccione el canal</option><option>Físico</option><option>Plataforma SINAD</option><option>Virtual</option><option>Presencial</option></select></label>
            <label className="wide">Documento seguimiento <input name="documentoSeguimiento" placeholder="Ej. Informe técnico o memorando" /></label>
          </div>
        </section>
        <section className="panel form-panel">
          <div className="section-strip">▣ Archivos a Adjuntar</div>
          <div className="form-grid attachment-grid">
            <label>Archivo <label className="file-button">▣ Seleccionar archivo<input name="archivo" type="file" accept=".pdf,.jpg,.jpeg,.png" required onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name || '')} /></label><small>{selectedFileName ? `Seleccionado: ${selectedFileName}` : 'Máximo 5 MB.'}</small></label>
            <label>Descripción del archivo <input name="archivoDescripcion" placeholder="Descripción del archivo" /></label>
          </div>
        </section>
        <div className="form-actions">
          <button type="button" className="legacy-light-button" onClick={onCancel}>‹ Anterior</button>
          <button type="submit" className="legacy-blue-button">✓ Enviar</button>
          <button type="reset" className="legacy-blue-button" onClick={() => setSelectedFileName('')}>▰ Limpiar</button>
        </div>
      </form>
    </div>
  )
}

function Reports({ expedientes, notify }: { expedientes: Expediente[]; notify: (message: string) => void }) {
  const total = expedientes.length
  const avgTime = calculateAverageResolutionTime(expedientes)
  
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
        <div className="panel-header"><div><h2>Distribución por área</h2><p>Expedientes registrados durante el periodo actual</p></div></div>
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
