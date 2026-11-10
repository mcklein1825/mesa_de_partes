  import {
    lazy,
    Suspense,
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
    FormEvent
  } from 'react'
  import { supabase } from './lib/supabaseClient'
  import { fetchHistorialExpediente } from './services/expedientesService'
  import useMesaPartesData from './features/mesaPartes/useMesaPartesData'
  import LoginView from './components/views/LoginView'
  import OficiosView from './components/views/OficiosView'
  import ProveidosView from './components/views/ProveidosView'
  import NuevoOficioView from './components/views/NuevoOficioView'
  import NuevoProveidoView from './components/views/NuevoProveidoView'

  import {
    House,
    Files,
    FileText,
    Send,
    ClipboardList,
    ChartNoAxesCombined,
    Layers3
  } from 'lucide-react'

// Tipos y Constantes
  import { User, View, Expediente, Memo, Oficio, Proveido, Status } from './types'
  import { ROLE_PERMISSIONS, areas, getAreaResponsable } from './constants'

  // Utilidades
  import {
    normalizeExpediente, formatDate, todayInputValue, addDays,
    readFileAsDataUrl, getAreaDestino, getRemitenteNombre, getDeadlineState,
    getSupportedDocumentMimeType, formatNroExp
  } from './utils/expedienteHelpers'
  import { formatDocumentNumber } from './utils/documentHelpers'
  import { analyzeExpedienteRisk } from './utils/expedienteRiskModel'

  import DashboardView from './components/views/DashboardView'
  import ExpedientesView from './components/views/ExpedientesView'
  import MemosView from './components/views/MemosView'
  import MemorandosMultiplesView from './components/views/MemorandosMultiplesView'
  import NewExpedienteView from './components/views/NewExpedienteView'
  const ReportsView = lazy(() => import('./components/views/ReportsView'))

  // Componentes Comunes y Modales
  import NavItem from './components/common/NavItem'
  import Logo from './components/common/Logo'
  import TrackingModal from './components/modals/TrackingModal'
  export default function App() {

    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [view, setView] = useState<View>('inicio')
    const [expedienteParaDuplicar, setExpedienteParaDuplicar] =
    useState<Expediente | null>(null)
    const [showNewExpedienteForm, setShowNewExpedienteForm] = useState(false)
    const expedientesPageSize = 50
    const [memoExpediente, setMemoExpediente] = useState<Expediente | null>(null)
    const [oficioExpediente, setOficioExpediente] = useState<Expediente | null>(null)

    const [query, setQuery] = useState('')
    const [areaFilter, setAreaFilter] = useState('Todas')
    const [remitenteFilter, setRemitenteFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('Todos')
    const [managementFilter, setManagementFilter] = useState('Todos')
    const [trackingId, setTrackingId] = useState<string | null>(null)
    const [showProfile, setShowProfile] = useState(false)
    const [toast, setToast] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const [showOficioForm, setShowOficioForm] = useState(false)
    const [showOficioSelector, setShowOficioSelector] = useState(false)
    const [showProveidoForm, setShowProveidoForm] = useState(false)
    const [proveidoExpediente, setProveidoExpediente] = useState<Expediente | null>(null)
    const [showProveidoSelector, setShowProveidoSelector] = useState(false)
    const [memoNro, setMemoNro] = useState('')
    const [memoAsunto, setMemoAsunto] = useState('')
    const [memoFecha, setMemoFecha] = useState(todayInputValue())
    const [memoParaDuplicar, setMemoParaDuplicar] = useState<Memo | null>(null)
    const [showMemoForm, setShowMemoForm] = useState(false)
    const [showMemoSelector, setShowMemoSelector] = useState(false)
    const [memoAreaDestino, setMemoAreaDestino] = useState('')
    const [memoResponsable, setMemoResponsable] = useState('')
    useEffect(() => {
    if (!memoAreaDestino) {
      setMemoResponsable('')
      return
    }

    setMemoResponsable(getAreaResponsable(memoAreaDestino))
  }, [memoAreaDestino])

    const notify = useCallback((message: string) => {
      setToast(message)
      window.setTimeout(() => setToast(''), 3000)
    }, [])
    const {
      expedientes,
      setExpedientes,
      expedientesPage,
      setExpedientesPage,
      memos,
      setMemos,
      oficios,
      setOficios,
      proveidos,
      setProveidos,
      memorandosMultiples,
      setMemorandosMultiples,
      expedienteDocumentos,
      loadingDb
    } = useMesaPartesData(currentUser, notify)

    const sessionTimeoutRef = useRef<number | null>(null)
    const resetSessionTimeout = useCallback(() => {
      if (sessionTimeoutRef.current) window.clearTimeout(sessionTimeoutRef.current)
      sessionTimeoutRef.current = window.setTimeout(() => {
        notify('Sesión expirada por inactividad')
        void supabase.auth.signOut().then(() => setCurrentUser(null))
      }, 30 * 60 * 1000)
    }, [notify])

    useEffect(() => {
      if (!currentUser) return
      resetSessionTimeout()
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
      events.forEach(event => window.addEventListener(event, resetSessionTimeout))
      return () => {
        if (sessionTimeoutRef.current) window.clearTimeout(sessionTimeoutRef.current)
        events.forEach(event => window.removeEventListener(event, resetSessionTimeout))
      }
    }, [currentUser, resetSessionTimeout])

    const userPermissions = currentUser ? ROLE_PERMISSIONS[currentUser.rol] : null
    const canRegister = userPermissions?.puedeRegistrar === true
    const canDerive = userPermissions?.puedeDerivar === true
    const canAttend = userPermissions?.puedeAtender === true
    const canArchive = userPermissions?.puedeArchivar === true
    const canEdit = userPermissions?.puedeEditar === true
    const canSeeReports = userPermissions?.puedeVerReportes === true

    const visibleExpedientes = useMemo(() => {
      if (userPermissions?.puedeVerTodos !== false) return expedientes

      const areaActual = currentUser?.area
        ?.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()

      if (!areaActual) return []

      return expedientes.filter(item => {
        const areasDelExpediente = [
          getAreaDestino(item),
          item.area,
          item.entregadoA
        ]

        return areasDelExpediente.some(area =>
          String(area || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase() === areaActual
        )
      })
    }, [currentUser?.area, expedientes, userPermissions?.puedeVerTodos])

    const visibleExpedienteIds = useMemo(
      () => new Set(visibleExpedientes.map(item => String(item.id))),
      [visibleExpedientes]
    )
    const visibleMemos = useMemo(
      () => memos.filter(item => visibleExpedienteIds.has(String(item.expedienteId))),
      [memos, visibleExpedienteIds]
    )
    const visibleOficios = useMemo(
      () => oficios.filter(item => visibleExpedienteIds.has(String(item.expedienteId))),
      [oficios, visibleExpedienteIds]
    )
    const visibleProveidos = useMemo(
      () => proveidos.filter(item => visibleExpedienteIds.has(String(item.expedienteId))),
      [proveidos, visibleExpedienteIds]
    )
    const visibleExpedienteDocumentos = useMemo(
      () =>
        expedienteDocumentos.filter(item =>
          visibleExpedienteIds.has(String(item.expedienteId))
        ),
      [expedienteDocumentos, visibleExpedienteIds]
    )

    const areaOptions = useMemo(() => {
      // 1. Función para quitar tildes, mayúsculas y espacios (unifica "Secretaría" y "Secretaria")
      const normalize = (str: string) =>
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim()

      // 2. Lista negra (basura a ocultar)
      const blacklist = [
        'NEGRON', 'PEÑALOZA', 'CORREO', 'DRELM', 'JEFATURA',
        'LAS TIENE EL DIRECTOR', 'PENDIENTE DE ASIGNACIÓN',
        'SE LE ENTREGÓ', 'OFICIO', 'FALTA DERIVAR',
        'ENTREGADO A', 'ARCHIVO', 'COORDINADOR', 'FIRMO CARGO'
      ]

      // 3. Correcciones (unificar nombres)
      const replacements: Record<string, string> = {
        'SECRETARIA ACADEMICA': 'Secretaría Académica',
        'UNIDAD DE BIENESTAR AL ESTUDIANTE': 'Unidad de Bienestar Estudiantil',
        'UNIDAD DE BIENESTAR DEL ESTUDIANTE': 'Unidad de Bienestar Estudiantil',
        'DIRECCION': 'Dirección General',
        'ADMINISTRACION': 'Administración'
      }

      // 4. Juntar áreas oficiales + áreas de la BD
      const rawAreas = [...areas, ...visibleExpedientes.map(getAreaDestino).filter(Boolean)]

      // 5. Procesar
      const cleaned = rawAreas
        .map(a => a.trim())
        .filter(a => {
          const norm = normalize(a)
          return !blacklist.some(badWord => norm.includes(badWord))
        })
        .map(a => {
          const norm = normalize(a)
          for (const [key, val] of Object.entries(replacements)) {
            if (norm === key) return val
          }
          return a
        })
        .filter((value, index, self) =>
          self.findIndex(v => normalize(v) === normalize(value)) === index
        )

      return cleaned.sort()
    }, [visibleExpedientes])

    const currentDate = useMemo(() => {
      const now = new Date()
      return now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
    }, [])

    const expedienteRiskAnalysis = useMemo(
      () =>
        analyzeExpedienteRisk(
          visibleExpedientes,
          visibleExpedienteDocumentos
        ),
      [visibleExpedientes, visibleExpedienteDocumentos]
    )

    const filteredExpedientes = useMemo(() => {
    const normalizeSearch = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()

    const termino = normalizeSearch(query)

    return visibleExpedientes.filter(item => {
      const expedienteId = String(item.id)
      const nroExpediente = String(item.nroExp || '')
      const nroExpedienteFormateado = formatNroExp(
        nroExpediente,
        false,
        item.fechaIngreso
      )
      const documentosRelacionados = [
        ...visibleMemos
          .filter(memo => String(memo.expedienteId) === expedienteId)
          .flatMap(memo => [
            formatDocumentNumber(memo.nroMemo, memo.createdAt),
            memo.realizadoPor,
            memo.responsable,
            memo.asunto,
            memo.archivo
          ]),
        ...visibleProveidos
          .filter(proveido => String(proveido.expedienteId) === expedienteId)
          .flatMap(proveido => [
            formatDocumentNumber(proveido.id, proveido.createdAt),
            proveido.nroExpediente,
            proveido.realizadoPor,
            proveido.responsable,
            proveido.instruccion,
            proveido.archivo
          ]),
        ...visibleOficios
          .filter(oficio => String(oficio.expedienteId) === expedienteId)
          .flatMap(oficio => [
            formatDocumentNumber(oficio.nRegistro, oficio.createdAt),
            oficio.realizadoPor,
            oficio.responsable,
            oficio.destinatario,
            oficio.asuntoTipo,
            oficio.asuntoDetalle
          ])
      ]

      const searchableValues = [
        nroExpediente,
        nroExpedienteFormateado,
        item.asunto,
        getRemitenteNombre(item),
        getAreaDestino(item),
        item.area,
        item.entregadoA,
        item.documentos,
        item.archivo,
        item.usuarioRegistro,
        item.canalRecepcion,
        ...documentosRelacionados
      ]
      const matchesQuery =
        !termino ||
        searchableValues.some(value =>
          normalizeSearch(String(value || '')).includes(termino)
        )

      const matchesArea =
        areaFilter === 'Todas' ||
        normalizeSearch(getAreaDestino(item)) === normalizeSearch(areaFilter)

      const matchesRemitente =
        normalizeSearch(getRemitenteNombre(item)).includes(
          normalizeSearch(remitenteFilter)
        )

      const matchesStatus =
        statusFilter === 'Todos' ||
        (statusFilter === 'Vencidos' &&
          item.requiereGestion &&
          getDeadlineState(item).kind === 'vencido') ||
        (statusFilter === 'Por vencer' &&
          item.requiereGestion &&
          getDeadlineState(item).kind === 'por_vencer') ||
        (statusFilter === 'Pendiente' &&
          item.requiereGestion &&
          item.estado === statusFilter) ||
        (!['Todos', 'Vencidos', 'Por vencer', 'Pendiente'].includes(statusFilter) &&
          item.estado === statusFilter)

      const matchesManagement =
        managementFilter === 'Todos' ||
        (managementFilter === 'gestion' && item.requiereGestion) ||
        (managementFilter === 'registro' && !item.requiereGestion)

      return (
        matchesQuery &&
        matchesArea &&
        matchesRemitente &&
        matchesStatus &&
        matchesManagement
      )
    })
  }, [
    visibleExpedientes,
    visibleMemos,
    visibleOficios,
    visibleProveidos,
    query,
    areaFilter,
    remitenteFilter,
    statusFilter,
    managementFilter
  ])
  useEffect(() => {
    setExpedientesPage(1)
  }, [query, areaFilter, remitenteFilter, statusFilter, managementFilter])

    const addExpediente = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!currentUser || !userPermissions?.puedeRegistrar) {
        notify('No tiene permisos para registrar expedientes')
        return
      }
      const form = event.currentTarget
      const data = new FormData(form)
      const selectedFile = data.get('archivo')

  const archivoSeleccionado =
    selectedFile instanceof File && selectedFile.size > 0
      ? selectedFile
      : null

  const duplicadoDesdeId = String(
    data.get('duplicadoDesdeId') || ''
  ).trim()

  const esDuplicado =
    String(data.get('esDuplicado') || '').toLowerCase() === 'true'
  const requiereGestion = data.get('requiereGestion') === 'true'

  if (
    archivoSeleccionado &&
    archivoSeleccionado.size > 5 * 1024 * 1024
  ) {
    notify('El archivo supera el límite de 5 MB')
    return
  }

  let fileData = ''

  try {
    setIsSaving(true)

    if (archivoSeleccionado) {
      fileData = await readFileAsDataUrl(archivoSeleccionado)
    }
  } catch (error) {
    notify(
      error instanceof Error
        ? error.message
        : 'No se pudo leer el archivo seleccionado'
    )

    setIsSaving(false)
    return
  }
      const expedienteOriginal =
    esDuplicado && duplicadoDesdeId
      ? expedientes.find(
          item => item.id === duplicadoDesdeId
        )
      : null

  if (esDuplicado && !expedienteOriginal) {
    notify('No se encontró el expediente original para duplicar')
    setIsSaving(false)
    return
  }



  const fechaIngreso = String(
    data.get('fechaIngreso') || ''
  )

  const fechaFormateada = formatDate(fechaIngreso)

  const remitente = String(
    data.get('remitente') || ''
  ).trim()



  const fechaHoraRegistro = new Date().toISOString()
  const canalRecepcion = String(data.get('canalRecepcion') || 'Mesa de Partes')


      const newExpediente: Expediente = {
        id: '',
        nroExp: '',
        esDuplicado,
        requiereGestion,
        fechaIngreso: fechaFormateada,
        remitente,
        remitenteNombre: remitente,
        representante: String(data.get('representante') || ''),
        cargoRepresentante: String(data.get('cargoRepresentante') || ''),
        asunto: String(data.get('asunto') || ''),
        contenido: String(data.get('contenido') || ''), area: '', areaDestino: '', estado: 'Pendiente',
        plazo: String(data.get('plazo') || ''),
        prioridad: String(data.get('prioridad') || 'Normal') as 'Normal' | 'Alta',
        archivo: archivoSeleccionado
          ? archivoSeleccionado.name
          : 'Sin adjunto',

        archivoData: fileData,

        archivoTipo: archivoSeleccionado
          ? archivoSeleccionado.type
          : '',

        archivoTamano: archivoSeleccionado
          ? archivoSeleccionado.size
          : 0,
        documentos: String(data.get('documentos') || ''),
        modalidadRecepcion: String(data.get('canalRecepcion') || ''), entregadoA: '',
        canalRecepcion: String(data.get('canalRecepcion') || ''),
        folios: Number(data.get('folios') || 1), anexos: Number(data.get('anexos') || 0),
        direccion: String(data.get('direccion') || ''), correo: String(data.get('correo') || ''),
        celular: String(data.get('celular') || ''),
        usuarioRegistro: `${currentUser.nombre} - ${currentUser.area || ''}`,

        constanciaRecepcion: '',
        historial: []
      }

      // 1. Armamos el JSON con los datos para la nueva RPC
      const payloadDatos = {
        fecha_ingreso: fechaIngreso,
        remitente_nombre: newExpediente.remitenteNombre,
        asunto: newExpediente.asunto,
        contenido: newExpediente.contenido,
        plazo: newExpediente.plazo || null,
        prioridad: newExpediente.prioridad,
        archivo: newExpediente.archivo,
        archivo_data: newExpediente.archivoData,
        archivo_tipo: newExpediente.archivoTipo,
        archivo_tamano: newExpediente.archivoTamano,
        documentos: newExpediente.documentos,
        modalidad_recepcion: newExpediente.modalidadRecepcion,
        canal_recepcion: newExpediente.canalRecepcion,
        folios: newExpediente.folios,
        anexos: newExpediente.anexos,
        direccion: newExpediente.direccion,
        correo: newExpediente.correo,
        celular: newExpediente.celular,
        representante: newExpediente.representante,
        cargo_representante: newExpediente.cargoRepresentante,
        es_duplicado: esDuplicado,
        duplicado_de_id: esDuplicado ? Number(duplicadoDesdeId) : null,
        requiere_gestion: requiereGestion
      }

      // 2. Llamamos a la RPC segura
      const { data: insertedData, error } = await supabase.rpc(
        'registrar_expediente',
        { p_datos: payloadDatos }
      )

      if (error) {
        console.error('Error registrando expediente:', error)
        notify(`No se pudo registrar el expediente: ${error.message}`)
        setIsSaving(false)
        return
      }

      if (!insertedData || typeof insertedData !== 'object') {
        notify('La base de datos no devolvió el expediente registrado')
        setIsSaving(false)
        return
      }

      const { error: clasificacionError } = await supabase
        .from('mesa_partes_2026')
        .update({ requiere_gestion: requiereGestion })
        .eq('id', insertedData.id)

      if (clasificacionError) {
        console.error(
          'El expediente se registró, pero no se pudo guardar su clasificación:',
          clasificacionError
        )
      }

      setIsSaving(false)

      // 3. Construimos el expediente en memoria con la respuesta de la BD
      const expedienteInsertado = normalizeExpediente({
        ...newExpediente,
        id: String(insertedData.id),
        nroExp: String(insertedData.nro_exp),
        requiereGestion:
          clasificacionError
            ? insertedData.requiere_gestion !== false
            : requiereGestion,
        fechaIngreso: String(insertedData.fecha_ingreso || fechaIngreso),
        remitente: String(insertedData.remitente_nombre || ''),
        remitenteNombre: String(insertedData.remitente_nombre || ''),
        asunto: String(insertedData.asunto || ''),
        contenido: String(insertedData.contenido || ''),
        area: String(insertedData.area || ''),
        areaDestino: String(insertedData.area_destino || ''),
        estado: insertedData.estado || 'Pendiente',
        plazo: String(insertedData.plazo || ''),
        prioridad: insertedData.prioridad || 'Normal',
        archivo: String(insertedData.archivo || 'Sin adjunto'),
        archivoData: String(insertedData.archivo_data || ''),
        archivoTipo: String(insertedData.archivo_tipo || ''),
        archivoTamano: Number(insertedData.archivo_tamano || 0),
        documentos: String(insertedData.documentos || ''),
        modalidadRecepcion: String(insertedData.modalidad_recepcion || ''),
        entregadoA: String(insertedData.entregado_a || ''),
        canalRecepcion: String(insertedData.canal_recepcion || ''),
        folios: Number(insertedData.folios ?? 1),
        anexos: Number(insertedData.anexos ?? 0),
        direccion: String(insertedData.direccion || ''),
        correo: String(insertedData.correo || ''),
        celular: String(insertedData.celular || ''),
        representante: String(insertedData.representante || ''),
        cargoRepresentante: String(insertedData.cargo_representante || ''),
        usuarioRegistro: String(insertedData.usuario_registro || ''),
        fechaHoraRecepcion: String(insertedData.fecha_hora_recepcion || ''),
        constanciaRecepcion: String(insertedData.constancia_recepcion || ''),
        esDuplicado: Boolean(insertedData.es_duplicado),
        historial: Array.isArray(insertedData.historial) ? insertedData.historial : []
      })

  setExpedientes(prev => [
    expedienteInsertado,
    ...prev
  ])

  form.reset()

  // Limpiar el modo duplicado
  setExpedienteParaDuplicar(null)
  setShowNewExpedienteForm(false)

  setView('expedientes')

  notify(
    clasificacionError
      ? `Expediente ${expedienteInsertado.nroExp} registrado, pero su clasificación no se guardó. Verifique la migración y los permisos de Supabase.`
      : `Expediente ${expedienteInsertado.nroExp} registrado correctamente`
  )
    }
    const adjuntarDocumento = async (
    expedienteId: string,
    file: File
  ) => {
    if (!currentUser) {
      notify('No hay un usuario activo')
      return
    }

    if (!userPermissions?.puedeRegistrar) {
      notify('No tiene permisos para adjuntar documentos')
      return
    }

    if (!visibleExpedienteIds.has(String(expedienteId))) {
      notify('No tiene acceso a este expediente')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      notify('El archivo supera el límite de 5 MB')
      return
    }

    const tiposPermitidos = [
      'application/pdf',
      'image/jpeg',
      'image/png'
    ]

    const extensionValida =
      /\.(pdf|jpg|jpeg|png)$/i.test(file.name)

    if (
      file.type &&
      !tiposPermitidos.includes(file.type) &&
      !extensionValida
    ) {
      notify('Solo se permiten archivos PDF, JPG, JPEG o PNG')
      return
    }

    try {
      setIsSaving(true)

      const archivoData = await readFileAsDataUrl(file)

      const { data, error } = await supabase.rpc(
        'adjuntar_documento_expediente',
        {
          p_expediente_id: Number(expedienteId),
          p_archivo: file.name,
          p_archivo_data: archivoData,
          p_archivo_tipo: file.type || 'application/octet-stream',
          p_archivo_tamano: file.size
        }
      )

      if (error) {
        console.error('Error adjuntando documento:', error)
        notify(`No se pudo adjuntar el documento: ${error.message}`)
        return
      }

      const expedienteActualizado = data?.expediente

      if (!expedienteActualizado) {
        notify('La base de datos no devolvió el expediente actualizado')
        return
      }

      setExpedientes(prev =>
        prev.map(item =>
          item.id === String(expedienteActualizado.id)
            ? {
                ...item,
                archivo: expedienteActualizado.archivo,
                archivoData: expedienteActualizado.archivo_data,
                archivoTipo: expedienteActualizado.archivo_tipo,
                archivoTamano: Number(expedienteActualizado.archivo_tamano || 0),
                historial: Array.isArray(expedienteActualizado.historial)
                  ? expedienteActualizado.historial
                  : item.historial
              }
            : item
        )
      )

      notify(`Documento "${file.name}" adjuntado correctamente`)

    } catch (error) {
      console.error('Error inesperado al adjuntar documento:', error)
      notify('Ocurrió un error al adjuntar el documento')
    } finally {
      setIsSaving(false)
    }
  }
    const registrarFechaExpediente = async (
  expedienteId: string,
  fecha: string
) => {
  if (!currentUser) {
    notify('No hay un usuario activo')
    return
  }

  if (!userPermissions?.puedeEditar) {
    notify('No tiene permisos para modificar la fecha del expediente')
    return
  }

  if (!visibleExpedienteIds.has(String(expedienteId))) {
    notify('No tiene acceso a este expediente')
    return
  }

  if (!fecha) {
    notify('Seleccione una fecha')
    return
  }

  const idNumerico = Number(expedienteId)

  if (!Number.isSafeInteger(idNumerico) || idNumerico <= 0) {
    notify('El ID del expediente no es válido')
    return
  }

  try {
    setIsSaving(true)

    const { data, error } = await supabase.rpc(
      'registrar_fecha_expediente',
      {
        p_expediente_id: idNumerico,
        p_fecha: fecha
      }
    )

    if (error) {
      console.error(
        'Error registrando fecha del expediente:',
        error
      )

      notify(
        `No se pudo registrar la fecha: ${error.message}`
      )

      return
    }

    if (!data) {
      notify('La base de datos no devolvió los datos actualizados')
      return
    }

    setExpedientes(prev =>
      prev.map(item =>
        item.id === String(data.id)
          ? {
              ...item,
              fechaIngreso: String(data.fecha_ingreso || fecha),
              historial: Array.isArray(data.historial)
                ? data.historial
                : item.historial
            }
          : item
      )
    )

    notify('Fecha registrada correctamente')
  } catch (error) {
    console.error(
      'Error inesperado registrando fecha:',
      error
    )

    notify('Ocurrió un error al registrar la fecha')
  } finally {
    setIsSaving(false)
  }
}
    const openDocumentType = (id: string, tipo: string) => {
     if (!userPermissions?.puedeDerivar) {
     notify('No tiene permisos para emitir documentos desde expedientes')
     return
     }

    const expediente = visibleExpedientes.find(item => item.id === id)

    if (!expediente) {
      notify('Expediente no encontrado')
      return
    }

    if (tipo === 'Memo') {
      setMemoParaDuplicar(null)
      setMemoExpediente(expediente)
      setMemoNro('')
      setMemoFecha(todayInputValue())
      setMemoAsunto(expediente.asunto || '')
      setMemoAreaDestino('')
      setShowMemoSelector(false)
      setShowMemoForm(true)
      setView('memos')
      return
    }

    if (tipo === 'Oficio') {
      setOficioExpediente(expediente)
      setShowOficioForm(true)
      setView('oficios')
      return
    }

    notify('Tipo de documento no disponible')
  }

  const openNewMemo = () => {
    if (!userPermissions?.puedeDerivar) {
      notify('No tiene permisos para registrar Memos')
      return
    }

    setMemoNro('')
    setMemoFecha(todayInputValue())
    setMemoAsunto('')
    setMemoAreaDestino('')
    setMemoParaDuplicar(null)
    setMemoExpediente(null)
    setShowMemoSelector(true)
    setShowMemoForm(false)
  }

  const openDuplicateMemo = (memo: Memo) => {
    if (!userPermissions?.puedeDerivar) {
      notify('No tiene permisos para duplicar Memos')
      return
    }

    setMemoParaDuplicar(memo)
    setMemoNro('')
    setMemoFecha(todayInputValue())
    setMemoAsunto(memo.asunto)
    setMemoAreaDestino(memo.areaDestino)
    setMemoExpediente(null)
    setShowMemoSelector(true)
    setShowMemoForm(false)
  }

  const cancelNewMemo = () => {
    setShowMemoForm(false)
    setMemoParaDuplicar(null)
    setMemoExpediente(null)
  }

    const saveNewMemo = async (archivo: File | null) => {
    if (!currentUser || !userPermissions?.puedeDerivar) {
      notify('No tiene permisos para registrar Memos')
      return
    }

    if (!memoExpediente) {
      notify('No se seleccionó ningún expediente')
      return
    }

    if (!visibleExpedienteIds.has(String(memoExpediente.id))) {
      notify('No tiene acceso al expediente seleccionado')
      return
    }

    if (!memoFecha) {
      notify('Ingrese la fecha del Memo')
      return
    }

    if (!memoAreaDestino.trim()) {
      notify('Seleccione el área destino')
      return
    }
    if (!archivo && !memoParaDuplicar?.archivoData) {
    notify('Seleccione el archivo del Memo')
    return
    }

    if (archivo && archivo.size > 5 * 1024 * 1024) {
      notify('El archivo no puede superar los 5 MB')
      return
    }
    if (archivo && !getSupportedDocumentMimeType(archivo)) {
      notify('Adjunte un archivo PDF, JPG, JPEG o PNG')
      return
    }
    if (
      !archivo &&
      (memoParaDuplicar?.archivoTamano || 0) > 5 * 1024 * 1024
    ) {
      notify('El archivo original supera los 5 MB; seleccione un archivo válido')
      return
    }
      const expedienteId = Number(memoExpediente.id)

    if (Number.isNaN(expedienteId)) {
      notify('El ID del expediente no es válido')
      return
    }

    setIsSaving(true)

    try {
      const nroExpediente = formatNroExp(
        memoExpediente.nroExp,
        false,
        memoExpediente.fechaIngreso
      )

      const archivoData = archivo
        ? await readFileAsDataUrl(archivo)
        : memoParaDuplicar?.archivoData || ''

      const { data, error } = await supabase.rpc('registrar_memo', {
      p_expediente_id: expedienteId,
      p_nro_expediente: nroExpediente,
      p_fecha: memoFecha,
      p_asunto: memoAsunto.trim(),
      p_registrado_por: currentUser?.nombre || '',
      p_area_destino: memoAreaDestino.trim(),
      p_responsable: memoResponsable.trim(),
      p_archivo: archivo?.name || memoParaDuplicar?.archivo || '',
      p_archivo_data: archivoData,
      p_archivo_tipo: archivo?.type || memoParaDuplicar?.archivoTipo || '',
      p_archivo_tamano: archivo?.size ?? memoParaDuplicar?.archivoTamano ?? 0
    })

      if (error) {
        console.error('Error guardando Memo:', error)
        notify(`No se pudo guardar el Memo: ${error.message}`)
        return
      }

      if (!data) {
        notify('La base de datos no devolvió el Memo registrado')
        return
      }

      const memoNuevo: Memo = {
        id: String(data.id),
        nroMemo: String(data.nro_memo || ''),
        expedienteId: String(data.expediente_id),
        nroExpediente: String(data.nro_expediente || ''),
        fecha: String(data.fecha || ''),
        asunto: String(data.asunto || ''),
        registradoPor: String(data.registrado_por || ''),
        realizadoPor: String(data.registrado_por || ''),
        areaDestino: String(data.area_destino || ''),
        responsable: String(data.responsable || ''),
        estado: data.estado || 'Pendiente',
        archivo: String(data.archivo || ''),
        archivoData: String(data.archivo_data || ''),
        archivoTipo: String(data.archivo_tipo || ''),
        archivoTamano: Number(data.archivo_tamano || 0),
        createdAt: data.created_at
      }

      setMemos(prev => [memoNuevo, ...prev])

      const expedienteActualizado = data.expediente

      if (expedienteActualizado) {
        setExpedientes(prev =>
          prev.map(item =>
            item.id === String(expedienteActualizado.id)
              ? {
                  ...item,
                  area: expedienteActualizado.area || '',
                  areaDestino: expedienteActualizado.area_destino || '',
                  entregadoA: expedienteActualizado.entregado_a || '',
                  historial: Array.isArray(expedienteActualizado.historial)
                    ? expedienteActualizado.historial
                    : item.historial
                }
              : item
          )
        )
      }

      setMemoNro('')
      setMemoFecha(todayInputValue())
      setMemoAsunto('')
      setMemoAreaDestino('')
      setMemoParaDuplicar(null)
      setShowMemoForm(false)
      notify(
        `Memo ${formatDocumentNumber(memoNuevo.nroMemo, memoNuevo.createdAt)} registrado correctamente`
      )

    } catch (error) {
      console.error('Error inesperado guardando Memo:', error)
      notify('Ocurrió un error al guardar el Memo')
    } finally {
      setIsSaving(false)
    }
  }
  const updateMemoEstado = async (
    memoId: string,
    nuevoEstado: Memo['estado'],
    motivo?: string
  ) => {
    if (!currentUser || !userPermissions?.puedeAtender) {
      notify('No tiene permisos para actualizar el estado del Memo')
      return
    }

    if (!visibleMemos.some(memo => memo.id === memoId)) {
      notify('No tiene acceso a este Memo')
      return
    }

    if (nuevoEstado === 'Archivado' && !userPermissions.puedeArchivar) {
      notify('No tiene permisos para archivar documentos')
      return
    }

    try {
      const { data, error } = await supabase.rpc('cambiar_estado_expediente', {
        p_memo_id: Number(memoId),
        p_nuevo_estado: nuevoEstado,
        p_motivo: motivo || null
      })

      if (error) {
        console.error('Error actualizando estado:', error)
        notify(`No se pudo actualizar el estado: ${error.message}`)
        return
      }

      if (!data) {
        notify('La base de datos no devolvió los datos actualizados')
        return
      }

      setMemos(prev =>
        prev.map(item =>
          item.id === memoId
            ? { ...item, estado: nuevoEstado }
            : item
        )
      )

      const expedienteActualizado = data.expediente
      if (expedienteActualizado) {
        setExpedientes(prev =>
          prev.map(item =>
            String(item.id) === String(expedienteActualizado.id)
              ? {
                  ...item,
                  estado: expedienteActualizado.estado,
                  fechaSinRespuesta: expedienteActualizado.fecha_sin_respuesta || '',
                  historial: Array.isArray(expedienteActualizado.historial)
                    ? expedienteActualizado.historial
                    : item.historial
                }
              : item
          )
        )
      }

      notify(`Memo y expediente actualizados a "${nuevoEstado}"`)
    } catch (error) {
      console.error('Error inesperado actualizando estado:', error)
      notify('Ocurrió un error al actualizar el estado del Memo')
    }
  }
    if (!currentUser) return <LoginView onSelectUser={setCurrentUser} />

    return (
      <div className="app-shell portal-shell">
        <aside className="sidebar">
          <div className="brand">
            <Logo />
          </div>
          <div className="menu-label">MENÚ PRINCIPAL</div>
          <nav className="nav-menu">
    <NavItem
      icon={<House size={18} strokeWidth={1.8} />}
      label="Inicio"
      active={view === 'inicio'}
      onClick={() => setView('inicio')}
    />

    <NavItem
      icon={<Files size={18} strokeWidth={1.8} />}
      label="Expedientes"
      active={view === 'expedientes'}
      onClick={() => setView('expedientes')}
      count={visibleExpedientes.filter(item => item.estado === 'Pendiente').length}
    />
    <NavItem
    icon={<ChartNoAxesCombined size={18} strokeWidth={1.8} />}
    label="Memos"
    active={view === 'memos'}
    onClick={() => {
      setMemoExpediente(null)
      setShowMemoForm(false)
      setShowMemoSelector(false)
      setView('memos')
    }}
    count={visibleMemos.length}
  />
    <NavItem
      icon={<Layers3 size={18} strokeWidth={1.8} />}
      label="Memos múltiples"
      active={view === 'memos-multiples'}
      onClick={() => setView('memos-multiples')}
      count={memorandosMultiples.length}
    />
    <NavItem
    icon={<Send size={18} strokeWidth={1.8} />}
    label="Oficios"
    active={view === 'oficios'}
    onClick={() => {
      setView('oficios')
    }}
    count={visibleOficios.length}
  />
      <NavItem
      icon={<ClipboardList size={18} strokeWidth={1.8} />}
      label="Proveídos"
      active={view === 'proveidos'}
      onClick={() => {
        setView('proveidos')
      }}
      count={visibleProveidos.length}
    />
    {canSeeReports && (
    <NavItem
      icon={<ChartNoAxesCombined size={18} strokeWidth={1.8} />}
      label="Reportes"
      active={view === 'reportes'}
      onClick={() => setView('reportes')}
    />
    )}
  </nav>
          <div className="sidebar-footer">
            <div className="secure-note">
              <span>⌁</span>
              <div><b>Supabase</b><small>Datos almacenados en la base de datos</small></div>
            </div>
            <div className="profile-menu">
              <button
                className="user-mini"
                type="button"
                aria-expanded={showProfile}
                aria-haspopup="true"
                onClick={() => setShowProfile(!showProfile)}
              >
                <div className="avatar">{currentUser.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                <div><b>{currentUser.nombre}</b><small>{currentUser.rol === 'MesaPartes' ? 'Gestión documental' : currentUser.rol}</small></div>
                <span>⋮</span>
              </button>
              {showProfile && (
                <div className="profile-popover">
                  <b>{currentUser.nombre}</b>
                  <span>Rol: {currentUser.rol === 'MesaPartes' ? 'Gestión documental' : currentUser.rol}</span>
                  <span>Área: {currentUser.area || 'N/A'}</span>
                  <hr />
                  <button onClick={() => { notify('Configuración disponible en versión completa'); setShowProfile(false) }}>Configuración</button>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut()
                      setCurrentUser(null)
                      setShowProfile(false)
                      notify('Sesión cerrada correctamente')
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="main-content">
          <div className="page">
            {loadingDb ? (
              <div className="empty-state">Cargando expedientes desde Supabase...</div>
            ) : (
              <>
          {view === 'inicio' && (
            <DashboardView
              expedientes={visibleExpedientes}
              proveidos={visibleProveidos}
              canRegister={canRegister}
              onNew={() => {
                if (!canRegister) {
                  notify('No tiene permisos para registrar expedientes')
                  return
                }
                setView('expedientes')
                setShowNewExpedienteForm(true)
              }}
              onViewAll={() => setView('expedientes')}
              onFilterExp={(status) => {
                setStatusFilter(status)
                setExpedientesPage(1)
                setView('expedientes')
              }}
              currentDate={currentDate}
              currentUser={currentUser}
              riskAnalysis={expedienteRiskAnalysis}
            />
          )}
          {view === 'memos-multiples' && (
            <MemorandosMultiplesView
              memorandos={memorandosMultiples}
              canCreate={canRegister}
              onCreated={memo => setMemorandosMultiples(prev => [memo, ...prev])}
              notify={notify}
            />
          )}
           {view === 'expedientes' && (
                  <ExpedientesView
                    items={filteredExpedientes.slice(
                      (expedientesPage - 1) * expedientesPageSize,
                      expedientesPage * expedientesPageSize
                    )}
                    total={filteredExpedientes.length}
                    currentPage={expedientesPage}
                    onPageChange={pagina => setExpedientesPage(pagina)}
                    pageSize={expedientesPageSize}
                    query={query}
                    setQuery={setQuery}
                    areaFilter={areaFilter}
                    areaOptions={areaOptions}
                    setAreaFilter={setAreaFilter}
                    remitenteFilter={remitenteFilter}
                    setRemitenteFilter={setRemitenteFilter}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    managementFilter={managementFilter}
                    setManagementFilter={setManagementFilter}
                    memos={visibleMemos}
                    oficios={visibleOficios}
                    proveidos={visibleProveidos}
                    canRegister={canRegister}
                    canDuplicate={canRegister && userPermissions?.puedeVerTodos === true}
                    canEdit={canEdit}
                    onNew={() => {
                      setExpedienteParaDuplicar(null)
                      setShowNewExpedienteForm(true)
                    }}
                    expedienteDocumentos={visibleExpedienteDocumentos}
                    onTracking={async (id) => {
                      if (!visibleExpedienteIds.has(String(id))) {
                        notify('No tiene acceso a este expediente')
                        return
                      }

                      let historialGuardado: Awaited<ReturnType<typeof fetchHistorialExpediente>> = []

                      try {
                        historialGuardado = await fetchHistorialExpediente(id)
                      } catch (error) {
                        console.error('Error cargando el seguimiento del expediente:', error)
                        notify('No se pudo actualizar el seguimiento; se mostrará el historial disponible')
                      }

                      setExpedientes(prev =>
                        prev.map(expediente => {
                          if (expediente.id !== id) return expediente

                          const historialActual = Array.isArray(historialGuardado)
                            ? historialGuardado
                            : Array.isArray(expediente.historial)
                              ? expediente.historial
                              : []

                          const tieneRegistroInicial = historialActual.some((movimiento: any) => {
                            const accion = String(movimiento?.accion || '').toLowerCase()
                            const observacion = String(movimiento?.observacion || '').toLowerCase()

                            return (
                              accion === 'expediente registrado' ||
                              accion === 'registro inicial' ||
                              accion === 'pendiente' ||
                              observacion.includes('expediente recibido') ||
                              observacion.includes('expediente registrado')
                            )
                          })

                          if (tieneRegistroInicial) {
                            return {
                              ...expediente,
                              historial: historialActual
                            }
                          }

                          const registroInicial = {
                            fechaHora:
                              expediente.fechaHoraRecepcion ||
                              expediente.fechaIngreso ||
                              '',
                            fechaIngreso: expediente.fechaIngreso || '',
                            areaOrigen: currentUser.area || 'Dirección General',
                            areaDestino: 'Dirección General',
                            accion: 'Expediente registrado',
                            observacion: 'Expediente recibido y registrado por Dirección General.',
                            responsable: expediente.usuarioRegistro || 'Responsable no registrado'
                          }

                          return {
                            ...expediente,
                            historial: [registroInicial, ...historialActual]
                          }
                        })
                      )

                      setTrackingId(id)
                    }}

                    onAttachDocument={adjuntarDocumento}
                    onRegisterDate={registrarFechaExpediente}
                    onDuplicate={expediente => {
                      setExpedienteParaDuplicar(expediente)
                      setShowNewExpedienteForm(true)
                    }}
                  />
                )}
          {view === 'memos' && (
              <MemosView
                expediente={memoExpediente}
                memoParaDuplicar={memoParaDuplicar}
                expedientes={visibleExpedientes}
                areaOptions={areaOptions}
                memos={visibleMemos}
                canCreate={canDerive}
                canAtender={canAttend}
                canArchivar={canArchive}
                showMemoSelector={showMemoSelector}
                onUpdateMemoEstado={updateMemoEstado}
                onBack={() => {
        setMemoExpediente(null)
        setShowMemoForm(false)
        setShowMemoSelector(false)
        setView('expedientes')
      }}
      onNewMemo={openNewMemo}
      onDuplicateMemo={openDuplicateMemo}
      onCloseMemoSelector={() => {
        setShowMemoSelector(false)
        setMemoParaDuplicar(null)
      }}
      showMemoForm={showMemoForm}
      memoNro={memoNro}
      setMemoNro={setMemoNro}
      memoFecha={memoFecha}
      setMemoFecha={setMemoFecha}
      memoAsunto={memoAsunto}
      setMemoAsunto={setMemoAsunto}
      secretariaActual={currentUser?.nombre || ''}
      memoAreaDestino={memoAreaDestino}
      setMemoAreaDestino={setMemoAreaDestino}
      memoResponsable={memoResponsable}
      onSaveMemo={saveNewMemo}
      onCancelMemo={cancelNewMemo}
      onSelectExpediente={(expediente) => {
        if (
          expediente &&
          !visibleExpedienteIds.has(String(expediente.id))
        ) {
          notify('No tiene acceso a este expediente')
          return
        }

        setMemoExpediente(expediente)

        if (expediente) {
          setMemoNro('')
          setMemoFecha(todayInputValue())
          setMemoAsunto(
            memoParaDuplicar
              ? memoParaDuplicar.asunto
              : expediente.asunto || ''
          )
          setMemoAreaDestino(
            memoParaDuplicar
              ? memoParaDuplicar.areaDestino
              : ''
          )

          setShowMemoSelector(false)
          setShowMemoForm(true)
        } else {
          setShowMemoSelector(false)
          setShowMemoForm(false)
        }
      }}
    />
  )}
  {view === 'oficios' && !showOficioForm && (
    <OficiosView
      oficios={visibleOficios}
      oficioExpediente={oficioExpediente}
      expedientes={visibleExpedientes}
      areaOptions={areaOptions}
      showSelector={showOficioSelector}
      canCreate={canDerive}
      onCloseSelector={() => setShowOficioSelector(false)}
      onNuevoOficio={() => {
        if (!canDerive) {
          notify('No tiene permisos para registrar Oficios')
          return
        }
        setShowOficioSelector(true)
      }}
      onSelectExpediente={(exp) => {
        if (!visibleExpedienteIds.has(String(exp.id))) {
          notify('No tiene acceso a este expediente')
          return
        }

        setOficioExpediente(exp)
        setShowOficioSelector(false)
        setShowOficioForm(true)
      }}
    />
  )}
  {view === 'oficios' && showOficioForm && (
    <NuevoOficioView
      expediente={oficioExpediente}
      onCancelar={() => {
        setShowOficioForm(false)
        setOficioExpediente(null)
      }}
      onGuardar={async datos => {
        if (!canDerive) {
          notify('No tiene permisos para registrar Oficios')
          return
        }
        if (!visibleExpedienteIds.has(String(datos.expedienteId))) {
          notify('No tiene acceso al expediente seleccionado')
          return
        }

        try {
          const archivoMimeType = datos.archivo
            ? getSupportedDocumentMimeType(datos.archivo)
            : null
          const archivoData = datos.archivo
            ? await readFileAsDataUrl(datos.archivo)
            : null

          const { data, error } = await supabase.rpc('registrar_oficio', {
            p_datos: {
              expediente_id: Number(datos.expedienteId),
              fecha: datos.fecha,
              destinatario: datos.destinatario,
              asunto_tipo: datos.asuntoTipo,
              asunto_detalle: datos.asuntoDetalle,
              responsable: datos.responsable,
              codigo_oad: datos.codigoOad,
              codigo_ogesup: datos.codigoOgesup,
              area_destino: datos.areaDestino,
              archivo: datos.archivo?.name ?? null,
              archivo_data: archivoData,
              archivo_tipo: archivoMimeType,
              archivo_tamano: datos.archivo?.size ?? null
            }
          })

          if (error) {
            console.error('Error guardando Oficio:', error)
            notify(`No se pudo guardar el Oficio: ${error.message}`)
            return
          }

          if (!data || !data.expediente) {
            notify('La base de datos no devolvió el Oficio y expediente actualizados.')
            return
          }

          const oficioNuevo: Oficio = {
            id: String(data.id),
            nRegistro: String(data.n_registro ?? ''),
            expedienteId: String(data.expediente_id),
            nroExpediente: String(data.nro_expediente ?? ''),
            fecha: String(data.fecha ?? ''),
            destinatario: String(data.destinatario ?? ''),
            asuntoTipo: String(data.asunto_tipo ?? ''),
            asuntoDetalle: String(data.asunto_detalle ?? ''),
            realizadoPor: String(data.realizado_por ?? ''),
            responsable: String(data.responsable ?? ''),
            codigoOad: String(data.codigo_oad ?? ''),
            codigoOgesup: String(data.codigo_ogesup ?? ''),
            anio: Number(data.anio),
            areaDestino: String(data.area_destino ?? ''),
            estado: data.estado ?? 'Enviado',
            archivo: String(data.archivo ?? ''),
            archivoData: String(data.archivo_data ?? ''),
            archivoTipo: String(data.archivo_tipo ?? ''),
            archivoTamano: Number(data.archivo_tamano ?? 0),
            fechaRegistro: String(data.fecha_registro ?? ''),
            createdAt: String(data.created_at ?? '')
          }

          setOficios(prev => [oficioNuevo, ...prev])

          setExpedientes(prev =>
            prev.map(item =>
              item.id === String(data.expediente.id)
                ? {
                    ...item,
                    historial: Array.isArray(data.expediente.historial)
                      ? data.expediente.historial
                      : item.historial
                  }
                : item
            )
          )

          setShowOficioForm(false)
          setOficioExpediente(null)
          setView('oficios')

          notify(
            `Oficio ${formatDocumentNumber(oficioNuevo.nRegistro, oficioNuevo.createdAt)} registrado correctamente.`
          )
        } catch (error) {
          console.error('Error inesperado guardando Oficio:', error)
          notify('Ocurrió un error al guardar el Oficio.')
        }
      }}
    />
  )}
  {view === 'proveidos' && !showProveidoForm && (
  <ProveidosView
  proveidos={visibleProveidos}
  expedientes={visibleExpedientes}
  areaOptions={areaOptions}
  showSelector={showProveidoSelector}
  canCreate={canDerive}
  onCloseSelector={() => {
    setShowProveidoSelector(false)
  }}
  onNuevoProveido={() => {
    if (!canDerive) {
      notify('No tiene permisos para registrar Proveídos')
      return
    }
    setShowProveidoSelector(true)
  }}
  onSelectExpediente={expediente => {
    if (!visibleExpedienteIds.has(String(expediente.id))) {
      notify('No tiene acceso a este expediente')
      return
    }

    setProveidoExpediente(expediente)
    setShowProveidoSelector(false)
    setShowProveidoForm(true)
  }}
/>
  )}

  {view === 'proveidos' && showProveidoForm && (
    <NuevoProveidoView
      expediente={proveidoExpediente}
      expedientes={visibleExpedientes}
      areaOptions={areaOptions}
      onExpedienteChange={setProveidoExpediente}
      onCancelar={() => {
        setShowProveidoForm(false)
        setProveidoExpediente(null)
      }}

      onGuardar={async datos => {
        if (!canDerive) {
          notify('No tiene permisos para registrar Proveídos')
          return
        }
        if (!visibleExpedienteIds.has(String(datos.expedienteId))) {
          notify('No tiene acceso al expediente seleccionado')
          return
        }

        let archivoData: string | null = null

        // Leer el archivo antes de guardar el proveído.
        if (datos.archivo) {
          try {
            archivoData = await readFileAsDataUrl(datos.archivo)
          } catch (errorLectura) {
            console.error(
              'Error leyendo el archivo del proveído:',
              errorLectura
            )
            alert('No se pudo leer el archivo seleccionado.')
            return
          }
        }

        // Guardar el proveído y su adjunto en una sola operación.
        const { data, error } = await supabase.rpc(
          'registrar_proveido_con_adjunto',
          {
            p_expediente_id: Number(datos.expedienteId),
            p_nro_expediente: formatNroExp(
              datos.nroExpediente,
              false,
              visibleExpedientes.find(
                item => String(item.id) === String(datos.expedienteId)
              )?.fechaIngreso
            ),
            p_fecha: datos.fecha,
            p_area_destino: datos.areaDestino,
            p_responsable: datos.responsable,
            p_instruccion: datos.instruccion,
            p_estado: 'Pendiente',
            p_archivo: datos.archivo?.name ?? null,
            p_archivo_data: archivoData,
            p_archivo_tipo: datos.archivo
              ? datos.archivo.type || 'application/octet-stream'
              : null,
            p_archivo_tamano: datos.archivo?.size ?? null
          }
        )

        if (error) {
          console.error('Error al guardar proveído:', error)
          alert(`No se pudo guardar el proveído: ${error.message}`)
          return
        }

        if (!data) {
          alert('Supabase no devolvió los datos del proveído registrado.')
          return
        }

        // Actualizar el expediente usando la respuesta directa de la RPC
        const expedienteActualizado = data.expediente

        if (expedienteActualizado) {
          setExpedientes(prev =>
            prev.map(item =>
              String(item.id) === String(datos.expedienteId)
                ? {
                    ...item,
                    area: expedienteActualizado.area_destino || item.area,
                    areaDestino: expedienteActualizado.area_destino || item.areaDestino,
                    estado: expedienteActualizado.estado || item.estado,
                    historial: Array.isArray(expedienteActualizado.historial)
                      ? expedienteActualizado.historial
                      : item.historial
                  }
                : item
            )
          )
        }

        // Añadir a la lista los datos devueltos por Supabase.
        setProveidos(prev => [
          {
            id: String(data.id),
            expedienteId: String(data.expediente_id),
            nroExpediente: data.nro_expediente,
            fecha: data.fecha,
            realizadoPor: String(data.realizado_por || ''),
            areaDestino: data.area_destino,
            responsable: data.responsable || '',
            instruccion: data.instruccion,
            estado: data.estado,
            archivo: data.archivo || '',
            archivoData: data.archivo_data || '',
            archivoTipo: data.archivo_tipo || '',
            archivoTamano: Number(data.archivo_tamano || 0),
            createdAt: data.created_at
          },
          ...prev
        ])

        setShowProveidoForm(false)
        setProveidoExpediente(null)
        notify(
          `Proveído ${formatDocumentNumber(String(data.id), String(data.created_at ?? ''))} registrado correctamente.`
        )
      }}

    />
  )}

                {view === 'reportes' && canSeeReports && (
                  <Suspense
                    fallback={
                      <section className="panel empty-state">
                        Cargando reportes...
                      </section>
                    }
                  >
                    <ReportsView
                      expedientes={visibleExpedientes}
                      riskAnalysis={expedienteRiskAnalysis}
                      notify={notify}
                    />
                  </Suspense>
                )}
              </>
            )}
          </div>
        </main>

        {showNewExpedienteForm && (
          <div className="new-expediente-modal-overlay">
            <div
              className="new-expediente-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-expediente-title"
            >
              <NewExpedienteView
                onSubmit={addExpediente}
                onCancel={() => {
                  setShowNewExpedienteForm(false)
                  setExpedienteParaDuplicar(null)
                }}
                isSaving={isSaving}
                expedienteParaDuplicar={expedienteParaDuplicar}
              />
            </div>
          </div>
        )}

        {toast && <div className="toast"><span>✓</span>{toast}</div>}
        {trackingId && (
          <TrackingModal
            item={visibleExpedientes.find(item => item.id === trackingId)}
            memos={visibleMemos}
            oficios={visibleOficios}
            proveidos={visibleProveidos}
            onAttachDocument={file =>
              adjuntarDocumento(trackingId, file)
            }
            onClose={() => setTrackingId(null)}
          />
        )}
        </div>
    )
  }
