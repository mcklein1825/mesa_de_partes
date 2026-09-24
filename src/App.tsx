import { useState, useEffect, useMemo, useRef, useCallback, FormEvent } from 'react'
import { supabase } from './lib/supabaseClient'
import UserSelectModal from './components/UserSelectModal'
import OficiosView from './components/views/OficiosView'
import NuevoOficioView from './components/views/NuevoOficioView'
// Tipos y Constantes
import { User, View, Expediente, Memo, Oficio, Status } from './types'
import { ROLE_PERMISSIONS, areas, AREA_RESPONSABLES } from './constants'

// Utilidades
import {
  normalizeExpediente, formatDate, todayInputValue, addDays,
  readFileAsDataUrl, getAreaDestino, getRemitenteNombre
} from './utils/expedienteHelpers'
import { obtenerResponsablePorArea } from './utils/areasResponsables'

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
  const [pendingAction, setPendingAction] = useState<{ type: 'derive' | 'complete' | 'archive'; id: string; area?: string } | null>(null)

  const [memos, setMemos] = useState<Memo[]>([])
  const [oficios, setOficios] = useState<Oficio[]>([])
  const [showOficioForm, setShowOficioForm] = useState(false)
  const [expedienteDocumentos, setExpedienteDocumentos] = useState<
  { expedienteId: string; tipoDocumento: 'Memo' | 'Oficio' }[]
>([])
  const [memoNro, setMemoNro] = useState('')
  const [memoDestinatario, setMemoDestinatario] = useState('')
  const [memoAsunto, setMemoAsunto] = useState('')
  const [memoSecretaria, setMemoSecretaria] = useState('')
  const [memoFecha, setMemoFecha] = useState(todayInputValue())
  const [showMemoForm, setShowMemoForm] = useState(false)
  const [showMemoSelector, setShowMemoSelector] = useState(false)
  const [memoAreaDestino, setMemoAreaDestino] = useState('')
  const [memoResponsable, setMemoResponsable] = useState('')
  const [memoCargo, setMemoCargo] = useState('')
  const [memoInstruccion, setMemoInstruccion] = useState('')
  const [memoPlazo, setMemoPlazo] = useState('')
  const [showMemoResponsableWarning, setShowMemoResponsableWarning] = useState(false)
  const responsableMemo = useMemo(
  () => obtenerResponsablePorArea(memoAreaDestino),
  [memoAreaDestino]
)
useEffect(() => {
  setMemoResponsable(responsableMemo?.responsable || '')
  setMemoCargo(responsableMemo?.cargo || '')
}, [responsableMemo])
  const [memoFormData, setMemoFormData] = useState<{ nroMemo: string; fecha: string; destinatario: string; asunto: string; secretaria: string; areaDestino: string } | null>(null)

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
        .select(`id, nro_exp, fecha, fecha_ingreso, nombre_apellido, remitente, remitente_nombre, remitente_cargo, documento, tipo, asunto, contenido, area, area_destino, estado, plazo, prioridad, archivo, archivo_tipo, archivo_tamano, archivo_descripcion, documentos, modalidad_recepcion, entregado_a, documento_seguimiento, canal_recepcion, folios, anexos, direccion, correo, celular, representante, cargo_representante, usuario_registro, fecha_hora_recepcion, constancia_recepcion, historial, fecha_sin_respuesta, es_duplicado`)
        .order('nro_exp', { ascending: false })

      if (error) {
        console.error('Supabase Error:', error)
        notify('Error al cargar expedientes desde Supabase')
        setLoadingDb(false)
        return
      }

      if (data) {
        const normalizados: Expediente[] = data.map((item: any) => {
          const nombreCompleto = item.nombre_apellido || item.remitente || 'Sin nombre'
          const parts = nombreCompleto.split(/\s*-\s*/, 2)
          return normalizeExpediente({
            id: String(item.id || ''),
            nroExp: String(item.nro_exp || ''),
            esDuplicado: Boolean(item.es_duplicado),
            fechaIngreso: item.fecha_ingreso || '',
            remitente: nombreCompleto,
            remitenteNombre: item.remitente_nombre || parts[0]?.trim() || nombreCompleto,
            remitenteCargo: item.remitente_cargo || parts[1]?.trim() || '',
            documento: item.documento || '',
            tipo: item.tipo || '',
            asunto: item.asunto || '',
            contenido: item.contenido || '',
            area: item.area || '',
            areaDestino: item.area_destino || '',
            estado: item.estado || 'Pendiente',
            fecha: item.fecha || '',
            plazo: item.plazo || '',
            fechaSinRespuesta: item.fecha_sin_respuesta || '',
            prioridad: item.prioridad || 'Normal',
            archivo: item.archivo || 'Sin adjunto',
            archivoData: '',
            archivoTipo: item.archivo_tipo || '',
            archivoTamano: item.archivo_tamano || 0,
            archivoDescripcion: item.archivo_descripcion || '',
            documentos: item.documentos || '',
            modalidadRecepcion: item.modalidad_recepcion || undefined,
            entregadoA: item.entregado_a || '',
            documentoSeguimiento: item.documento_seguimiento || '',
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
          destinatario: m.destinatario || '',
          asunto: m.asunto || '',
          secretaria: m.secretaria || '',
          areaDestino: m.area_destino || '',
          responsable: m.responsable || '',
          cargo: m.cargo || '',
          instruccion: m.instruccion || '',
          plazo: m.plazo || '',
          recepcionadoPor: m.recepcionado_por || '',
          fechaRecepcion: m.fecha_recepcion || '',
          estado: m.estado || 'Pendiente',
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

  const filteredExpedientes = useMemo(() => expedientes.filter(item => {
    const matchesQuery = `${item.nroExp} ${item.asunto}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesArea = areaFilter === 'Todas' || getAreaDestino(item) === areaFilter
    const matchesRemitente = getRemitenteNombre(item).toLowerCase().includes(remitenteFilter.trim().toLowerCase())
    const matchesStatus = statusFilter === 'Todos' || item.estado === statusFilter
    return matchesQuery && matchesArea && matchesRemitente && matchesStatus
  }), [expedientes, query, areaFilter, remitenteFilter, statusFilter])

  const addExpediente = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentUser || !userPermissions?.puedeRegistrar) {
      notify('No tiene permisos para registrar expedientes')
      return
    }
    const form = event.currentTarget
    const data = new FormData(form)
    const selectedFile = data.get('archivo')

    if (!(selectedFile instanceof File) || !selectedFile.size) {
      notify('Seleccione un archivo antes de registrar el expediente')
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      notify('El archivo supera el límite de 5 MB')
      return
    }

    let fileData = ''
    try {
      setIsSaving(true)
      fileData = await readFileAsDataUrl(selectedFile)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo leer el archivo seleccionado')
      setIsSaving(false)
      return
    }

    const { data: nextNumber, error: nextNumberError } = await supabase.rpc('obtener_siguiente_nro_exp')
    if (nextNumberError || !Number.isInteger(nextNumber)) {
      console.error('Error obteniendo número de expediente:', nextNumberError)
      notify('No se pudo obtener el número de expediente. Intente nuevamente.')
      setIsSaving(false)
      return
    }

    const currentYear = new Date().getFullYear()
    const nextId = `EXP-${currentYear}-${String(nextNumber).padStart(5, '0')}`
    const fechaIngreso = String(data.get('fechaIngreso') || '')
    const fechaFormateada = formatDate(fechaIngreso)
    const remitente = String(data.get('remitente') || '').trim()
    const tipoDocumento = String(data.get('tipoDocumento') || '')
    const numeroDocumento = String(data.get('numeroDocumento') || '')

    const newExpediente: Expediente = {
      id: '', nroExp: String(nextNumber), fechaIngreso: fechaFormateada, remitente,
      remitenteNombre: remitente, remitenteCargo: String(data.get('cargoRemitente') || '').trim(),
      documento: `${tipoDocumento} ${numeroDocumento}`.trim(),
      representante: String(data.get('representante') || ''),
      cargoRepresentante: String(data.get('cargoRepresentante') || ''),
      tipo: String(data.get('tipo') || ''), asunto: String(data.get('asunto') || ''),
      contenido: String(data.get('contenido') || ''), area: '', areaDestino: '', estado: 'Pendiente',
      fecha: fechaFormateada, plazo: addDays(fechaIngreso, 7),
      prioridad: String(data.get('prioridad') || 'Normal') as 'Normal' | 'Alta',
      archivo: selectedFile.name || 'Sin adjunto', archivoData: fileData,
      archivoTipo: selectedFile.type || 'application/octet-stream', archivoTamano: selectedFile.size,
      archivoDescripcion: String(data.get('archivoDescripcion') || '').trim(),
      documentos: String(data.get('documentos') || ''),
      modalidadRecepcion: String(data.get('canalRecepcion') || ''), entregadoA: '',
      documentoSeguimiento: String(data.get('documentoSeguimiento') || 'Pendiente'),
      canalRecepcion: String(data.get('canalRecepcion') || ''),
      folios: Number(data.get('folios') || 1), anexos: Number(data.get('anexos') || 0),
      direccion: String(data.get('direccion') || ''), correo: String(data.get('correo') || ''),
      celular: String(data.get('celular') || ''),
      usuarioRegistro: `${currentUser.nombre} - ${currentUser.area || ''}`,
      fechaHoraRecepcion: new Date().toISOString(),
      constanciaRecepcion: `Cargo generado para ${nextId}`
    }

    const { data: insertedData, error } = await supabase.from('mesa_partes_2026').insert({
      nro_exp: newExpediente.nroExp, fecha_ingreso: fechaIngreso, nombre_apellido: newExpediente.remitente,
      remitente: newExpediente.remitente, remitente_nombre: newExpediente.remitenteNombre,
      remitente_cargo: newExpediente.remitenteCargo, documento: newExpediente.documento,
      tipo: newExpediente.tipo, asunto: newExpediente.asunto, contenido: newExpediente.contenido,
      area: newExpediente.area, area_destino: newExpediente.areaDestino, estado: newExpediente.estado,
      fecha: fechaIngreso, plazo: newExpediente.plazo, prioridad: newExpediente.prioridad,
      archivo: newExpediente.archivo, archivo_data: newExpediente.archivoData,
      archivo_tipo: newExpediente.archivoTipo, archivo_tamano: newExpediente.archivoTamano,
      archivo_descripcion: newExpediente.archivoDescripcion, documentos: newExpediente.documentos,
      modalidad_recepcion: newExpediente.modalidadRecepcion, entregado_a: newExpediente.entregadoA,
      documento_seguimiento: newExpediente.documentoSeguimiento, canal_recepcion: newExpediente.canalRecepcion,
      folios: newExpediente.folios, anexos: newExpediente.anexos, direccion: newExpediente.direccion,
      correo: newExpediente.correo, celular: newExpediente.celular, representante: newExpediente.representante,
      cargo_representante: newExpediente.cargoRepresentante, usuario_registro: newExpediente.usuarioRegistro,
      fecha_hora_recepcion: newExpediente.fechaHoraRecepcion, constancia_recepcion: newExpediente.constanciaRecepcion,
      historial: newExpediente.historial
    }).select().single()

    if (error) {
      console.error('Error insertando expediente:', error)
      notify(`No se pudo registrar el expediente: ${error.message}`)
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    const expedienteInsertado = insertedData ? normalizeExpediente({ ...newExpediente, id: String(insertedData.id), nroExp: String(insertedData.nro_exp || newExpediente.nroExp) }) : newExpediente
    setExpedientes(prev => [expedienteInsertado, ...prev])
    form.reset()
    setView('expedientes')
    notify(`Expediente ${nextId} registrado correctamente`)
  }

  const deriveExpediente = (id: string, targetArea: string) => {
    if (!userPermissions?.puedeDerivar) { notify('No tiene permisos para derivar expedientes'); return }
    if (!targetArea) { notify('Seleccione el área de destino antes de derivar'); return }
    const expediente = expedientes.find(e => e.id === id)
    if (!expediente) { notify('Expediente no encontrado'); return }

    setMemoNro(''); setMemoFecha(todayInputValue()); setMemoDestinatario(''); setMemoSecretaria(''); setMemoAsunto(expediente.asunto || '')
    setPendingAction({ type: 'derive', id, area: targetArea })
  }

  const confirmDerive = async () => {
    if (!pendingAction || pendingAction.type !== 'derive' || !pendingAction.area || !currentUser) return
    const { id, area: targetArea } = pendingAction
    const expediente = expedientes.find(e => e.id === id)
    if (!expediente) { notify('Expediente no encontrado'); return }

    if (!memoNro.trim() || !memoFecha || !memoDestinatario.trim() || !memoAsunto.trim() || !memoSecretaria.trim()) {
      notify('Complete todos los campos obligatorios del Memo'); return
    }
    const expedienteId = Number(expediente.id)
    if (!Number.isInteger(expedienteId)) { notify('ID de expediente inválido'); return }

    const timestamp = new Date().toLocaleString('es-PE')
    const historial = [
      ...(expediente.historial || []),
      {
        fechaHora: timestamp, fechaSalida: timestamp, fechaIngreso: timestamp,
        areaOrigen: 'Mesa de Partes', areaDestino: targetArea,
        accion: `Memo ${memoNro.trim()} generado`,
        observacion: `Se generó el Memo ${memoNro.trim()} para derivar el expediente a ${targetArea}.`,
        responsable: `${currentUser.nombre} - ${currentUser.area || ''}`
      }
    ]

    const { data: memoCreado, error: memoError } = await supabase.from('memos').insert({
      nro_memo: memoNro.trim(), expediente_id: expedienteId, nro_expediente: expediente.nroExp,
      fecha: memoFecha, destinatario: memoDestinatario.trim(), asunto: memoAsunto.trim(),
      secretaria: memoSecretaria.trim(),
      area_destino: targetArea,
      responsable: '',
      cargo: '',
      recepcionado_por: '',
      fecha_recepcion: null,
      estado: 'Pendiente'
    }).select().single()

    if (memoError) {
      console.error('Error creando Memo:', memoError)
      notify(`No se pudo crear el Memo: ${memoError.message}`)
      return
    }

    const { error: expedienteError } = await supabase.from('mesa_partes_2026').update({
      estado: 'Pendiente',area: targetArea, area_destino: targetArea,
      entregado_a: '', documento_seguimiento: memoNro.trim(), historial
    }).eq('id', id)

    if (expedienteError) {
      console.error('Error actualizando expediente:', expedienteError)
      if (memoCreado?.id) await supabase.from('memos').delete().eq('id', memoCreado.id)
      notify(`No se pudo derivar el expediente: ${expedienteError.message}`)
      return
    }

    if (memoCreado) {
      const nuevoMemo: Memo = {

        id: String(memoCreado.id),
        nroMemo: memoCreado.nro_memo || memoNro.trim(),

        expedienteId: String(memoCreado.expediente_id),
        nroExpediente: memoCreado.nro_expediente || expediente.nroExp,

        fecha: memoCreado.fecha || memoFecha,
        destinatario: memoCreado.destinatario || memoDestinatario.trim(),

        asunto: memoCreado.asunto || memoAsunto.trim(),
        secretaria: memoCreado.secretaria || memoSecretaria.trim(),

        areaDestino: memoCreado.area_destino || targetArea,

        responsable: memoCreado.responsable || '',
        cargo: memoCreado.cargo || '',

        instruccion: memoCreado.instruccion || '',
        plazo: memoCreado.plazo || '',

        recepcionadoPor: memoCreado.recepcionado_por || '',
        fechaRecepcion: memoCreado.fecha_recepcion || '',

        estado: memoCreado.estado || 'Pendiente',

        createdAt: memoCreado.created_at
      }
      setMemos(prev => [nuevoMemo, ...prev])
    }

    setExpedientes(prev => prev.map(item => item.id === id ? {
      ...item,
      estado: 'Pendiente',
      area: targetArea,
      areaDestino: targetArea,
      entregadoA: '',
      documentoSeguimiento: memoNro.trim(),
      historial
    } : item))

    notify(`Memo ${memoNro.trim()} creado y expediente derivado al área ${targetArea}`)
    setMemoNro(''); setMemoFecha(todayInputValue()); setMemoDestinatario(''); setMemoAsunto(''); setMemoSecretaria('')
    setPendingAction(null)
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
    setMemoDestinatario('')
    setMemoAsunto(expediente.asunto || '')
    setMemoSecretaria('')
    setMemoAreaDestino('')
    setMemoResponsable('')
    setMemoCargo('')
    setMemoInstruccion('')
    setMemoPlazo('')

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
  setMemoDestinatario('')
  setMemoAsunto(memoExpediente?.asunto || '')
  setMemoSecretaria('')
  setMemoAreaDestino('')
  setMemoResponsable('')
  setMemoCargo('')
  setMemoInstruccion('')
  setMemoPlazo('')

  setMemoExpediente(null)
  setShowMemoSelector(true)
  setShowMemoForm(false)
}

  const cancelNewMemo = () => setShowMemoForm(false)

  const saveNewMemo = async () => {
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

  if (!memoPlazo.trim()) {
    notify('Ingrese el plazo del Memo')
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

    const { data, error } = await supabase.rpc('registrar_memo', {
      p_expediente_id: expedienteId,
      p_nro_expediente: nroExpediente,
      p_fecha: memoFecha,
      p_destinatario: memoDestinatario.trim(),
      p_asunto: memoAsunto.trim(),
      p_secretaria: memoSecretaria.trim(),
      p_area_destino: memoAreaDestino.trim(),
      p_responsable: memoResponsable.trim(),
      p_cargo: memoCargo.trim(),
      p_instruccion: memoInstruccion.trim(),
      p_plazo: memoPlazo.trim()
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
        destinatario: data.destinatario || '',
        asunto: data.asunto || '',
        secretaria: data.secretaria || '',
        areaDestino: data.area_destino || '',
        responsable: data.responsable || '',
        cargo: data.cargo || '',
        instruccion: data.instruccion || '',
        plazo: data.plazo || '',
        recepcionadoPor: data.recepcionado_por || '',
        fechaRecepcion: data.fecha_recepcion || '',
        estado: data.estado || 'Pendiente',
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
          documento_seguimiento: memoNuevo.nroMemo,
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
            ? {
                ...item,
                area: memoAreaDestino.trim(),
                areaDestino: memoAreaDestino.trim(),
                entregadoA: '',
                documentoSeguimiento: memoNuevo.nroMemo,
                historial: nuevoHistorial
              }
            : item
        )
      )


      setMemoNro('')
      setMemoFecha(todayInputValue())
      setMemoDestinatario('')
      setMemoAsunto('')
      setMemoSecretaria('')
      setMemoAreaDestino('')
      setMemoResponsable('')
      setMemoCargo('')
      setMemoInstruccion('')
      setMemoPlazo('')

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
// =========================================================
// PRUEBA TEMPORAL DE ARCHIVADO AUTOMÁTICO
// =========================================================

const simularArchivadoMemo = async (memoId: string) => {
  try {
    const memo = memos.find(
      item => item.id === memoId
    )

    if (!memo) {
      notify('Memo no encontrado')
      return
    }

    if (memo.estado !== 'Sin respuesta') {
      notify(
        'El Memo debe estar en "Sin respuesta" para realizar la prueba'
      )
      return
    }

    const fechaPrueba = new Date()

    fechaPrueba.setDate(
      fechaPrueba.getDate() - 30
    )

    const fechaSinRespuesta =
      fechaPrueba.toISOString().split('T')[0]

    const { error } = await supabase
      .from('mesa_partes_2026')
      .update({
        fecha_sin_respuesta: fechaSinRespuesta
      })
      .eq('id', Number(memo.expedienteId))

    if (error) {
      console.error(
        'Error preparando prueba de archivado:',
        error
      )

      notify(
        `No se pudo preparar la prueba: ${error.message}`
      )

      return
    }

    setExpedientes(prev =>
      prev.map(item =>
        item.id === memo.expedienteId
          ? {
              ...item,
              fechaSinRespuesta
            }
          : item
      )
    )

    notify(
      `Prueba preparada: fecha de Sin respuesta establecida en ${fechaSinRespuesta}`
    )

  } catch (error) {
    console.error(
      'Error inesperado preparando la prueba:',
      error
    )

    notify(
      'Ocurrió un error preparando la prueba'
    )
  }
}
  const cancelPendingAction = () => setPendingAction(null)

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
          <div className="user-mini" onClick={() => setShowProfile(!showProfile)} role="button" tabIndex={0}>
            <div className="avatar">{currentUser.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
            <div><b>{currentUser.nombre}</b><small>{currentUser.rol === 'MesaPartes' ? 'Mesa de Partes' : currentUser.rol}</small></div>
            <span>⋮</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar portal-bar">
          <div className="portal-brand">
            <div className="portal-mark">MP</div>
            <strong>Mesa de Partes Virtual</strong>
          </div>
          <nav className="portal-links">
            <button
              className={view === 'nuevo' ? 'selected' : ''}
              onClick={() => setView('nuevo')}
            >
              Registro de Expediente
            </button>

            <button
              className={view === 'expedientes' ? 'selected' : ''}
              onClick={() => setView('expedientes')}
            >
              Consulta de Expedientes
            </button>

            <button
              className={view === 'memos' ? 'selected' : ''}
              onClick={() => {
                setMemoExpediente(null)
                setShowMemoForm(false)
                setShowMemoSelector(false)
                setView('memos')
              }}
            >
              Memos
            </button>

            <button
              className={view === 'reportes' ? 'selected' : ''}
              onClick={() => setView('reportes')}
            >
              Reportes
            </button>

            <button
              className={view === 'inicio' ? 'selected' : ''}
              onClick={() => setView('inicio')}
            >
              Inicio
            </button>
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
                <button onClick={() => { notify('Configuración disponible en versión completa'); setShowProfile(false) }}>Configuración</button>
                <button onClick={() => { setCurrentUser(null); setShowProfile(false); notify('Sesión cerrada correctamente') }}>Cerrar sesión</button>
              </div>
            )}
          </div>
        </header>

        <div className="page">
          {loadingDb ? (
            <div className="empty-state">Cargando expedientes desde Supabase...</div>
          ) : (
            <>
              {view === 'inicio' && <DashboardView expedientes={expedientes} onNew={() => setView('nuevo')} onViewAll={() => setView('expedientes')} currentDate={currentDate} />}
              {view === 'expedientes' && (
                <ExpedientesView
                  items={filteredExpedientes} query={query} setQuery={setQuery} areaFilter={areaFilter}
                  areaOptions={areaOptions} setAreaFilter={setAreaFilter} remitenteFilter={remitenteFilter}
                  setRemitenteFilter={setRemitenteFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                  onNew={() => setView('nuevo')}
                  onOpenDocumentType={openDocumentType}
                  expedienteDocumentos={expedienteDocumentos}
                  onTracking={setTrackingId}

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
              onSimularArchivadoMemo={simularArchivadoMemo}
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
    memoDestinatario={memoDestinatario}
    setMemoDestinatario={setMemoDestinatario}
    memoAsunto={memoAsunto}
    setMemoAsunto={setMemoAsunto}
    memoSecretaria={memoSecretaria}
    setMemoSecretaria={setMemoSecretaria}
    memoAreaDestino={memoAreaDestino}
    setMemoAreaDestino={setMemoAreaDestino}
    memoInstruccion={memoInstruccion}
    setMemoInstruccion={setMemoInstruccion}
    memoPlazo={memoPlazo}
    setMemoPlazo={setMemoPlazo}
    onSaveMemo={saveNewMemo}
    onCancelMemo={cancelNewMemo}
    onSelectExpediente={(expediente) => {
      setMemoExpediente(expediente)

      if (expediente) {
        setMemoNro('')
        setMemoFecha(todayInputValue())
        setMemoDestinatario('')
        setMemoAsunto(expediente.asunto || '')
        setMemoSecretaria('')
        setMemoAreaDestino('')
        setMemoResponsable('')
        setMemoCargo('')
        setMemoInstruccion('')
        setMemoPlazo('')
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
              {view === 'nuevo' && <NewExpedienteView onSubmit={addExpediente} onCancel={() => setView('inicio')} isSaving={isSaving} />}
              {view === 'reportes' && <ReportsView expedientes={expedientes} notify={notify} />}
            </>
          )}
        </div>
      </main>

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {trackingId && <TrackingModal item={expedientes.find(item => item.id === trackingId)} onClose={() => setTrackingId(null)} />}

      {pendingAction && (
        <div className="modal-backdrop" role="presentation" onClick={cancelPendingAction}>
          <section className="confirmation-modal" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
            <div className="confirmation-header">
              <h2>{pendingAction.type === 'derive' ? 'Crear Memo y derivar expediente' : 'Confirmar acción'}</h2>
              <button className="modal-close" onClick={cancelPendingAction} aria-label="Cerrar">×</button>
            </div>
            <div className="confirmation-body">
              {pendingAction.type === 'derive' ? (
                <>
                  <p>Complete los datos del Memo para derivar este expediente.</p>
                  <p className="confirmation-detail"><strong>Área destino:</strong> {pendingAction.area}</p>
                  <p className="confirmation-detail"><strong>Responsable:</strong> {pendingAction.area ? AREA_RESPONSABLES[pendingAction.area] || pendingAction.area : 'No asignado'}</p>
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label>Número de Memo *</label>
                    <input type="text" value={memoNro} onChange={event => setMemoNro(event.target.value)} placeholder="Ej. MEMO-001-2026" />
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label>Fecha del Memo *</label>
                    <input type="date" value={memoFecha} onChange={event => setMemoFecha(event.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label>Destinatario *</label>
                    <input type="text" value={memoDestinatario} onChange={event => setMemoDestinatario(event.target.value)} placeholder="Nombre del destinatario" />
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label>Secretaría *</label>
                    <input type="text" value={memoSecretaria} onChange={event => setMemoSecretaria(event.target.value)} placeholder="Secretaría responsable" />
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label>Asunto del Memo *</label>
                    <textarea value={memoAsunto} onChange={event => setMemoAsunto(event.target.value)} placeholder="Ingrese el asunto del Memo" rows={3} />
                  </div>
                  <p className="confirmation-detail" style={{ marginTop: '16px' }}>El Memo se guardará vinculado a este expediente y quedará registrado en su seguimiento.</p>
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
              <button
                className="primary-button"
                onClick={() => {
                  if (pendingAction.type === 'derive') {
                    confirmDerive()
                  }
                }}
>
                {pendingAction.type === 'derive' ? '✓ Crear Memo y derivar' : '✓ Atender'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
