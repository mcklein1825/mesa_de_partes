  import { useState, useEffect, useMemo, useRef, useCallback, FormEvent } from 'react'
  import { supabase } from './lib/supabaseClient'
  import UserSelectModal from './components/UserSelectModal'
  import OficiosView from './components/views/OficiosView'
  import ProveidosView from './components/views/ProveidosView'
  import NuevoOficioView from './components/views/NuevoOficioView'
  import NuevoProveidoView from './components/views/NuevoProveidoView'
  // Tipos y Constantes
  import { User, View, Expediente, Memo, Oficio, Proveido, Status } from './types'
  import { ROLE_PERMISSIONS, areas, AREA_RESPONSABLES } from './constants'

  // Utilidades
  import {
    normalizeExpediente, formatDate, todayInputValue, addDays,
    readFileAsDataUrl, getAreaDestino, getRemitenteNombre
  } from './utils/expedienteHelpers'

  import DashboardView from './components/views/DashboardView'
  import ExpedientesView from './components/views/ExpedientesView'
  import MemosView from './components/views/MemosView'
  import NewExpedienteView from './components/views/NewExpedienteView'
  import ReportsView from './components/views/ReportsView'

  // Componentes Comunes y Modales
  import NavItem from './components/common/NavItem'
  import TrackingModal from './components/modals/TrackingModal'

  export default function App() {
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [view, setView] = useState<View>('nuevo')
    const [expedienteParaDuplicar, setExpedienteParaDuplicar] =
    useState<Expediente | null>(null)
    const [expedientes, setExpedientes] = useState<Expediente[]>([])
    const [memoExpediente, setMemoExpediente] = useState<Expediente | null>(null)
    const [oficioExpediente, setOficioExpediente] = useState<Expediente | null>(null)
    const [loadingDb, setLoadingDb] = useState(true)

    const [query, setQuery] = useState('')
    const [areaFilter, setAreaFilter] = useState('Todas')
    const [remitenteFilter, setRemitenteFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('Todos')
    const [trackingId, setTrackingId] = useState<string | null>(null)
    const [showProfile, setShowProfile] = useState(false)
    const [toast, setToast] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    
    const [memos, setMemos] = useState<Memo[]>([])
    const [oficios, setOficios] = useState<Oficio[]>([])
    const [proveidos, setProveidos] = useState<Proveido[]>([])
    const [showOficioForm, setShowOficioForm] = useState(false)
    const [showProveidoForm, setShowProveidoForm] = useState(false)
    const [proveidoExpediente, setProveidoExpediente] = useState<Expediente | null>(null)
    const [showProveidoSelector, setShowProveidoSelector] = useState(false)
    const [expedienteDocumentos, setExpedienteDocumentos] = useState<
    { expedienteId: string; tipoDocumento: 'Memo' | 'Oficio' }[]
  >([])
    const [memoNro, setMemoNro] = useState('')
    const [memoAsunto, setMemoAsunto] = useState('')
    const [memoFecha, setMemoFecha] = useState(todayInputValue())
    const [showMemoForm, setShowMemoForm] = useState(false)
    const [showMemoSelector, setShowMemoSelector] = useState(false)
    const [memoAreaDestino, setMemoAreaDestino] = useState('')
    const [memoResponsable, setMemoResponsable] = useState('')
    useEffect(() => {
    if (!memoAreaDestino) {
      setMemoResponsable('')
      return
    }

    setMemoResponsable(
      AREA_RESPONSABLES[memoAreaDestino] || ''
    )
  }, [memoAreaDestino]) 
    
    const notify = useCallback((message: string) => {
      setToast(message)
      window.setTimeout(() => setToast(''), 3000)
    }, [])

    const sessionTimeoutRef = useRef<number | null>(null)
    const resetSessionTimeout = useCallback(() => {
      if (sessionTimeoutRef.current) window.clearTimeout(sessionTimeoutRef.current)
      sessionTimeoutRef.current = window.setTimeout(() => {
        notify('Sesión expirada por inactividad')
        setCurrentUser(null)
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

    useEffect(() => {
      const cargarDeSupabase = async () => {
        setLoadingDb(true)
  const { data, error } = await supabase
    .from('mesa_partes_2026')
    .select(`
      id,
      nro_exp,
      fecha_ingreso,
      remitente_nombre,
      asunto,
      contenido,
      area,
      area_destino,
      estado,
      plazo,
      prioridad,
      archivo,
      archivo_tipo,
      archivo_tamano,
      documentos,
      modalidad_recepcion,
      entregado_a,
      canal_recepcion,
      folios,
      anexos,
      direccion,
      correo,
      celular,
      representante,
      cargo_representante,
      usuario_registro,
      fecha_hora_recepcion,
      constancia_recepcion,
      historial,
      fecha_sin_respuesta,
      es_duplicado
    `)
    .order('nro_exp', { ascending: false })

  if (error) {
    console.error('Supabase Error:', error)
    notify('Error al cargar expedientes desde Supabase')
    setLoadingDb(false)
    return
  }
  const { data: proveidosData, error: proveidosError } =
  await supabase
    .from('proveidos')
    .select(`
      id,
      expediente_id,
      nro_expediente,
      fecha,
      area_destino,
      responsable,
      instruccion,
      estado,
      created_at
    `)
    .order('id', { ascending: false })

if (proveidosError) {
  console.error(
    'Error al cargar proveídos:',
    proveidosError
  )
} else if (proveidosData) {
  console.log('PROVEÍDOS CARGADOS DESDE SUPABASE:', proveidosData)
  setProveidos(
    proveidosData.map((item: any) => ({
      id: String(item.id),
      expedienteId: String(item.expediente_id),
      nroExpediente: String(item.nro_expediente),
      fecha: item.fecha,
      areaDestino: item.area_destino,
      responsable: item.responsable || '',
      instruccion: item.instruccion,
      estado: item.estado,
      createdAt: item.created_at
    }))
  )
}

        if (data) {
          const normalizados: Expediente[] = data.map((item: any) => {
            const nombreCompleto = item.remitente_nombre || 'Sin nombre'
            const parts = nombreCompleto.split(/\s*-\s*/, 2)
            return normalizeExpediente({
              id: String(item.id || ''),
              nroExp: String(item.nro_exp || ''),
              esDuplicado: Boolean(item.es_duplicado),
              fechaIngreso: item.fecha_ingreso || '',
              remitente: nombreCompleto,
              remitenteNombre: item.remitente_nombre || parts[0]?.trim() || nombreCompleto,
              asunto: item.asunto || '',
              contenido: item.contenido || '',
              area: item.area || '',
              areaDestino: item.area_destino || '',
              estado: item.estado || 'Pendiente',
              plazo: item.plazo || '',
              fechaSinRespuesta: item.fecha_sin_respuesta || '',
              prioridad: item.prioridad || 'Normal',
              archivo: item.archivo || 'Sin adjunto',
              archivoData: item.archivo_data || '',
              archivoTipo: item.archivo_tipo || '',
              archivoTamano: item.archivo_tamano || 0,
              modalidadRecepcion: item.modalidad_recepcion || undefined,
              entregadoA: item.entregado_a || '',
              canalRecepcion: item.canal_recepcion || '',
              folios: item.folios ?? 1,
              anexos: item.anexos ?? 0,
              direccion: item.direccion || '',
              correo: item.correo || '',
              celular: item.celular || '',
              representante: item.representante || '',
              cargoRepresentante: item.cargo_representante || '',
              usuarioRegistro: item.usuario_registro || '',
              fechaHoraRecepcion: item.fecha_hora_recepcion || '',
              constanciaRecepcion: item.constancia_recepcion || '',
              historial: Array.isArray(item.historial) ? item.historial : []
            })
          })
          setExpedientes(normalizados)
        }

        const { data: memosData, error: memosError } =
          await supabase
            .from('memos')
            .select('*')
            .order('id', { ascending: false })

        console.log('MEMOS CARGADOS DESDE SUPABASE:', memosData)
        console.log(
          'EXPEDIENTES CON ARCHIVO:',
          data?.filter((item: any) => item.archivo_data)
        )
        console.log(
          'PRIMER EXPEDIENTE CARGADO:',
          data?.[0]
        )
        console.log(
          'EXPEDIENTE 00049:',
          data?.find(
            (item: any) =>
              String(item.nro_exp) === '49' ||
              String(item.nro_exp) === 'EXP-2026-00049'
          )
        )
              
        console.log('ERROR MEMOS:', memosError)

        if (memosError) {
          console.error('Error cargando memos:', memosError)
        } else if (memosData) {
          const memosNormalizados: Memo[] = memosData.map((m: any) => ({
            id: String(m.id),
            nroMemo: m.nro_memo || '',
            expedienteId: String(m.expediente_id),
            nroExpediente: m.nro_expediente || '',
            fecha: m.fecha || '',
            asunto: m.asunto || '',
            registradoPor: m.registrado_por || '',
            areaDestino: m.area_destino || '',
            responsable: m.responsable || '',
            estado: m.estado || 'Pendiente',

            archivo: m.archivo || '',
            archivoData: m.archivo_data || '',
            archivoTipo: m.archivo_tipo || '',
            archivoTamano: m.archivo_tamano || 0,

            createdAt: m.created_at
          }))

          console.log('MEMOS NORMALIZADOS:', memosNormalizados)

          setMemos(memosNormalizados)
        }
        const { data: oficiosData, error: oficiosError } = await supabase
    .from('oficios')
    .select('*')
    .order('id', { ascending: false })

  if (oficiosError) {
    console.error('Error cargando oficios:', oficiosError)
  } else if (oficiosData) {
    const oficiosNormalizados: Oficio[] = oficiosData.map((item: any) => ({
      id: String(item.id),
      nRegistro: String(item.n_registro ?? ''),
      expedienteId: String(item.expediente_id ?? ''),
      nroExpediente: String(item.nro_expediente ?? ''),
      fecha: item.fecha ?? '',
      destinatario: item.destinatario ?? '',
      asuntoTipo: item.asunto_tipo ?? '',
      asuntoDetalle: item.asunto_detalle ?? '',
      responsable: item.responsable ?? '',
      codigoOad: item.codigo_oad ?? '',
      codigoOgesup: item.codigo_ogesup ?? '',
      anio: Number(item.anio ?? new Date().getFullYear()),
      areaDestino: item.area_destino ?? '',
      estado: item.estado ?? 'Enviado',
      fechaRegistro: item.fecha_registro ?? '',
      createdAt: item.created_at ?? ''
    }))

    setOficios(oficiosNormalizados)
  }
        // Cargar el tipo de documento asignado a cada expediente
        const { data: documentosData, error: documentosError } = await supabase
          .from('expediente_documentos')
          .select('expediente_id, tipo_documento')

        if (documentosError) {
          console.error('Error cargando tipos de documento:', documentosError)
        } else if (documentosData) {
          setExpedienteDocumentos(
            documentosData.map((item: any) => ({
              expedienteId: String(item.expediente_id),
              tipoDocumento: item.tipo_documento as 'Memo' | 'Oficio'
            }))
          )
        }

        setLoadingDb(false)
      }
      cargarDeSupabase()
    }, [notify])

    const userPermissions = currentUser ? ROLE_PERMISSIONS[currentUser.rol] : null

    const areaOptions = useMemo(() =>
      Array.from(new Set([...areas, ...expedientes.map(getAreaDestino).filter(Boolean)])).sort(),
    [expedientes])

    const currentDate = useMemo(() => {
      const now = new Date()
      return now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
    }, [])

    const filteredExpedientes = useMemo(() => {
    const termino = query.trim().toLowerCase()

    return expedientes.filter(item => {
      let matchesQuery = true

      if (termino) {
        const nroExpediente = String(item.nroExp || '')
          .trim()
          .toLowerCase()

        const nroExpedienteFormateado = nroExpediente.startsWith('exp-')
          ? nroExpediente
          : `exp-2026-${nroExpediente.padStart(5, '0')}`

        const terminoEsNumero = /^\d+$/.test(termino)

        if (terminoEsNumero) {
          matchesQuery =
            nroExpediente === termino ||
            nroExpedienteFormateado ===
              `exp-2026-${termino.padStart(5, '0')}` ||
            nroExpedienteFormateado.endsWith(
              `-${termino.padStart(5, '0')}`
            )
        } else {
          matchesQuery =
            nroExpedienteFormateado.includes(termino) ||
            item.asunto.toLowerCase().includes(termino)
        }
      }

      const matchesArea =
        areaFilter === 'Todas' ||
        getAreaDestino(item) === areaFilter

      const matchesRemitente =
        getRemitenteNombre(item)
          .toLowerCase()
          .includes(remitenteFilter.trim().toLowerCase())

      const matchesStatus =
        statusFilter === 'Todos' ||
        item.estado === statusFilter

      return (
        matchesQuery &&
        matchesArea &&
        matchesRemitente &&
        matchesStatus
      )
    })
  }, [
    expedientes,
    query,
    areaFilter,
    remitenteFilter,
    statusFilter
  ])

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

  let nextNumber: number

  if (esDuplicado && expedienteOriginal) {
    nextNumber = Number(expedienteOriginal.nroExp)

    if (!Number.isInteger(nextNumber)) {
      notify('El número del expediente original no es válido')
      setIsSaving(false)
      return
    }
  } else {
    const { data: numeroSiguiente, error: nextNumberError } =
      await supabase.rpc('obtener_siguiente_nro_exp')

    if (
      nextNumberError ||
      !Number.isInteger(numeroSiguiente)
    ) {
      console.error(
        'Error obteniendo número de expediente:',
        nextNumberError
      )

      notify(
        'No se pudo obtener el número de expediente. Intente nuevamente.'
      )

      setIsSaving(false)
      return
    }

    nextNumber = numeroSiguiente
  }

  const currentYear = new Date().getFullYear()

  const nextId =
    `EXP-${currentYear}-${String(nextNumber).padStart(5, '0')}`

  const fechaIngreso = String(
    data.get('fechaIngreso') || ''
  )

  const fechaFormateada = formatDate(fechaIngreso)

  const remitente = String(
    data.get('remitente') || ''
  ).trim()

    

  const historialInicial = esDuplicado && expedienteOriginal
    ? [
        {
          fechaHora: new Date().toISOString(),
          fechaIngreso,
          areaOrigen: 'Mesa de Partes',
          areaDestino: '',
          accion: 'Duplicado',
          observacion: `Expediente creado como duplicado de EXP-2026-${String(
            expedienteOriginal.nroExp
          ).padStart(5, '0')}.`,
          responsable: currentUser.nombre
        }
      ]
    : []
      const newExpediente: Expediente = {
        id: '',
        nroExp: String(nextNumber),
        esDuplicado,
        fechaIngreso: fechaFormateada,
        remitente,
        remitenteNombre: remitente,
        representante: String(data.get('representante') || ''),
        cargoRepresentante: String(data.get('cargoRepresentante') || ''),
        asunto: String(data.get('asunto') || ''),
        contenido: String(data.get('contenido') || ''), area: '', areaDestino: '', estado: 'Pendiente',
        plazo: addDays(fechaIngreso, 7),
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
        fechaHoraRecepcion: new Date().toISOString(),
        constanciaRecepcion: `Cargo generado para ${nextId}`
      }

      const { data: insertedData, error } = await supabase.from('mesa_partes_2026').insert({
        nro_exp: newExpediente.nroExp, fecha_ingreso: fechaIngreso, 
        remitente_nombre: newExpediente.remitenteNombre,
        asunto: newExpediente.asunto, contenido: newExpediente.contenido, plazo: newExpediente.plazo, prioridad: newExpediente.prioridad,
        archivo: newExpediente.archivo, archivo_data: newExpediente.archivoData,
        archivo_tipo: newExpediente.archivoTipo, archivo_tamano: newExpediente.archivoTamano,
        documentos: newExpediente.documentos,
        modalidad_recepcion: newExpediente.modalidadRecepcion, entregado_a: newExpediente.entregadoA,
        canal_recepcion: newExpediente.canalRecepcion,
        folios: newExpediente.folios, anexos: newExpediente.anexos, direccion: newExpediente.direccion,
        correo: newExpediente.correo, celular: newExpediente.celular, representante: newExpediente.representante,
        cargo_representante: newExpediente.cargoRepresentante, usuario_registro: newExpediente.usuarioRegistro,
        fecha_hora_recepcion: newExpediente.fechaHoraRecepcion, constancia_recepcion: newExpediente.constanciaRecepcion,
        historial: newExpediente.historial,
        es_duplicado: esDuplicado,
        duplicado_de_id: esDuplicado
          ? Number(duplicadoDesdeId)
          : null
            }).select().single()

      if (error) {
        console.error('Error insertando expediente:', error)
        notify(`No se pudo registrar el expediente: ${error.message}`)
        setIsSaving(false)
        return
      }

      setIsSaving(false)

  const expedienteInsertado = insertedData
    ? normalizeExpediente({
        ...newExpediente,
        id: String(insertedData.id),
        nroExp: String(
          insertedData.nro_exp || newExpediente.nroExp
        )
      })
    : newExpediente

  setExpedientes(prev => [
    expedienteInsertado,
    ...prev
  ])

  form.reset()

  // Limpiar el modo duplicado
  setExpedienteParaDuplicar(null)

  setView('expedientes')

  notify(
    `Expediente ${nextId} registrado correctamente`
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

      const expediente = expedientes.find(
        item => item.id === expedienteId
      )

      if (!expediente) {
        notify('No se encontró el expediente')
        return
      }

      const historialActual = Array.isArray(expediente.historial)
        ? expediente.historial
        : []

      const nuevoHistorial = [
        ...historialActual,
        {
          fechaHora: new Date().toISOString(),
          fechaIngreso: expediente.fechaIngreso || '',
          areaOrigen: currentUser.area || 'Mesa de Partes',
          areaDestino: getAreaDestino(expediente),
          accion: 'Documento adjuntado',
          observacion: `Se adjuntó posteriormente el documento "${file.name}".`,
          responsable: `${currentUser.nombre} - ${currentUser.area || ''}`
        }
      ]

      const { error } = await supabase
        .from('mesa_partes_2026')
        .update({
          archivo: file.name,
          archivo_data: archivoData,
          archivo_tipo: file.type || 'application/octet-stream',
          archivo_tamano: file.size,
          historial: nuevoHistorial
        })
        .eq('id', expedienteId)

      if (error) {
        console.error(
          'Error adjuntando documento:',
          error
        )

        notify(
          `No se pudo adjuntar el documento: ${error.message}`
        )

        return
      }

      setExpedientes(prev =>
        prev.map(item =>
          item.id === expedienteId
            ? {
                ...item,
                archivo: file.name,
                archivoData: archivoData,
                archivoTipo: file.type || 'application/octet-stream',
                archivoTamano: file.size,
                historial: nuevoHistorial
              }
            : item
        )
      )

      notify(
        `Documento "${file.name}" adjuntado correctamente`
      )

    } catch (error) {
      console.error(
        'Error inesperado al adjuntar documento:',
        error
      )

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

  if (!fecha) {
    notify('Seleccione una fecha')
    return
  }

  try {
    setIsSaving(true)

    const { error } = await supabase
      .from('mesa_partes_2026')
      .update({
        fecha_ingreso: fecha
      })
      .eq('id', Number(expedienteId))

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

    setExpedientes(prev =>
      prev.map(item =>
        item.id === expedienteId
          ? {
              ...item,
              fechaIngreso: fecha
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
    const expediente = expedientes.find(item => item.id === id)

    if (!expediente) {
      notify('Expediente no encontrado')
      return
    }

    if (tipo === 'Memo') {
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

    notify('Tipo de documento no disponible')
  }

  const openNewMemo = () => {
    setMemoNro('')
    setMemoFecha(todayInputValue())
    setMemoAsunto(memoExpediente?.asunto || '')
    setMemoAreaDestino('')

    setMemoExpediente(null)
    setShowMemoSelector(true)
    setShowMemoForm(false)
  }

    const cancelNewMemo = () => setShowMemoForm(false)

    const saveNewMemo = async (archivo: File | null) => {
    if (!memoExpediente) {
      notify('No se seleccionó ningún expediente')
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
    if (!archivo) {
    notify('Seleccione el archivo del Memo')
    return
    }

    if (archivo.size > 5 * 1024 * 1024) {
      notify('El archivo no puede superar los 5 MB')
      return
    } 
      const expedienteId = Number(memoExpediente.id)

    if (Number.isNaN(expedienteId)) {
      notify('El ID del expediente no es válido')
      return
    }

    setIsSaving(true)

    try {
      const nroExpediente = memoExpediente.nroExp.startsWith('EXP-')
        ? memoExpediente.nroExp
        : `EXP-2026-${memoExpediente.nroExp.padStart(5, '0')}`

      const archivoData = await readFileAsDataUrl(archivo)

      const { data, error } = await supabase.rpc('registrar_memo', {
      p_expediente_id: expedienteId,
      p_nro_expediente: nroExpediente,
      p_fecha: memoFecha,
      p_asunto: memoAsunto.trim(),
      p_registrado_por: currentUser?.nombre || '',
      p_area_destino: memoAreaDestino.trim(),
      p_responsable: memoResponsable.trim(),
      p_archivo: archivo.name,
      p_archivo_data: archivoData,
      p_archivo_tipo: archivo.type,
      p_archivo_tamano: archivo.size
    })

      if (error) {
        console.error('Error guardando Memo:', error)
        notify(`No se pudo guardar el Memo: ${error.message}`)
        return
      }

      if (data) {
        const memoNuevo: Memo = {
          id: String(data.id),
          nroMemo: data.nro_memo || '',
          expedienteId: String(data.expediente_id),
          nroExpediente: data.nro_expediente || '',
          fecha: data.fecha || '',
          asunto: data.asunto || '',
          registradoPor: data.registrado_por || '',
          areaDestino: data.area_destino || '',
          responsable: data.responsable || '',
          estado: data.estado || 'Pendiente',
          archivo: data.archivo || '',
          archivoData: data.archivo_data || '',
          archivoTipo: data.archivo_tipo || '',
          archivoTamano: data.archivo_tamano || 0,
          createdAt: data.created_at
        }

        setMemos(prev => [memoNuevo, ...prev])

        const historialActual = Array.isArray(memoExpediente.historial)
          ? memoExpediente.historial
          : []

        const nuevoHistorial = [
          ...historialActual,
          {
            fechaHora: new Date().toISOString(),
            fechaIngreso: memoFecha,
            areaOrigen: 'Mesa de Partes',
            areaDestino: memoAreaDestino.trim(),
            accion: 'Derivado',
            observacion: `Expediente derivado mediante Memo ${memoNuevo.nroMemo}.`,
            responsable: currentUser?.nombre || ''
          }
        ]

        const { error: expedienteError } = await supabase
          .from('mesa_partes_2026')
          .update({
            area: memoAreaDestino.trim(),
            area_destino: memoAreaDestino.trim(),
            entregado_a: '',
            historial: nuevoHistorial
          })
          .eq('id', expedienteId)

        if (expedienteError) {
          console.error(
            'Error actualizando expediente después del Memo:',
            expedienteError
          )
          notify(
            `Memo registrado, pero no se pudo actualizar el expediente: ${expedienteError.message}`
          )
          return
        }

        setExpedientes(prev =>
          prev.map(item =>
            item.id === memoExpediente.id
              ?{
                ...item,
                area: memoAreaDestino.trim(),
                areaDestino: memoAreaDestino.trim(),
                entregadoA: '',
                historial: nuevoHistorial
              }
              : item
          )
        )


        setMemoNro('')
        setMemoFecha(todayInputValue())
        setMemoAsunto('')
        setMemoAreaDestino('')

        setShowMemoForm(false)

        notify(`Memo ${memoNuevo.nroMemo} registrado correctamente`)
      }

    } catch (error) {
      console.error('Error inesperado guardando Memo:', error)
      notify('Ocurrió un error al guardar el Memo')
    } finally {
      setIsSaving(false)
    }
  }
  const updateMemoEstado = async (
    memoId: string,
    nuevoEstado: Memo['estado']
  ) => {
    console.log('UPDATE MEMO LLAMADO:', {
      memoId,
      nuevoEstado
    })

    try {
      // 1. Buscar el Memo
      const memo = memos.find(
        item => item.id === memoId
      )

      if (!memo) {
        notify('Memo no encontrado')
        return
      }

      // 2. Actualizar el estado del Memo en Supabase
      const { error } = await supabase
        .from('memos')
        .update({
          estado: nuevoEstado
        })
        .eq('id', Number(memoId))

      if (error) {
        console.error(
          'Error actualizando estado del Memo:',
          error
        )

        notify(
          `No se pudo actualizar el estado: ${error.message}`
        )

        return
      }

      // 3. Actualizar el Memo en memoria
      setMemos(prev =>
        prev.map(item =>
          item.id === memoId
            ? {
                ...item,
                estado: nuevoEstado
              }
            : item
        )
      )

      // 4. Obtener el expediente relacionado
      const expedienteId = memo.expedienteId

      const expediente = expedientes.find(
        item => item.id === expedienteId
      )

      if (!expediente) {
        notify(
          'Memo actualizado, pero no se encontró su expediente relacionado'
        )
        return
      }

      // 5. Determinar la fecha de Sin respuesta
      const fechaSinRespuesta =
        nuevoEstado === 'Sin respuesta'
          ? expediente.fechaSinRespuesta ||
            new Date().toISOString().split('T')[0]
          : nuevoEstado === 'Atendido'
            ? null
            : expediente.fechaSinRespuesta || null

      // 6. Actualizar el expediente relacionado
      const { error: expedienteError } = await supabase
        .from('mesa_partes_2026')
        .update({
          estado: nuevoEstado,
          fecha_sin_respuesta: fechaSinRespuesta
        })
        .eq('id', Number(expedienteId))

      if (expedienteError) {
        console.error(
          'Error actualizando estado del expediente:',
          expedienteError
        )

        notify(
          `Memo actualizado, pero no se pudo actualizar el expediente: ${expedienteError.message}`
        )

        return
      }

      // 7. Actualizar el expediente en memoria
      setExpedientes(prev =>
        prev.map(item =>
          item.id === expedienteId
            ? {
                ...item,
                estado: nuevoEstado,
                fechaSinRespuesta:
                  fechaSinRespuesta || ''
              }
            : item
        )
      )

      notify(
        `Memo y expediente actualizados a "${nuevoEstado}"`
      )

    } catch (error) {
      console.error(
        'Error inesperado actualizando estado del Memo:',
        error
      )

      notify(
        'Ocurrió un error al actualizar el estado del Memo'
      )
    }
  }


    if (!currentUser) return <UserSelectModal onSelectUser={setCurrentUser} />

    return (
      <div className="app-shell portal-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">MP</div>
            <div><strong>Mesa de Partes</strong><span>Gestión documental</span></div>
          </div>
          <div className="menu-label">MENÚ PRINCIPAL</div>
          <nav className="nav-menu">
    <NavItem
      icon="⌂"
      label="Inicio"
      active={view === 'inicio'}
      onClick={() => setView('inicio')}
    />

    <NavItem
      icon="▤"
      label="Expedientes"
      active={view === 'expedientes'}
      onClick={() => setView('expedientes')}
      count={expedientes.filter(item => item.estado === 'Pendiente').length}
    />
    <NavItem
    icon="▥"
    label="Memos"
    active={view === 'memos'}
    onClick={() => {
      setMemoExpediente(null)
      setShowMemoForm(false)
      setShowMemoSelector(false)
      setView('memos')
    }}
    count={memos.length}
  />
    <NavItem
    icon="▤"
    label="Oficios"
    active={view === 'oficios'}
    onClick={() => {
      setView('oficios')
    }}
    count={oficios.length}
  />
      <NavItem
      icon="✎"
      label="Proveídos"
      active={view === 'proveidos'}
      onClick={() => {
        setView('proveidos')
      }}
      count={proveidos.length}
    />
    <NavItem
      icon="＋"
      label="Nuevo expediente"
      active={view === 'nuevo'}
      onClick={() => setView('nuevo')}
    />

    <NavItem
      icon="▥"
      label="Reportes"
      active={view === 'reportes'}
      onClick={() => setView('reportes')}
    />
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
                <div><b>{currentUser.nombre}</b><small>{currentUser.rol === 'MesaPartes' ? 'Mesa de Partes' : currentUser.rol}</small></div>
                <span>⋮</span>
              </button>
              {showProfile && (
                <div className="profile-popover">
                  <b>{currentUser.nombre}</b>
                  <span>Rol: {currentUser.rol === 'MesaPartes' ? 'Mesa de Partes' : currentUser.rol}</span>
                  <span>Área: {currentUser.area || 'N/A'}</span>
                  <hr />
                  <button onClick={() => { notify('Configuración disponible en versión completa'); setShowProfile(false) }}>Configuración</button>
                  <button onClick={() => { setCurrentUser(null); setShowProfile(false); notify('Sesión cerrada correctamente') }}>Cerrar sesión</button>
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
                {view === 'inicio' && <DashboardView expedientes={expedientes} proveidos={proveidos} onNew={() => setView('nuevo')} onViewAll={() => setView('expedientes')} currentDate={currentDate} />}  
                {view === 'expedientes' && (
                  <ExpedientesView
                    items={filteredExpedientes}
                    query={query}
                    setQuery={setQuery}
                    areaFilter={areaFilter}
                    areaOptions={areaOptions}
                    setAreaFilter={setAreaFilter}
                    remitenteFilter={remitenteFilter}
                    setRemitenteFilter={setRemitenteFilter}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    onNew={() => setView('nuevo')}
                    onOpenDocumentType={openDocumentType}
                    expedienteDocumentos={expedienteDocumentos}
                    onTracking={setTrackingId}
                    onAttachDocument={adjuntarDocumento}
                    onRegisterDate={registrarFechaExpediente}
                    onDuplicate={expediente => {
                      setExpedienteParaDuplicar(expediente)
                      setView('nuevo')
                    }}
                  />
                )}
          {view === 'memos' && (
              <MemosView
                expediente={memoExpediente}
                expedientes={expedientes}
                areaOptions={areaOptions}
                memos={memos}
                showMemoSelector={showMemoSelector}
                onUpdateMemoEstado={updateMemoEstado}
                onBack={() => {
        setMemoExpediente(null)
        setShowMemoForm(false)
        setShowMemoSelector(false)
        setView('expedientes')
      }}
      onNewMemo={openNewMemo}
      onCloseMemoSelector={() => {
        setShowMemoSelector(false)
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
        setMemoExpediente(expediente)

        if (expediente) {
          setMemoNro('')
          setMemoFecha(todayInputValue())
          
          setMemoAsunto(expediente.asunto || '')
          setMemoAreaDestino('')
    
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
      oficios={oficios}
      oficioExpediente={oficioExpediente}
      onNuevoOficio={() => {
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
        try {
          const { data, error } = await supabase
            .from('oficios')
            .insert({
              expediente_id: Number(datos.expedienteId),
              nro_expediente: datos.nroExpediente,
              fecha: datos.fecha,
              destinatario: datos.destinatario,
              asunto_tipo: datos.asuntoTipo,
              asunto_detalle: datos.asuntoDetalle,
              responsable: datos.responsable,
              codigo_oad: datos.codigoOad,
              codigo_ogesup: datos.codigoOgesup,
              anio: datos.anio,
              area_destino: datos.areaDestino
            })
            .select()
            .single()

          if (error) {
            console.error('Error guardando oficio:', error)
            alert(`No se pudo guardar el oficio: ${error.message}`)
            return
          }

          console.log('Oficio guardado:', data)

          const { data: oficiosActualizados, error: errorOficios } = await supabase
            .from('oficios')
            .select('*')
            .order('id', { ascending: false })

          if (errorOficios) {
            console.error('Error actualizando lista de oficios:', errorOficios)
          } else if (oficiosActualizados) {
            const oficiosNormalizados: Oficio[] = oficiosActualizados.map((item: any) => ({
              id: String(item.id),
              nRegistro: String(item.n_registro ?? ''),
              expedienteId: String(item.expediente_id ?? ''),
              nroExpediente: String(item.nro_expediente ?? ''),
              fecha: item.fecha ?? '',
              destinatario: item.destinatario ?? '',
              asuntoTipo: item.asunto_tipo ?? '',
              asuntoDetalle: item.asunto_detalle ?? '',
              responsable: item.responsable ?? '',
              codigoOad: item.codigo_oad ?? '',
              codigoOgesup: item.codigo_ogesup ?? '',
              anio: Number(item.anio ?? new Date().getFullYear()),
              areaDestino: item.area_destino ?? '',
              estado: item.estado ?? 'Enviado',
              fechaRegistro: item.fecha_registro ?? '',
              createdAt: item.created_at ?? ''
            }))

            setOficios(oficiosNormalizados)
          }

          setShowOficioForm(false)
          setOficioExpediente(null)
          setView('oficios')

          alert('Oficio registrado correctamente.')
        } catch (error) {
          console.error('Error inesperado guardando oficio:', error)
          alert('Ocurrió un error al guardar el oficio.')
        }
      }}
    />
  )}
  {view === 'proveidos' && !showProveidoForm && (
  <ProveidosView
  proveidos={proveidos}
  expedientes={expedientes}
  areaOptions={areaOptions}
  showSelector={showProveidoSelector}
  onCloseSelector={() => {
    setShowProveidoSelector(false)
  }}
  onNuevoProveido={() => {
    setShowProveidoSelector(true)
  }}
  onSelectExpediente={expediente => {
    setProveidoExpediente(expediente)
    setShowProveidoSelector(false)
    setShowProveidoForm(true)
  }}
/>
  )}

  {view === 'proveidos' && showProveidoForm && (
    <NuevoProveidoView
      expediente={proveidoExpediente}
      expedientes={expedientes}
      areaOptions={areaOptions}
      onExpedienteChange={setProveidoExpediente}
      onCancelar={() => {
        setShowProveidoForm(false)
        setProveidoExpediente(null)
      }}
      onGuardar={async datos => {
  const { data, error } = await supabase.rpc(
    'registrar_proveido',
    {
      p_expediente_id: Number(datos.expedienteId),
      p_nro_expediente: datos.nroExpediente,
      p_fecha: datos.fecha,
      p_area_destino: datos.areaDestino,
      p_responsable: datos.responsable,
      p_instruccion: datos.instruccion,
      p_estado: datos.estado
    }
  )

  if (error) {
    console.error('Error al guardar proveído:', error)
    alert(`No se pudo guardar el proveído: ${error.message}`)
    return
  }

  setProveidos(prev => [
    ...prev,
    {
      id: String(data.id),
      expedienteId: String(data.expediente_id),
      nroExpediente: data.nro_expediente,
      fecha: data.fecha,
      areaDestino: data.area_destino,
      responsable: data.responsable || '',
      instruccion: data.instruccion,
      estado: data.estado,
      createdAt: data.created_at
    }
  ])

  setShowProveidoForm(false)
  setProveidoExpediente(null)
}}
    />
  )}

                {view === 'nuevo' && (
                  <NewExpedienteView
                    onSubmit={addExpediente}
                    onCancel={() => {
                      setExpedienteParaDuplicar(null)
                      setView('inicio')
                    }}
                    isSaving={isSaving}
                    expedienteParaDuplicar={expedienteParaDuplicar}
                  />
                )}
                {view === 'reportes' && <ReportsView expedientes={expedientes} notify={notify} />}
              </>
            )}
          </div>
        </main>

        {toast && <div className="toast"><span>✓</span>{toast}</div>}
        {trackingId && (
          <TrackingModal
            item={expedientes.find(item => item.id === trackingId)}
            onClose={() => setTrackingId(null)}
          />
        )}    
        </div>
    )
  }
