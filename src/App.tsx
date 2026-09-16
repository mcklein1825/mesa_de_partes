
import { useState, useEffect, useMemo, useRef, useCallback, FormEvent } from 'react'
import { supabase } from './lib/supabaseClient'
import UserSelectModal from './components/UserSelectModal'

type Status = 'Pendiente' | 'En atención' | 'Atendido' | 'Archivado'
type View = 'inicio' | 'expedientes' | 'nuevo' | 'reportes'

export type Role = 'MesaPartes' | 'AreaOperativa' | 'Administrador' | 'Auditor'

export type User = {
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
  MesaPartes: {
    puedeRegistrar: true,
    puedeDerivar: true,
    puedeAtender: false,
    puedeArchivar: false,
    puedeEditar: true,
    puedeVerReportes: true,
    puedeVerTodos: true
  },
  AreaOperativa: {
    puedeRegistrar: false,
    puedeDerivar: false,
    puedeAtender: true,
    puedeArchivar: false,
    puedeEditar: false,
    puedeVerReportes: false,
    puedeVerTodos: false
  },
  Administrador: {
    puedeRegistrar: true,
    puedeDerivar: true,
    puedeAtender: true,
    puedeArchivar: true,
    puedeEditar: true,
    puedeVerReportes: true,
    puedeVerTodos: true
  },
  Auditor: {
    puedeRegistrar: false,
    puedeDerivar: false,
    puedeAtender: false,
    puedeArchivar: false,
    puedeEditar: false,
    puedeVerReportes: true,
    puedeVerTodos: true
  }
}

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  'Pendiente': ['En atención'],
  'En atención': ['Atendido', 'Archivado'],
  'Atendido': ['Archivado'],
  'Archivado': []
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
  responsableDestino?: string
}

type Expediente = {
  id: string
  nroExp: string
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
  modalidadRecepcion?: 'Presencial' | 'Virtual' | 'Físico' | 'Plataforma SINAD'
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

export const areas = [
  'Unidad Académica',
  'Administración',
  'Secretaría Académica',
  'Unidad de Bienestar del Estudiante',
  'Unidad de Investigación',
  'Unidad de Formación Continua',
  'Área de Calidad',
  'Electrónica Industrial',
  'Gestión Administrativa',
  'Contabilidad',
  'Desarrollo de Sistemas de Información',
  'Electricidad',
  'Construcción Civil',
  'Mecatrónica Automotriz',
  'Mecánica de Producción'
]
const AREA_RESPONSABLES: Record<string, string> = {
  'Unidad Académica':
    'Ing. NÓSSER JURADO GUILLÉN',

  'Administración':
    'CPC MARICELA OLIVARES MANDUJANO',

  'Secretaría Académica':
    'Ing. AMADEO ANTONIO PAZSOLÁN',

  'Unidad de Bienestar del Estudiante':
    'Mag. JOSÉ LUIS RAZO QUISPE',

  'Unidad de Investigación':
    'Lic. LUIS RAMÍREZ CHUQUIHUANGA',

  'Unidad de Formación Continua':
    'Lic. TEODORO PILLACA DÍAZ',

  'Área de Calidad':
    'Ing. JOSÉ GUTIÉRREZ BARAHONA',

  'Electrónica Industrial':
    'Ing. LUIS ALBERTO ROJAS CAHUA',

  'Gestión Administrativa':
    'Dr. SIDNEY LUCAS TAMAYO',

  'Contabilidad':
    'CPC DOMENICA QUISPE DIAZ',

  'Desarrollo de Sistemas de Información':
    'Ing. BENJAMÍN HUANCA PACHAURI',

  'Electricidad':
    'Lic. LUIS CARHUANCHO PALOMINO',

  'Construcción Civil':
    'Arq. VIRGINIA AZAHUANCHE ASMAT',

  'Mecatrónica Automotriz':
    'Mag. JIM PALOMARES ANSELMO',

  'Mecánica de Producción':
    'Lic. RIGOBERTO HUARACHA CASAS'
}
const splitRemitente = (value: string) => {
  const [name, ...cargo] = value.split(/\s*-\s*/, 2)
  return {
    nombre: name.trim(),
    cargo: cargo.join(' - ').trim()
  }
}

const getRemitenteNombre = (item: Expediente) =>
  item.remitenteNombre || splitRemitente(item.remitente).nombre

const getRemitenteCargo = (item: Expediente) =>
  item.remitenteCargo || splitRemitente(item.remitente).cargo

const getAreaDestino = (item: Expediente) =>
  item.areaDestino || item.entregadoA || item.area || 'Pendiente de asignación'
const formatNroExp = (nroExp: string) =>
  `EXP-2026-${String(nroExp).padStart(5, '0')}`

const getRecordedResponsible = (item: Expediente) => {
  const followUp = item.documentoSeguimiento || ''
  const match = followUp.match(
    /(?:a|por)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ]+){1,3})/
  )
  return match?.[1]?.trim() || ''
}

const createInitialHistory = (item: Expediente): HistoryEntry[] => [
  {
    fechaHora: item.fechaIngreso || item.fecha || 'Fecha pendiente',
    fechaIngreso: item.fechaIngreso || item.fecha || 'Fecha pendiente',
    areaOrigen: 'Mesa de Partes',
    areaDestino: getAreaDestino(item),
    accion: 'Pendiente',
    observacion: 'Expediente recibido y pendiente de asignación.',
    responsable: item.usuarioRegistro || 'Responsable no registrado'
  },
  ...(item.estado !== 'Pendiente'
    ? [{
        fechaHora: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
        fechaSalida: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
        fechaIngreso: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
        areaOrigen: 'Mesa de Partes',
        areaDestino: getAreaDestino(item),
        accion: 'Derivado para atención',
        observacion: 'Expediente enviado al área responsable para su revisión.',
        responsable: item.usuarioRegistro || 'Responsable no registrado'
      }]
    : []),
  ...(['Atendido', 'Archivado'].includes(item.estado)
    ? [{
        fechaHora: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
        fechaSalida: item.fechaHoraRecepcion || item.fechaIngreso || item.fecha || 'Fecha pendiente',
        areaOrigen: getAreaDestino(item),
        areaDestino: 'Mesa de Partes',
        accion: item.estado === 'Archivado' ? 'Archivado' : 'Atendido',
        observacion:
          item.estado === 'Archivado'
            ? 'Expediente archivado luego de su atención.'
            : 'La oficina responsable registró la atención del expediente.',
        responsable: getRecordedResponsible(item) || 'Responsable no registrado'
      }]
    : [])
]

const normalizeExpediente = (item: Expediente): Expediente => {
  const parts = splitRemitente(item.remitente)

  return {
    ...item,
    remitenteNombre: item.remitenteNombre || parts.nombre,
    remitenteCargo: item.remitenteCargo || parts.cargo,
    areaDestino: item.areaDestino || item.entregadoA || item.area || '',
    historial: item.historial?.length
      ? item.historial
      : createInitialHistory(item)
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

const todayInputValue = () => new Date().toISOString().slice(0, 10)

const displayDate = (value: string) =>
  formatDate(value) || 'Pendiente'

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const daysUntilDeadline = (deadlineDate: string): number => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const deadline = new Date(
    deadlineDate.split('/').reverse().join('-')
  )

  const diffTime = deadline.getTime() - today.getTime()

  return Math.ceil(
    diffTime / (1000 * 60 * 60 * 24)
  )
}

const calculateAverageResolutionTime = (
  expedientes: Expediente[]
): number => {
  const attended = expedientes.filter(
    e => e.estado === 'Atendido' || e.estado === 'Archivado'
  )

  if (attended.length === 0) return 0

  let totalDays = 0
  let count = 0

  attended.forEach(exp => {
    const startDate = exp.fechaIngreso || exp.fecha

    if (!startDate) return

    const attendedEntry = exp.historial?.find(
      h => h.accion === 'Atendido' || h.accion === 'Archivado'
    )

    if (!attendedEntry?.fechaHora) return

    const start = new Date(
      startDate.split('/').reverse().join('-')
    )

    const end = new Date(attendedEntry.fechaHora)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return

    const diffTime = Math.abs(
      end.getTime() - start.getTime()
    )

    const diffDays = Math.ceil(
      diffTime / (1000 * 60 * 60 * 24)
    )

    totalDays += diffDays
    count++
  })

  return count > 0
    ? Math.round(totalDays / count)
    : 0
}

const exportReportToCSV = (expedientes: Expediente[]) => {
  const headers = [
    'Nro. Expediente',
    'Fecha',
    'Remitente',
    'Asunto',
    'Área',
    'Estado',
    'Prioridad',
    'Plazo'
  ]

  const rows = expedientes.map(e => [
    formatNroExp(e.nroExp),
    e.fechaIngreso || e.fecha,
    getRemitenteNombre(e),
    `"${e.asunto.replace(/"/g, '""')}"`,
    getAreaDestino(e),
    e.estado,
    e.prioridad,
    e.plazo
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n')

  const blob = new Blob(
    [csvContent],
    { type: 'text/csv;charset=utf-8;' }
  )

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download =
    `reporte-expedientes-${new Date().toISOString().slice(0, 10)}.csv`

  link.click()
  URL.revokeObjectURL(url)
}

const readFileAsDataUrl = (
  file: File
): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(
            new Error('No se pudo leer el archivo.')
          )

    reader.onerror = () =>
      reject(
        reader.error ||
        new Error('No se pudo leer el archivo.')
      )

    reader.readAsDataURL(file)
  })

function App() {
  const [currentUser, setCurrentUser] =
    useState<User | null>(null)

  const [view, setView] =
    useState<View>('nuevo')

  const [expedientes, setExpedientes] =
    useState<Expediente[]>([])

  const [loadingDb, setLoadingDb] =
    useState(true)

  const [query, setQuery] =
    useState('')

  const [areaFilter, setAreaFilter] =
    useState('Todas')

  const [remitenteFilter, setRemitenteFilter] =
    useState('')

  const [statusFilter, setStatusFilter] =
    useState('Todos')

  const [trackingId, setTrackingId] =
    useState<string | null>(null)

  const [showProfile, setShowProfile] =
    useState(false)

  const [toast, setToast] =
    useState('')

  const [isSaving, setIsSaving] =
    useState(false)

  const [pendingAction, setPendingAction] =
    useState<{
      type: 'derive' | 'complete' | 'archive'
      id: string
      area?: string
    } | null>(null)

  const notify = useCallback((message: string) => {
    setToast(message)

    window.setTimeout(() => {
      setToast('')
    }, 3000)
  }, [])

  const sessionTimeoutRef =
    useRef<number | null>(null)

  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeoutRef.current) {
      window.clearTimeout(
        sessionTimeoutRef.current
      )
    }

    sessionTimeoutRef.current =
      window.setTimeout(() => {
        notify(
          'Sesión expirada por inactividad'
        )
        setCurrentUser(null)
      }, 30 * 60 * 1000)
  }, [notify])

  useEffect(() => {
    if (!currentUser) return

    resetSessionTimeout()

    const events = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart'
    ]

    events.forEach(event =>
      window.addEventListener(
        event,
        resetSessionTimeout
      )
    )

    return () => {
      if (sessionTimeoutRef.current) {
        window.clearTimeout(
          sessionTimeoutRef.current
        )
      }

      events.forEach(event =>
        window.removeEventListener(
          event,
          resetSessionTimeout
        )
      )
    }
  }, [
    currentUser,
    resetSessionTimeout
  ])

  useEffect(() => {
    const cargarDeSupabase = async () => {
      setLoadingDb(true)

      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .select('*')
        .order('nro_exp', {
          ascending: false
        })

      if (error) {
        console.error(
          'Supabase Error:',
          error
        )

        notify(
          'Error al cargar expedientes desde Supabase'
        )

        setLoadingDb(false)
        return
      }

      if (data) {
        const normalizados: Expediente[] =
          data.map((item: any) => {
            const nombreCompleto =
              item.nombre_apellido ||
              item.remitente ||
              'Sin nombre'

            const parts =
              splitRemitente(
                nombreCompleto
              )

            return normalizeExpediente({
              id: String(item.id || ''),
              nroExp: String(item.nro_exp || ''),
              fechaIngreso:
                item.fecha_ingreso || '',
              remitente:
                nombreCompleto,
              remitenteNombre:
                item.remitente_nombre ||
                parts.nombre ||
                nombreCompleto,
              remitenteCargo:
                item.remitente_cargo ||
                parts.cargo ||
                '',
              documento:
                item.documento || '',
              tipo:
                item.tipo || '',
              asunto:
                item.asunto || '',
              contenido:
                item.contenido || '',
              area:
                item.area || '',
              areaDestino:
                item.area_destino || '',
              estado:
                item.estado || 'Pendiente',
              fecha:
                item.fecha || '',
              plazo:
                item.plazo || '',
              prioridad:
                item.prioridad || 'Normal',
              archivo:
                item.archivo ||
                'Sin adjunto',
              archivoData:
                item.archivo_data || '',
              archivoTipo:
                item.archivo_tipo || '',
              archivoTamano:
                item.archivo_tamano || 0,
              archivoDescripcion:
                item.archivo_descripcion || '',
              documentos:
                item.documentos || '',
              modalidadRecepcion:
                item.modalidad_recepcion || undefined,
              entregadoA:
                item.entregado_a || '',
              documentoSeguimiento:
                item.documento_seguimiento || '',
              canalRecepcion:
                item.canal_recepcion || '',
              folios:
                item.folios ?? 1,
              anexos:
                item.anexos ?? 0,
              direccion:
                item.direccion || '',
              correo:
                item.correo || '',
              celular:
                item.celular || '',
              representante:
                item.representante || '',
              cargoRepresentante:
                item.cargo_representante || '',
              usuarioRegistro:
                item.usuario_registro || '',
              fechaHoraRecepcion:
                item.fecha_hora_recepcion || '',
              constanciaRecepcion:
                item.constancia_recepcion || '',
              historial:
                Array.isArray(item.historial)
                  ? item.historial
                  : []
            })
          })

        setExpedientes(
          normalizados
        )
      }

      setLoadingDb(false)
    }

    cargarDeSupabase()
  }, [notify])

  const userPermissions =
    currentUser
      ? ROLE_PERMISSIONS[
          currentUser.rol
        ]
      : null

  const areaOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...areas,
          ...expedientes
            .map(getAreaDestino)
            .filter(Boolean)
        ])
      ).sort(),
    [expedientes]
  )

  const currentDate = useMemo(() => {
    const now = new Date()

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }

    return now
      .toLocaleDateString(
        'es-PE',
        options
      )
      .toUpperCase()
  }, [])
const filteredExpedientes = useMemo(
  () =>
    expedientes.filter(item => {
      const matchesQuery =
        `${item.nroExp} ${formatNroExp(item.nroExp)} ${item.asunto}`
          .toLowerCase()
          .includes(
            query
              .trim()
              .toLowerCase()
          )
        const matchesArea =
          areaFilter === 'Todas' ||
          getAreaDestino(item) ===
            areaFilter

        const matchesRemitente =
          getRemitenteNombre(item)
            .toLowerCase()
            .includes(
              remitenteFilter
                .trim()
                .toLowerCase()
            )

        const matchesStatus =
          statusFilter === 'Todos' ||
          item.estado === statusFilter

        return (
          matchesQuery &&
          matchesArea &&
          matchesRemitente &&
          matchesStatus
        )
      }),
    [
      expedientes,
      query,
      areaFilter,
      remitenteFilter,
      statusFilter
    ]
  )

  const addExpediente = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (
      !currentUser ||
      !userPermissions?.puedeRegistrar
    ) {
      notify(
        'No tiene permisos para registrar expedientes'
      )
      return
    }

    const form =
      event.currentTarget

    const data =
      new FormData(form)

 const nextNumber = expedientes.reduce(
  (highest, item) => {
    const numero = Number(item.nroExp)
    return Number.isFinite(numero)
      ? Math.max(highest, numero)
      : highest
  },
  0
) + 1

const currentYear = new Date().getFullYear()
const nextId = `EXP-${currentYear}-${String(nextNumber).padStart(5, '0')}`

    const selectedFile =
      data.get('archivo')

    if (
      !(selectedFile instanceof File) ||
      !selectedFile.size
    ) {
      notify(
        'Seleccione un archivo antes de registrar el expediente'
      )
      return
    }

    if (
      selectedFile.size >
      5 * 1024 * 1024
    ) {
      notify(
        'El archivo supera el límite de 5 MB'
      )
      return
    }

    let fileData = ''

    try {
      setIsSaving(true)

      fileData =
        await readFileAsDataUrl(
          selectedFile
        )
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'No se pudo leer el archivo seleccionado'
      )
      setIsSaving(false)
      return
    }

    const fechaIngreso =
      String(
        data.get(
          'fechaIngreso'
        ) || ''
      )

    const fechaFormateada =
      formatDate(
        fechaIngreso
      )

    const remitente =
      String(
        data.get(
          'remitente'
        ) || ''
      ).trim()

    const tipoDocumento =
      String(
        data.get(
          'tipoDocumento'
        ) || ''
      )

    const numeroDocumento =
      String(
        data.get(
          'numeroDocumento'
        ) || ''
      )

    const newExpediente: Expediente = {
      id: '',
      nroExp: String(nextNumber),
      fechaIngreso:
        fechaFormateada,
      remitente,
      remitenteNombre:
        remitente,
      remitenteCargo:
        String(
          data.get(
            'cargoRemitente'
          ) || ''
        ).trim(),
      documento:
        `${tipoDocumento} ${numeroDocumento}`.trim(),
      representante:
        String(
          data.get(
            'representante'
          ) || ''
        ),
      cargoRepresentante:
        String(
          data.get(
            'cargoRepresentante'
          ) || ''
        ),
      tipo:
        String(
          data.get(
            'tipo'
          ) || ''
        ),
      asunto:
        String(
          data.get(
            'asunto'
          ) || ''
        ),
      contenido:
        String(
          data.get(
            'contenido'
          ) || ''
        ),
      area: '',
      areaDestino: '',
      estado:
        'Pendiente',
      fecha:
        fechaFormateada,
      plazo:
        addDays(
          fechaIngreso,
          7
        ),
      prioridad:
        String(
          data.get(
            'prioridad'
          ) || 'Normal'
        ) as 'Normal' | 'Alta',
      archivo:
        selectedFile.name ||
        'Sin adjunto',
      archivoData:
        fileData,
      archivoTipo:
        selectedFile.type ||
        'application/octet-stream',
      archivoTamano:
        selectedFile.size,
      archivoDescripcion:
        String(
          data.get(
            'archivoDescripcion'
          ) || ''
        ).trim(),
      documentos:
        String(
          data.get(
            'documentos'
          ) || ''
        ),
      modalidadRecepcion:
      String(
        data.get('canalRecepcion') || ''),
      entregadoA: '',
      documentoSeguimiento:
        String(
          data.get(
            'documentoSeguimiento'
          ) || 'Pendiente'
        ),
      canalRecepcion:
        String(
          data.get(
            'canalRecepcion'
          ) || ''
        ),
      folios:
        Number(
          data.get(
            'folios'
          ) || 1
        ),
      anexos:
        Number(
          data.get(
            'anexos'
          ) || 0
        ),
      direccion:
        String(
          data.get(
            'direccion'
          ) || ''
        ),
      correo:
        String(
          data.get(
            'correo'
          ) || ''
        ),
      celular:
        String(
          data.get(
            'celular'
          ) || ''
        ),
      usuarioRegistro:
        `${currentUser.nombre} - ${currentUser.area || ''}`,
      fechaHoraRecepcion:
        new Date().toISOString(),
      constanciaRecepcion:
        `Cargo generado para ${nextId}`
    }

    newExpediente.historial =
      createInitialHistory(
        newExpediente
      )

    const { data: insertedData, error } =
      await supabase
        .from(
          'mesa_partes_2026'
        )
        .insert({
          nro_exp:
            newExpediente.nroExp,
          fecha_ingreso:
            fechaIngreso,
          nombre_apellido:
            newExpediente.remitente,
          remitente:
            newExpediente.remitente,
          remitente_nombre:
            newExpediente.remitenteNombre,
          remitente_cargo:
            newExpediente.remitenteCargo,
          documento:
            newExpediente.documento,
          tipo:
            newExpediente.tipo,
          asunto:
            newExpediente.asunto,
          contenido:
            newExpediente.contenido,
          area:
            newExpediente.area,
          area_destino:
            newExpediente.areaDestino,
          estado:
            newExpediente.estado,
          fecha:
            fechaIngreso,
          plazo:
            newExpediente.plazo,
          prioridad:
            newExpediente.prioridad,
          archivo:
            newExpediente.archivo,
          archivo_data:
            newExpediente.archivoData,
          archivo_tipo:
            newExpediente.archivoTipo,
          archivo_tamano:
            newExpediente.archivoTamano,
          archivo_descripcion:
            newExpediente.archivoDescripcion,
          documentos:
            newExpediente.documentos,
          modalidad_recepcion:
            newExpediente.modalidadRecepcion,
          entregado_a:
            newExpediente.entregadoA,
          documento_seguimiento:
            newExpediente.documentoSeguimiento,
          canal_recepcion:
            newExpediente.canalRecepcion,
          folios:
            newExpediente.folios,
          anexos:
            newExpediente.anexos,
          direccion:
            newExpediente.direccion,
          correo:
            newExpediente.correo,
          celular:
            newExpediente.celular,
          representante:
            newExpediente.representante,
          cargo_representante:
            newExpediente.cargoRepresentante,
          usuario_registro:
            newExpediente.usuarioRegistro,
          fecha_hora_recepcion:
            newExpediente.fechaHoraRecepcion,
          constancia_recepcion:
            newExpediente.constanciaRecepcion,
          historial:
            newExpediente.historial
          })
            .select()
            .single()

if (error) {
  console.error(
    'Error insertando expediente:',
    error
  )

  notify(
    `No se pudo registrar el expediente: ${error.message}`
  )

  setIsSaving(false)
  return
}

setIsSaving(false)

const expedienteInsertado =
  insertedData
    ? normalizeExpediente({
        ...newExpediente,
        id: String(insertedData.id),
        nroExp: String(
          insertedData.nro_exp ||
            newExpediente.nroExp
        )
      })
    : newExpediente

setExpedientes(prev => [
  expedienteInsertado,
  ...prev
])

form.reset()

setView('expedientes')

notify(
  `Expediente ${nextId} registrado correctamente`
)
  }

  const deriveExpediente = (
    id: string,
    targetArea: string
  ) => {
    if (
      !userPermissions?.puedeDerivar
    ) {
      notify(
        'No tiene permisos para derivar expedientes'
      )
      return
    }

    if (!targetArea) {
      notify(
        'Seleccione el área de destino antes de derivar'
      )
      return
    }

    const expediente =
      expedientes.find(
        e => e.id === id
      )

    if (!expediente) {
      notify(
        'Expediente no encontrado'
      )
      return
    }

    if (
      !VALID_TRANSITIONS[
        expediente.estado
      ].includes(
        'En atención'
      )
    ) {
      notify(
        `No se puede derivar: estado actual "${expediente.estado}" no permite transición a "En atención"`
      )
      return
    }

    setPendingAction({
      type: 'derive',
      id,
      area: targetArea
    })
  }

  const confirmDerive = async () => {
    if (
      !pendingAction ||
      pendingAction.type !== 'derive' ||
      !pendingAction.area ||
      !currentUser
    ) {
      return
    }

    const {
      id,
      area: targetArea
    } = pendingAction
    const responsable =
  AREA_RESPONSABLES[targetArea] || targetArea

    const expediente =
      expedientes.find(
        e => e.id === id
      )

    if (!expediente) {
      notify(
        'Expediente no encontrado'
      )
      return
    }

    const timestamp =
      new Date().toLocaleString(
        'es-PE'
      )

    const historial = [
      ...(expediente.historial ||
        createInitialHistory(
          expediente
        )),
    {
          fechaHora:
            timestamp,
          fechaSalida:
            timestamp,
          fechaIngreso:
            timestamp,
          areaOrigen:
            'Mesa de Partes',
          areaDestino:
            targetArea,
          accion:
            'Derivado para atención',
          observacion:
            `Expediente enviado a ${targetArea}. Responsable: ${responsable}.`,
          responsable:
            `${currentUser.nombre} - ${currentUser.area || ''}`,
          responsableDestino:
            responsable
    }
    ]

    const { error } =
      await supabase
        .from(
          'mesa_partes_2026'
        )
        .update({
          estado:
            'En atención',
          area:
            targetArea,
          area_destino:
            targetArea,
          entregado_a:
            responsable,
          historial
        })
        .eq(
          'id',
          id
        )

    if (error) {
      console.error(
        'Error derivando expediente:',
        error
      )

      notify(
        `No se pudo derivar: ${error.message}`
      )

      return
    }

    setExpedientes(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              estado:
                'En atención',
              area:
                targetArea,
              areaDestino:
                targetArea,
              entregadoA:
                targetArea,
              historial
            }
          : item
      )
    )

    notify(
      'Expediente derivado y enviado a En atención'
    )

    setPendingAction(
      null
    )
  }

  const completeExpediente = (
    id: string
  ) => {
    if (
      !userPermissions?.puedeAtender
    ) {
      notify(
        'No tiene permisos para atender expedientes'
      )
      return
    }

    const expediente =
      expedientes.find(
        e => e.id === id
      )

    if (!expediente) {
      notify(
        'Expediente no encontrado'
      )
      return
    }

    if (
      !VALID_TRANSITIONS[
        expediente.estado
      ].includes('Atendido')
    ) {
      notify(
        `No se puede atender: estado actual "${expediente.estado}"`
      )
      return
    }

    setPendingAction({
      type: 'complete',
      id
    })
  }

  const confirmComplete =
    async () => {
      if (
        !pendingAction ||
        pendingAction.type !==
          'complete' ||
        !currentUser
      ) {
        return
      }

      const { id } =
        pendingAction

      const expediente =
        expedientes.find(
          e => e.id === id
        )

      if (!expediente) {
        notify(
          'Expediente no encontrado'
        )
        return
      }

      const timestamp =
        new Date().toLocaleString(
          'es-PE'
        )

      const historial = [
        ...(expediente.historial ||
          createInitialHistory(
            expediente
          )),
        {
          fechaHora:
            timestamp,
          fechaSalida:
            timestamp,
          fechaIngreso:
            timestamp,
          areaOrigen:
            getAreaDestino(
              expediente
            ),
          areaDestino:
            'Mesa de Partes',
          accion:
            'Atendido',
          observacion:
            'La oficina responsable registró la atención del expediente.',
          responsable:
            `${currentUser.nombre} - ${currentUser.area || getAreaDestino(expediente)}`
        }
      ]

      const { error } =
        await supabase
          .from(
            'mesa_partes_2026'
          )
          .update({
            estado:
              'Atendido',
            historial
          })
          .eq(
            'id',
            id
          )

      if (error) {
        console.error(
          'Error atendiendo expediente:',
          error
        )

        notify(
          `No se pudo marcar como atendido: ${error.message}`
        )

        return
      }

      setExpedientes(prev =>
        prev.map(item =>
          item.id === id
            ? {
                ...item,
                estado:
                  'Atendido',
                historial
              }
            : item
        )
      )

      notify(
        'Expediente marcado como Atendido'
      )

      setPendingAction(
        null
      )
    }

  const cancelPendingAction =
    () => {
      setPendingAction(
        null
      )
    }

  if (!currentUser) {
    return (
      <UserSelectModal
        onSelectUser={
          setCurrentUser
        }
      />
    )
  }

  return (
    <div className="app-shell portal-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">MP</div>
          <div>
            <strong>
              Mesa de Partes
            </strong>
            <span>
              Gestión documental
            </span>
          </div>
        </div>

        <div className="menu-label">
          MENÚ PRINCIPAL
        </div>

        <nav className="nav-menu">
          <NavItem
            icon="⌂"
            label="Inicio"
            active={
              view === 'inicio'
            }
            onClick={() =>
              setView('inicio')
            }
          />

          <NavItem
            icon="▤"
            label="Expedientes"
            active={
              view ===
              'expedientes'
            }
            onClick={() =>
              setView(
                'expedientes'
              )
            }
            count={
              expedientes.filter(
                item =>
                  item.estado ===
                  'Pendiente'
              ).length
            }
          />

          <NavItem
            icon="＋"
            label="Nuevo expediente"
            active={
              view === 'nuevo'
            }
            onClick={() =>
              setView('nuevo')
            }
          />

          <NavItem
            icon="▥"
            label="Reportes"
            active={
              view === 'reportes'
            }
            onClick={() =>
              setView('reportes')
            }
          />
        </nav>

        <div className="sidebar-footer">
          <div className="secure-note">
            <span>⌁</span>
            <div>
              <b>
                Supabase
              </b>
              <small>
                Datos almacenados en la base de datos
              </small>
            </div>
          </div>

          <div
            className="user-mini"
            onClick={() =>
              setShowProfile(
                !showProfile
              )
            }
            role="button"
            tabIndex={0}
          >
            <div className="avatar">
              {currentUser.nombre
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')}
            </div>

            <div>
              <b>
                {currentUser.nombre}
              </b>
              <small>
                {currentUser.rol ===
                'MesaPartes'
                  ? 'Mesa de Partes'
                  : currentUser.rol}
              </small>
            </div>

            <span>⋮</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar portal-bar">
          <div className="portal-brand">
            <div className="portal-mark">
              MP
            </div>
            <strong>
              Mesa de Partes Virtual
            </strong>
          </div>

          <nav className="portal-links">
            <button
              className={
                view === 'nuevo'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setView('nuevo')
              }
            >
              Registro de Expediente
            </button>

            <button
              className={
                view ===
                'expedientes'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setView(
                  'expedientes'
                )
              }
            >
              Consulta de Expedientes
            </button>

            <button
              className={
                view === 'reportes'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setView(
                  'reportes'
                )
              }
            >
              Reportes
            </button>

            <button
              className={
                view === 'inicio'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setView('inicio')
              }
            >
              Inicio
            </button>
          </nav>

          <div className="top-actions">
            <button
              className="profile-button"
              onClick={() =>
                setShowProfile(
                  !showProfile
                )
              }
            >
              <div className="avatar">
                {currentUser.nombre
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>

              <span>
                {currentUser.nombre}
              </span>

              <b>⌄</b>
            </button>

            {showProfile && (
              <div className="profile-popover">
                <b>
                  {currentUser.nombre}
                </b>

                <span>
                  Rol:{' '}
                  {currentUser.rol ===
                  'MesaPartes'
                    ? 'Mesa de Partes'
                    : currentUser.rol}
                </span>

                <span>
                  Área:{' '}
                  {currentUser.area ||
                    'N/A'}
                </span>

                <hr />

                <button
                  onClick={() => {
                    notify(
                      'Configuración disponible en versión completa'
                    )
                    setShowProfile(
                      false
                    )
                  }}
                >
                  Configuración
                </button>

                <button
                  onClick={() => {
                    setCurrentUser(
                      null
                    )
                    setShowProfile(
                      false
                    )
                    notify(
                      'Sesión cerrada correctamente'
                    )
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="page">
          {loadingDb ? (
            <div className="empty-state">
              Cargando expedientes desde Supabase...
            </div>
          ) : (
            <>
              {view ===
                'inicio' && (
                <Dashboard
                  expedientes={
                    expedientes
                  }
                  onNew={() =>
                    setView(
                      'nuevo'
                    )
                  }
                  onViewAll={() =>
                    setView(
                      'expedientes'
                    )
                  }
                  currentDate={
                    currentDate
                  }
                />
              )}

              {view ===
                'expedientes' && (
                <ExpedientesView
                items={filteredExpedientes}
                query={query}
                setQuery={
                  setQuery
                }
                  areaFilter={
                    areaFilter
                  }
                  areaOptions={
                    areaOptions
                  }
                  setAreaFilter={
                    setAreaFilter
                  }
                  remitenteFilter={
                    remitenteFilter
                  }
                  setRemitenteFilter={
                    setRemitenteFilter
                  }
                  statusFilter={
                    statusFilter
                  }
                  setStatusFilter={
                    setStatusFilter
                  }
                  onNew={() =>
                    setView(
                      'nuevo'
                    )
                  }
                  onDerive={
                    deriveExpediente
                  }
                  onComplete={
                    completeExpediente
                  }
                  onTracking={
                    setTrackingId
                  }
                />
              )}

              {view ===
                'nuevo' && (
                <NewExpediente
                  onSubmit={
                    addExpediente
                  }
                  onCancel={() =>
                    setView(
                      'inicio'
                    )
                  }
                  isSaving={
                    isSaving
                  }
                />
              )}

              {view ===
                'reportes' && (
                <Reports
                  expedientes={
                    expedientes
                  }
                  notify={
                    notify
                  }
                />
              )}
            </>
          )}
        </div>
      </main>

      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}

      {trackingId && (
        <TrackingModal
          item={expedientes.find(
            item =>
              item.id ===
              trackingId
          )}
          onClose={() =>
            setTrackingId(null)
          }
        />
      )}

      {pendingAction && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={
            cancelPendingAction
          }
        >
          <section
            className="confirmation-modal"
            role="dialog"
            aria-modal="true"
            onClick={event =>
              event.stopPropagation()
            }
          >
            <div className="confirmation-header">
              <h2>
                Confirmar acción
              </h2>

              <button
                className="modal-close"
                onClick={
                  cancelPendingAction
                }
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="confirmation-body">
              {pendingAction.type ===
              'derive' ? (
                <>
                  <p>
                    ¿Está seguro que desea derivar este expediente?
                  </p>
                  
                  <p className="confirmation-detail">
                    <strong>Área destino:</strong>{' '}
                    {pendingAction.area}
                  </p>
                  
                  <p className="confirmation-detail">
                    <strong>Responsable:</strong>{' '}
                    {pendingAction.area
                      ? AREA_RESPONSABLES[pendingAction.area] ||
                        pendingAction.area
                      : 'No asignado'}
                  </p>
                  
                  <p className="confirmation-detail">
                    Esta acción no se puede deshacer.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    ¿Está seguro que desea marcar este expediente como atendido?
                  </p>

                  <p className="confirmation-detail">
                    Esta acción cambiará el estado del expediente.
                  </p>
                </>
              )}
            </div>

            <div className="confirmation-actions">
              <button
                className="outline-button"
                onClick={
                  cancelPendingAction
                }
              >
                Cancelar
              </button>

              <button
                className="primary-button"
                onClick={() => {
                  if (
                    pendingAction.type ===
                    'derive'
                  ) {
                    confirmDerive()
                  } else if (
                    pendingAction.type ===
                    'complete'
                  ) {
                    confirmComplete()
                  }
                }}
              >
                {pendingAction.type ===
                'derive'
                  ? '✓ Derivar'
                  : '✓ Atender'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function NavItem({
  icon,
  label,
  active,
  count,
  onClick
}: {
  icon: string
  label: string
  active: boolean
  count?: number
  onClick: () => void
}) {
  return (
    <button
      className={`nav-item ${
        active ? 'active' : ''
      }`}
      onClick={onClick}
    >
      <span className="nav-icon">
        {icon}
      </span>

      {label}

      {count ? (
        <em>{count}</em>
      ) : null}
    </button>
  )
}

function Dashboard({
  expedientes,
  onNew,
  onViewAll,
  currentDate
}: {
  expedientes: Expediente[]
  onNew: () => void
  onViewAll: () => void
  currentDate: string
}) {
  const pending =
    expedientes.filter(
      item =>
        item.estado ===
        'Pendiente'
    ).length

  const attention =
    expedientes.filter(
      item =>
        item.estado ===
        'En atención'
    ).length

  const attended =
    expedientes.filter(
      item =>
        item.estado ===
        'Atendido'
    ).length

  const upcomingDeadlines =
    expedientes
      .filter(
        item =>
          (
            item.estado ===
              'Pendiente' ||
            item.estado ===
              'En atención'
          ) &&
          item.plazo
      )
      .map(item => ({
        ...item,
        daysLeft:
          daysUntilDeadline(
            item.plazo
          )
      }))
      .filter(
        item =>
          item.daysLeft >= 0 &&
          item.daysLeft <= 15
      )
      .sort(
        (a, b) =>
          a.daysLeft -
          b.daysLeft
      )
      .slice(0, 3)

  const formatDateShort = (
    dateStr: string
  ) => {
    const date = new Date(
      dateStr
        .split('/')
        .reverse()
        .join('-')
    )

    return {
      day:
        date.getDate(),
      month:
        date
          .toLocaleString(
            'es-PE',
            {
              month: 'short'
            }
          )
          .toUpperCase()
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {currentDate}
          </p>

          <h1>
            Buenos días, Lucía{' '}
            <span>👋</span>
          </h1>

          <p className="muted">
            Aquí tienes el resumen de tu mesa de partes.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={onNew}
        >
          ＋ Nuevo expediente
        </button>
      </div>

      <section className="stats-grid">
        <StatCard
          label="Por atender"
          value={pending}
          detail="Requieren derivación"
          tone="orange"
          icon="◷"
        />

        <StatCard
          label="En atención"
          value={attention}
          detail="En las áreas responsables"
          tone="blue"
          icon="↗"
        />

        <StatCard
          label="Atendidos"
          value={attended}
          detail="Registros con seguimiento"
          tone="green"
          icon="✓"
        />

        <StatCard
          label="Total de expedientes"
          value={
            expedientes.length
          }
          detail={`Año ${new Date().getFullYear()}`}
          tone="purple"
          icon="▤"
        />
      </section>

      <div className="content-grid">
        <section className="panel recent-panel">
          <div className="panel-header">
            <div>
              <h2>
                Expedientes recientes
              </h2>
              <p>
                Últimos documentos registrados en el sistema
              </p>
            </div>

            <button
              className="text-button"
              onClick={
                onViewAll
              }
            >
              Ver todos{' '}
              <span>→</span>
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    N° DE EXPEDIENTE
                  </th>
                  <th>
                    REMITENTE
                  </th>
                  <th>
                    ASUNTO
                  </th>
                  <th>
                    ÁREA DESTINO
                  </th>
                  <th>
                    ESTADO
                  </th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {expedientes
                  .slice(0, 4)
                  .map(item => (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td>
                        <b className="exp-id">
                          {formatNroExp(item.nroExp)}
                        </b>
                        <small>
                          {item.fecha}
                        </small>
                      </td>

                      <td>
                        <span className="person-cell">
                          <span className="small-avatar">
                            {getRemitenteNombre(
                              item
                            )
                              .split(
                                ' '
                              )
                              .map(
                                x =>
                                  x[0]
                              )
                              .slice(
                                0,
                                2
                              )
                              .join(
                                ''
                              )}
                          </span>

                          {getRemitenteNombre(
                            item
                          )}
                        </span>
                      </td>

                      <td>
                        {item.asunto}
                      </td>

                      <td>
                        {getAreaDestino(
                          item
                        )}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            item.estado
                          }
                        />
                      </td>

                      <td>
                        <button className="dots">
                          •••
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel deadlines-panel">
          <div className="panel-header">
            <div>
              <h2>
                Próximos vencimientos
              </h2>

              <p>
                Expedientes que requieren atención
              </p>
            </div>

            <span className="warning-icon">
              !
            </span>
          </div>

          <div className="deadline-list">
            {upcomingDeadlines.length >
            0 ? (
              upcomingDeadlines.map(
                item => {
                  const {
                    day,
                    month
                  } =
                    formatDateShort(
                      item.plazo
                    )

                  return (
                    <div
                      className="deadline-item"
                      key={
                        item.id
                      }
                    >
                      <div
                        className={`deadline-date ${
                          item.daysLeft <=
                          3
                            ? 'urgent'
                            : ''
                        }`}
                      >
                        <b>
                          {day}
                        </b>
                        <span>
                          {month}
                        </span>
                      </div>

                      <div>
                        <b>
                          {formatNroExp(item.nroExp)}
                        </b>

                        <p>
                          {item.asunto}
                        </p>

                        <small>
                          {item.daysLeft ===
                          0
                            ? 'Vence hoy'
                            : item.daysLeft ===
                              1
                            ? 'Vence mañana'
                            : `Vence en ${item.daysLeft} días`}
                        </small>
                      </div>
                    </div>
                  )
                }
              )
            ) : (
              <div
                className="empty-state"
                style={{
                  padding:
                    '20px',
                  textAlign:
                    'center'
                }}
              >
                No hay vencimientos próximos
              </div>
            )}
          </div>

          <button
            className="outline-button"
            onClick={
              onViewAll
            }
          >
            Ver calendario de vencimientos
          </button>
        </section>
      </div>
    </>
  )
}

function StatCard({
  label,
  value,
  detail,
  tone,
  icon
}: {
  label: string
  value: number
  detail: string
  tone: string
  icon: string
}) {
  return (
    <div className="stat-card">
      <div
        className={`stat-icon ${tone}`}
      >
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small
          className={
            tone === 'green'
              ? 'positive'
              : ''
          }
        >
          {detail}
        </small>
      </div>
    </div>
  )
}

function StatusBadge({
  status
}: {
  status: Status
}) {
  return (
    <span
      className={`status-badge ${status
        .toLowerCase()
        .replace(' ', '-')}`}
    >
      <i />
      {status}
    </span>
  )
}

function DocumentLink({
  item
}: {
  item: Expediente
}) {
  if (!item.archivoData) {
    return (
      <span
        className="table-cell-text"
        title={
          item.documentos ||
          item.archivo
        }
      >
        {item.documentos ||
          item.archivo}
      </span>
    )
  }

  return (
    <a
      className="document-link"
      href={
        item.archivoData
      }
      target="_blank"
      rel="noreferrer"
      title={`Abrir ${item.archivo}`}
    >
      ▣ {item.archivo}
    </a>
  )
}

function ExpedientesView({
  items,
  query,
  setQuery,
  areaFilter,
  areaOptions,
  setAreaFilter,
  remitenteFilter,
  setRemitenteFilter,
  statusFilter,
  setStatusFilter,
  onNew,
  onDerive,
  onComplete,
  onTracking
}: {
  items: Expediente[]
  query: string
  setQuery: (v: string) => void
  areaFilter: string
  areaOptions: string[]
  setAreaFilter: (v: string) => void
  remitenteFilter: string
  setRemitenteFilter: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
  onNew: () => void
  onDerive: (
    id: string,
    area: string
  ) => void
  onComplete: (
    id: string
  ) => void
  onTracking: (
    id: string
  ) => void
}) {
  const pageSize = 20

  const [page, setPage] =
    useState(1)

  const [
    selectedAreaById,
    setSelectedAreaById
  ] = useState<
    Record<string, string>
  >({})

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        items.length /
          pageSize
      )
    )

  const currentPage =
    Math.min(
      page,
      pageCount
    )

  const pageItems =
    items.slice(
      (currentPage - 1) *
        pageSize,
      currentPage *
        pageSize
    )

  const cell = (
    value: string,
    className = ''
  ) => (
    <span
      className={`table-cell-text ${className}`}
      title={value}
    >
      {value}
    </span>
  )

  return (
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">
            GESTIÓN DOCUMENTAL
          </p>

          <h1>
            Expedientes
          </h1>

          <p className="muted">
            Consulta, filtra y gestiona los documentos registrados.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={onNew}
        >
          ＋ Nuevo expediente
        </button>
      </div>

      <section className="panel list-panel">
        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>

            <input
              value={query}
              onChange={e => {
                setQuery(
                  e.target.value
                )
                setPage(1)
              }}
              placeholder="Buscar por N.° de expediente o asunto..."
            />
          </div>

          <input
            className="filter-input"
            value={
              remitenteFilter
            }
            onChange={e => {
              setRemitenteFilter(
                e.target.value
              )
              setPage(1)
            }}
            placeholder="Filtrar por remitente..."
          />

          <select
            value={
              areaFilter
            }
            onChange={e => {
              setAreaFilter(
                e.target.value
              )
              setPage(1)
            }}
          >
            <option>
              Todas
            </option>

            {areaOptions.map(
              area => (
                <option
                  key={
                    area
                  }
                >
                  {area}
                </option>
              )
            )}
          </select>

          <select
            value={
              statusFilter
            }
            onChange={e => {
              setStatusFilter(
                e.target.value
              )
              setPage(1)
            }}
          >
            <option>
              Todos
            </option>
            <option>
              Pendiente
            </option>
            <option>
              En atención
            </option>
            <option>
              Atendido
            </option>
            <option>
              Archivado
            </option>
          </select>

          <span className="result-count">
            {items.length}{' '}
            resultados
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  N.° EXP
                </th>
                <th>
                  FECHA
                </th>
                <th>
                  NOMBRE / APELLIDO
                </th>
                <th>
                  ASUNTO
                </th>
                <th>
                  DOCUMENTOS
                </th>
                <th>
                  RECIBIDO
                </th>
                <th>
                  UBICACIÓN ACTUAL
                </th>
                <th>
                  SEGUIMIENTO
                </th>
                <th>
                  ESTADO
                </th>
                <th>
                  ACCIONES
                </th>
              </tr>
            </thead>

            <tbody>
              {pageItems.map(
                item => {
                  const cargo =
                    getRemitenteCargo(
                      item
                    )

                  return (
                    <tr
                      key={
                        item.id
                      }
                    >
                    <td>
                      <b className="exp-id">
                        {formatNroExp(item.nroExp)}
                      </b>
                    </td>

                      <td>
                        {displayDate(
                          item.fechaIngreso ||
                          item.fecha
                        )}
                      </td>

                      <td>
                        <span className="person-cell">
                          <span className="small-avatar">
                            {getRemitenteNombre(
                              item
                            )
                              .split(
                                ' '
                              )
                              .map(
                                x =>
                                  x[0]
                              )
                              .slice(
                                0,
                                2
                              )
                              .join(
                                ''
                              )}
                          </span>

                          <span className="table-cell-group">
                            {cell(
                              getRemitenteNombre(
                                item
                              )
                            )}

                            {cargo ? (
                              <small>
                                {cargo}
                              </small>
                            ) : null}
                          </span>
                        </span>
                      </td>

                      <td>
                        <span className="table-cell-group">
                          {cell(
                            item.asunto
                          )}

                          <small>
                            {item.tipo}
                          </small>
                        </span>
                      </td>

                      <td>
                        <DocumentLink
                          item={
                            item
                          }
                        />
                      </td>

                      <td>
                        {cell(
                          item.canalRecepcion ||
                            item.modalidadRecepcion ||
                            'No especificado'
                        )}
                      </td>

                      <td>
                        <span className="table-cell-group">
                          {cell(
                            getAreaDestino(
                              item
                            )
                          )}

                          <small>
                            Ubicación del trámite
                          </small>
                        </span>
                      </td>

                      <td>
                        {cell(
                          item.documentoSeguimiento ||
                            'Pendiente'
                        )}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            item.estado
                          }
                        />
                      </td>

                      <td className="actions-cell">
                        <button
                          className="tracking-button"
                          onClick={() =>
                            onTracking(
                              item.id
                            )
                          }
                        >
                          ◉ Ver seguimiento
                        </button>

                        {item.estado ===
                        'Pendiente' ? (
                          <>
                            <select
                              className="action-area-select"
                              value={
                                selectedAreaById[
                                  item.id
                                ] ||
                                ''
                              }
                              onChange={event =>
                                setSelectedAreaById(
                                  {
                                    ...selectedAreaById,
                                    [item.id]:
                                      event
                                        .target
                                        .value
                                  }
                                )
                              }
                            >
                              <option value="">
                                Derivar a...
                              </option>

                            {areas.map(
                              area => (
                                <option
                                  key={area}
                                  value={area}
                                >
                                  {area} — {AREA_RESPONSABLES[area]}
                                </option>
                              )
                            )}
                            </select>

                            <button
                              className="action-link"
                              onClick={() =>
                                onDerive(
                                  item.id,
                                  selectedAreaById[
                                    item.id
                                  ] ||
                                    ''
                                )
                              }
                            >
                              Derivar
                            </button>
                          </>
                        ) : item.estado ===
                          'En atención' ? (
                          <button
                            className="action-link"
                            onClick={() =>
                              onComplete(
                                item.id
                              )
                            }
                          >
                            Atender
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                }
              )}
            </tbody>
          </table>

          {items.length ===
            0 && (
            <div className="empty-state">
              No se encontraron expedientes con esos criterios.
            </div>
          )}
        </div>

        <div className="pagination">
          Mostrando{' '}
          <b>
            {items.length
              ? (currentPage -
                  1) *
                  pageSize +
                1
              : 0}
            -
            {Math.min(
              currentPage *
                pageSize,
              items.length
            )}
          </b>{' '}
          de{' '}
          <b>
            {items.length}
          </b>{' '}
          expedientes

          <button
            disabled={
              currentPage === 1
            }
            onClick={() =>
              setPage(
                currentPage -
                  1
              )
            }
          >
            ‹
          </button>

          <b className="current-page">
            {currentPage}
          </b>

          <button
            disabled={
              currentPage ===
              pageCount
            }
            onClick={() =>
              setPage(
                currentPage +
                  1
              )
            }
          >
            ›
          </button>
        </div>
      </section>
    </>
  )
}

function TrackingModal({
  item,
  onClose
}: {
  item?: Expediente
  onClose: () => void
}) {
  if (!item) return null

  const history = [
    ...(item.historial ||
      createInitialHistory(
        item
      ))
  ].reverse()

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="tracking-modal"
        role="dialog"
        aria-modal="true"
        onClick={event =>
          event.stopPropagation()
        }
      >
        <div className="tracking-header">
          <div>
            <p className="eyebrow">
              RUTA SEGUIDA POR EL EXPEDIENTE
            </p>

            <h2>
              {formatNroExp(item.nroExp)}
            </h2>

            <p>
              {item.asunto}
            </p>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar seguimiento"
          >
            ×
          </button>
        </div>

        <div className="tracking-summary">
          <span>
            <b>
              Remitente
            </b>
            {getRemitenteNombre(
              item
            )}
          </span>

          <span>
            <b>
              Estado actual
            </b>
            <StatusBadge
              status={
                item.estado
              }
            />
          </span>

          <span>
            <b>
              Ubicación actual
            </b>
            {getAreaDestino(
              item
            )}
          </span>
        </div>

        {item.archivoData && (
          <div className="tracking-attachment">
            <b>
              Documento adjunto
            </b>

            <DocumentLink
              item={
                item
              }
            />

            {item.archivoDescripcion && (
              <small>
                {
                  item.archivoDescripcion
                }
              </small>
            )}
          </div>
        )}

        <div className="timeline">
          {history.map(
            (
              entry,
              index
            ) => (
              <div
                className="timeline-item"
                key={`${entry.fechaHora}-${index}`}
              >
                <div className="timeline-dot" />

                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <strong>
                      {
                        entry.accion
                      }
                    </strong>

                    <time>
                      {
                        entry.fechaHora
                      }
                    </time>
                  </div>

                  <p>
                    <b>
                      {
                        entry.areaOrigen
                      }
                    </b>

                    <span>
                      {' '}
                      →{' '}
                    </span>

                    <b>
                      {
                        entry.areaDestino
                      }
                    </b>
                  </p>

                 {entry.responsableDestino && (
                    <small className="timeline-responsible">
                      Responsable del área:{' '}
                      {entry.responsableDestino}
                    </small>
                  )}
                  
                  <small>
                    Realizado por:{' '}
                    {entry.responsable ||
                      'No registrado'}
                  </small>
                  
                  <small>
                    {entry.observacion}
                  </small>
                </div>
              </div>
            )
          )}
        </div>

        <button
          className="outline-button tracking-close"
          onClick={
            onClose
          }
        >
          Ocultar detalle
        </button>
      </section>
    </div>
  )
}

function NewExpediente({
  onSubmit,
  onCancel,
  isSaving
}: {
  onSubmit: (
    event: FormEvent<HTMLFormElement>
  ) => void
  onCancel: () => void
  isSaving: boolean
}) {
const [
  selectedFileName,
  setSelectedFileName
] = useState('')

const [
  showExtraFields,
  setShowExtraFields
] = useState(false)

  return (
    <div className="legacy-form-page">
      <form
        className="form-layout"
        onSubmit={onSubmit}
      >
        {isSaving && (
          <div className="saving-notice">
            Guardando archivo y expediente en Supabase...
          </div>
        )}

        <div className="legacy-title">
          ▣ Registro de Expediente MPV
        </div>

        <section className="panel form-panel">
  <div className="panel-header">
    <div>
      <h2>
        Datos del trámite
      </h2>

      <p>
        Complete los datos solicitados para registrar el expediente.
      </p>
    </div>
  </div>

  <div className="form-grid">
    <label>
      Fecha de ingreso
      <input
        name="fechaIngreso"
        type="date"
        required
        defaultValue={
          todayInputValue()
        }
      />
    </label>

    <label>
      Trámite
      <select
        name="tipo"
        required
      >
        <option value="">
          Seleccione el tipo
        </option>

        <option>
          Solicitud
        </option>

        <option>
          Oficio
        </option>

        <option>
          Memorando
        </option>

        <option>
          Informe
        </option>

        <option>
          Carta
        </option>

        <option>
          Resolución
        </option>
      </select>
    </label>

    <label className="wide">
      Nombre / apellido o razón social
      <input
        name="remitente"
        required
        placeholder="Ingrese el nombre completo o razón social."
      />
    </label>

    <label>
      Cargo del remitente
      <input
        name="cargoRemitente"
        placeholder="Cargo o función del remitente"
      />
    </label>

    <label className="wide">
      Asunto de la solicitud
      <input
        name="asunto"
        required
        placeholder="Registre en forma clara el asunto por el cual ingresa el documento."
      />
    </label>

    <label className="wide">
      Documentos
      <input
        name="documentos"
        required
        placeholder="Ej. Oficio Múltiple N.° 00129-2025-MINEDU/..."
      />
    </label>
  </div>
</section>


{/* BOTÓN CAMPOS EXTRA */}
<div className="extra-fields-toggle">
  <button
    type="button"
    className="extra-fields-button"
    onClick={() =>
      setShowExtraFields(
        !showExtraFields
      )
    }
  >
    {showExtraFields
      ? '− Ocultar campos extra'
      : '＋ Mostrar campos extra'}
  </button>
</div>


{/* CAMPOS EXTRA */}
{showExtraFields && (
  <section className="panel form-panel">
    <div className="section-strip">
      ▣ Datos del administrado
    </div>

    <div className="form-grid">

      <label>
        Tipo de documento
        <select
          name="tipoDocumento"
        >
          <option value="RUC">
            RUC
          </option>

          <option value="DNI">
            DNI
          </option>

          <option value="CE">
            CE
          </option>
        </select>
      </label>


      <label>
        Número de documento

        <div className="inline-field">
          <input
            name="numeroDocumento"
            placeholder="Número de documento"
          />

          <button
            type="button"
            className="legacy-blue-button"
          >
            ⌕ Validar
          </button>
        </div>
      </label>


      {/* REPRESENTANTE */}
      <label>
        Representante (si aplica)
        <input
          name="representante"
          placeholder="Nombre del representante"
        />
      </label>


      {/* CARGO REPRESENTANTE */}
      <label>
        Cargo del representante
        <input
          name="cargoRepresentante"
          placeholder="Cargo"
        />
      </label>


      <label className="wide">
        Contenido
        <textarea
          name="contenido"
          placeholder="Ingrese el detalle de la solicitud"
          rows={3}
        />
      </label>


      <label className="wide">
        Dirección
        <input
          name="direccion"
          placeholder="Ingrese la Dirección"
        />
      </label>


      <label>
        Correo electrónico
        <input
          name="correo"
          type="email"
          placeholder="Correo electrónico"
        />
      </label>


      <label>
        Celular
        <input
          name="celular"
          placeholder="Teléfono de contacto"
        />
      </label>


      <label>
        Folios
        <input
          name="folios"
          type="number"
          min="1"
          required
          defaultValue="1"
        />
      </label>


      <label>
        Anexos
        <input
          name="anexos"
          type="number"
          min="0"
          required
          defaultValue="0"
        />
      </label>


      <label>
        Prioridad
        <select
          name="prioridad"
          required
        >
          <option value="Normal">
            Normal
          </option>

          <option value="Alta">
            Alta
          </option>
        </select>
      </label>

    </div>
  </section>
)}


{/* RECEPCIÓN Y SEGUIMIENTO — SIEMPRE VISIBLE */}
<section className="panel form-panel">
  <div className="section-strip">
    ▣ Recepción y seguimiento
  </div>

  <div className="form-grid">

    <label>
      Recibido presencial/virtual
      <select
        name="canalRecepcion"
        required
      >
        <option value="">
          Seleccione el canal
        </option>

        <option>
          Físico
        </option>

        <option>
          Plataforma SINAD
        </option>

        <option>
          Virtual
        </option>

        <option>
          Presencial
        </option>
      </select>
    </label>


    <label className="wide">
      Documento seguimiento
      <input
        name="documentoSeguimiento"
        placeholder="Ej. Informe técnico o memorando"
      />
    </label>

  </div>
</section>


{/* ARCHIVOS — SIEMPRE VISIBLE */}
<section className="panel form-panel">
  <div className="section-strip">
    ▣ Archivos a Adjuntar
  </div>

  <div className="form-grid attachment-grid">

<div>
  <label>
    Archivo
  </label>

  <label className="file-button">
    ▣ Seleccionar archivo

    <input
      name="archivo"
      type="file"
      accept=".pdf,.jpg,.jpeg,.png"
      required
      onChange={event =>
        setSelectedFileName(
          event.target.files?.[0]?.name || ''
        )
      }
    />
  </label>

  <small>
    {selectedFileName
      ? `Seleccionado: ${selectedFileName}`
      : 'Máximo 5 MB.'}
  </small>
</div>


    <label>
      Descripción del archivo
      <input
        name="archivoDescripcion"
        placeholder="Descripción del archivo"
      />
    </label>

  </div>
</section>


{/* ACCIONES */}
<div className="form-actions">

  <button
    type="button"
    className="legacy-light-button"
    onClick={
      onCancel
    }
  >
    ‹ Anterior
  </button>


  <button
    type="submit"
    className="legacy-blue-button"
    disabled={isSaving}
  >
    ✓ Enviar
  </button>


  <button
    type="reset"
    className="legacy-blue-button"
    disabled={isSaving}
    onClick={() =>
      setSelectedFileName('')
    }
  >
    ▰ Limpiar
  </button>

</div>

</form>
</div>
}
function Reports({
  expedientes,
  notify
}: {
  expedientes: Expediente[]
  notify: (
    message: string
  ) => void
}) {
