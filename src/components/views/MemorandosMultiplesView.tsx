import { FormEvent, useEffect, useMemo, useState } from 'react'
import IconAction from '../common/IconAction'
import { getMemorandosMultiplesDestinatarios, useAreasCatalog } from '../../constants'
import type {
  MemorandoMultiple,
  MemorandoMultipleCategoria,
  MemorandoMultipleMedio
} from '../../types'
import { createMemorandoMultiple, mapMemorandoMultiple } from '../../services/memorandosMultiplesService'
import { updateMemorandoMultiple } from '../../services/documentCrudService'
import { Copy, FileUp, LoaderCircle, Pencil, Search, Trash2 } from 'lucide-react'
import DuplicateDocumentModal from '../modals/DuplicateDocumentModal'
import Modal from '../common/Modal'
import ExpedienteSelector from '../common/ExpedienteSelector'
import MemoDocumentLink from '../common/MemoDocumentLink'
import { MAX_ADJUNTO_BYTES, dataUrlToFile, getSupportedDocumentMimeType } from '../../utils/expedienteHelpers'
import type { Expediente } from '../../types'

const categorias: Array<MemorandoMultipleCategoria | 'Todas'> = [
  'Todas',
  'Área / Jefatura',
  'Consejo Directivo',
  'Comité',
  'Grupo institucional'
]

export default function MemorandosMultiplesView({
  memorandos,
  expedientes,
  canCreate,
  onCreated,
  notify,
  onDelete
  , memoParaEditar
  , onEditComplete
  , onEdit
  , onCancelEdit
}: {
  memorandos: MemorandoMultiple[]
  expedientes: Expediente[]
  canCreate: boolean
  onCreated: (memo: MemorandoMultiple) => void
  notify: (message: string) => void
  onDelete: (memo: MemorandoMultiple) => void
  memoParaEditar: MemorandoMultiple | null
  onEditComplete: (memo: MemorandoMultiple) => void
  onEdit: (memo: MemorandoMultiple) => void
  /** Avisa que se cerró el formulario sin guardar una edición */
  onCancelEdit?: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [expediente, setExpediente] = useState<Expediente | null>(null)
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [asunto, setAsunto] = useState('')
  const [categoria, setCategoria] = useState<MemorandoMultipleCategoria>('Área / Jefatura')
  const [nombre, setNombre] = useState('')
  const [medio, setMedio] = useState<MemorandoMultipleMedio>('Correo')
  const [seleccionados, setSeleccionados] = useState<Array<{
    categoria: MemorandoMultipleCategoria
    nombre: string
    medioEntrega: MemorandoMultipleMedio
  }>>([])
  const [filtro, setFiltro] = useState<MemorandoMultipleCategoria | 'Todas'>('Todas')
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [memoParaDuplicar, setMemoParaDuplicar] = useState<MemorandoMultiple | null>(null)
  useEffect(() => {
    if (!memoParaEditar) return
    setArchivo(null)
    setExpediente(expedientes.find(item => item.id === memoParaEditar.expedienteId) || null)
    setFecha(memoParaEditar.fecha)
    setAsunto(memoParaEditar.asunto)
    setSeleccionados(memoParaEditar.destinatarios.map(item => ({
      categoria: item.categoria,
      nombre: item.nombre,
      medioEntrega: item.medioEntrega
    })))
    setShowForm(true)
  }, [memoParaEditar, expedientes])

  const areasCatalog = useAreasCatalog()
  const opciones = useMemo(
    () => getMemorandosMultiplesDestinatarios().filter(item =>
    item.categoria === categoria
    ),
    [categoria, areasCatalog]
  )

  const limpiarFormulario = () => {
    setAsunto('')
    setExpediente(null)
    setSeleccionados([])
    setArchivo(null)
    setFecha(new Date().toISOString().slice(0, 10))
  }

  const cerrarFormulario = () => {
    setShowForm(false)
    // Sin esto, una edición cancelada dejaba el registro "en edición" y el siguiente guardado lo sobrescribía.
    if (memoParaEditar) onCancelEdit?.()
    if (memoParaDuplicar) {
      setMemoParaDuplicar(null)
      limpiarFormulario()
    }
  }

  const abrirNuevo = () => {
    if (showForm) {
      cerrarFormulario()
      return
    }
    onCancelEdit?.()
    setMemoParaDuplicar(null)
    limpiarFormulario()
    setShowForm(true)
  }

  const iniciarDuplicado = (original: MemorandoMultiple) => {
    onCancelEdit?.()
    setMemoParaDuplicar(original)
    // La copia lleva los mismos destinatarios y asunto; el expediente debe elegirse de nuevo.
    setExpediente(null)
    setFecha(new Date().toISOString().slice(0, 10))
    setAsunto(original.asunto)
    setSeleccionados(original.destinatarios.map(item => ({
      categoria: item.categoria,
      nombre: item.nombre,
      medioEntrega: item.medioEntrega
    })))
    setArchivo(null)
    setShowDuplicateModal(false)
    setShowForm(true)
  }

  const agregarDestinatario = () => {
    if (!nombre || seleccionados.some(item => item.nombre === nombre)) return
    setSeleccionados(prev => [...prev, { categoria, nombre, medioEntrega: medio }])
    setNombre('')
  }

  const guardar = async (event: FormEvent) => {
    event.preventDefault()
    if (!expediente || !asunto.trim() || seleccionados.length === 0) {
      notify('Seleccione un expediente, ingrese el asunto y agregue al menos un destinatario')
      return
    }

    if (
      !archivo &&
      memoParaDuplicar?.archivoData &&
      (memoParaDuplicar.archivoTamano || 0) > MAX_ADJUNTO_BYTES
    ) {
      notify('El archivo original supera los 5 MB; seleccione un archivo válido.')
      return
    }

    setGuardando(true)
    try {
      // Al duplicar, si no se elige otro archivo se conserva el adjunto del memorando original.
      const archivoFinal =
        archivo ??
        (memoParaDuplicar?.archivoData
          ? dataUrlToFile(
              memoParaDuplicar.archivoData,
              memoParaDuplicar.archivo || 'documento',
              memoParaDuplicar.archivoTipo
            )
          : null)

      if (memoParaEditar && !memoParaDuplicar) {
        const actualizado = await updateMemorandoMultiple(memoParaEditar.id, {
          fecha,
          asunto: asunto.trim(),
          destinatarios: seleccionados,
          archivo
        })
        // Se usa lo que devolvió la base de datos: conserva el estado de cada destinatario y el adjunto.
        onEditComplete({ ...memoParaEditar, ...mapMemorandoMultiple(actualizado) })
      } else {
        const creado = await createMemorandoMultiple({
          expedienteId: expediente?.id || '',
          nroExpediente: expediente?.nroExp || '',
          fecha,
          asunto: asunto.trim(),
          destinatarios: seleccionados,
          archivo: archivoFinal
        })
        onCreated(creado)
      }
      const eraDuplicado = Boolean(memoParaDuplicar)
      limpiarFormulario()
      setMemoParaDuplicar(null)
      setShowForm(false)
      notify(
        memoParaEditar && !eraDuplicado
          ? 'Memorando múltiple actualizado correctamente'
          : eraDuplicado
            ? 'Memorando múltiple duplicado correctamente'
            : 'Memorando múltiple registrado correctamente'
      )
    } catch (error) {
      console.error('Error registrando memorando múltiple:', error)
      const detalle = (error as { message?: string } | null)?.message || ''
      if (/p_archivo|schema cache/i.test(detalle) && archivo) {
        notify('Falta ejecutar el parche 20261113_memorandos_multiples_adjunto.sql en Supabase para guardar adjuntos')
      } else if (/archivo|PDF|5 MB/i.test(detalle)) {
        notify(detalle)
      } else {
        notify('No se pudo registrar el memorando múltiple')
      }
    } finally {
      setGuardando(false)
    }
  }

  const visibles = memorandos.filter(item => {
    const texto = busqueda.toLowerCase()
    return (
      (filtro === 'Todas' || item.destinatarios.some(destinatario => destinatario.categoria === filtro)) &&
      (!texto ||
        item.asunto.toLowerCase().includes(texto) ||
        item.nroRegistro.toLowerCase().includes(texto) ||
        item.nroExpediente.toLowerCase().includes(texto))
    )
  })

  return (
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Memorandos múltiples</h1>
          <p className="muted">Un memorando, varios destinatarios y entrega independiente.</p>
        </div>
        {canCreate && (
          <div className="memo-heading-actions">
            <button className="primary-button" type="button" onClick={abrirNuevo}>
              {memoParaEditar && !memoParaDuplicar ? 'Editar memorando múltiple' : '＋ Nuevo memorando múltiple'}
            </button>
            <button className="primary-button" type="button" onClick={() => setShowDuplicateModal(true)}>
              <Copy size={16} aria-hidden="true" /> Duplicar memorando múltiple
            </button>
          </div>
        )}
      </div>

      {showDuplicateModal && (
        <DuplicateDocumentModal<MemorandoMultiple>
          titleId="duplicate-memorando-multiple-modal-title"
          title="Duplicar memorando múltiple"
          description="Busque y seleccione el memorando múltiple que desea duplicar."
          searchLabel="Buscar memorando múltiple"
          searchPlaceholder="N.º de registro, expediente, destinatario o asunto"
          items={memorandos}
          getSearchText={item => [
            item.nroRegistro,
            item.nroExpediente,
            item.asunto,
            item.realizadoPor,
            ...item.destinatarios.map(destinatario => destinatario.nombre)
          ]}
          getNumber={item => item.nroRegistro}
          getDate={item => item.fecha}
          getSubject={item => item.asunto}
          getDetails={item => [
            `Expediente: ${item.nroExpediente || 'Sin expediente'}`,
            `${item.destinatarios.length} destinatario${item.destinatarios.length === 1 ? '' : 's'}: ${item.destinatarios.map(destinatario => destinatario.nombre).join(', ')}`
          ]}
          previewTitle="Memorando múltiple que se duplicará"
          getPreview={item => [
            { label: 'N.º de registro original', value: item.nroRegistro },
            { label: 'Expediente original', value: item.nroExpediente },
            { label: 'Destinatarios', value: item.destinatarios.map(destinatario => destinatario.nombre).join(', '), wide: true },
            { label: 'Asunto', value: item.asunto, wide: true }
          ]}
          resultText="Se creará un nuevo memorando múltiple para otro expediente; el original se conservará."
          confirmLabel="Continuar con este memorando"
          emptyText="No hay memorandos múltiples disponibles para duplicar."
          noResultsText="No se encontraron memorandos múltiples con esos datos."
          onClose={() => setShowDuplicateModal(false)}
          onConfirm={iniciarDuplicado}
        />
      )}

      {showForm && (
        <Modal
          titleId="nuevo-memorando-multiple-title"
          onClose={cerrarFormulario}
          className="memo-modal multiple-memo-modal"
          overlayClassName="memo-modal-overlay"
        >
        <section className="multiple-memo-form">
          <div className="panel-header">
            <div>
              <h2 id="nuevo-memorando-multiple-title">{memoParaDuplicar ? 'Duplicar memorando múltiple' : 'Registrar memorando múltiple'}</h2>
              <p>
                {memoParaDuplicar
                  ? `Copia del memorando ${memoParaDuplicar.nroRegistro}. Elija un expediente diferente; el original se conservará y la copia recibirá su propio número.`
                  : 'Relacione el documento con un expediente y agregue cada destinatario.'}
              </p>
            </div>
          </div>
          <form onSubmit={guardar}>
            <ExpedienteSelector
              expedientes={expedientes}
              value={expediente}
              onChange={setExpediente}
              areaOptions={[]}
            />
            <div className="form-grid">
              <label>Fecha<input type="date" value={fecha} onChange={event => setFecha(event.target.value)} required /></label>
              <label className="wide">Asunto<input value={asunto} onChange={event => setAsunto(event.target.value)} required /></label>
            </div>
            <div className="multiple-recipient-picker">
              <label>Categoría<select value={categoria} onChange={event => setCategoria(event.target.value as MemorandoMultipleCategoria)}>
                {categorias.slice(1).map(item => <option key={item}>{item}</option>)}
              </select></label>
              <label>Destinatario<select value={nombre} onChange={event => setNombre(event.target.value)}>
                <option value="">Seleccione...</option>
                {opciones.map(item => <option key={item.nombre} value={item.nombre}>{item.nombre}</option>)}
              </select></label>
              <label>Entrega<select value={medio} onChange={event => setMedio(event.target.value as MemorandoMultipleMedio)}>
                <option>Correo</option><option>Presencial</option>
              </select></label>
              <button className="outline-button" type="button" onClick={agregarDestinatario}>Agregar</button>
            </div>
            {seleccionados.length > 0 && <div className="selected-recipients">
              {seleccionados.map(item => <span key={item.nombre}>{item.nombre} · {item.medioEntrega}
                <button
                  type="button"
                  aria-label={`Quitar destinatario ${item.nombre}`}
                  onClick={() => setSeleccionados(prev => prev.filter(destinatario => destinatario.nombre !== item.nombre))}
                >
                  ×
                </button>
              </span>)}
            </div>}
            <div className="form-group document-form-field multiple-memo-file">
              <label htmlFor="memorando-multiple-archivo">Adjunto (opcional)</label>
              <label className="document-form-file-button" htmlFor="memorando-multiple-archivo">
                <FileUp size={16} aria-hidden="true" />
                {memoParaEditar?.archivo || memoParaDuplicar?.archivo || archivo ? ' Cambiar archivo' : ' Seleccionar archivo'}
                <input
                  id="memorando-multiple-archivo"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={event => {
                    const file = event.target.files?.[0] || null
                    if (!file) {
                      setArchivo(null)
                      return
                    }
                    if (!getSupportedDocumentMimeType(file)) {
                      notify('Adjunte un archivo PDF, JPG, JPEG o PNG.')
                      event.target.value = ''
                      setArchivo(null)
                      return
                    }
                    if (file.size > MAX_ADJUNTO_BYTES) {
                      notify('El archivo no puede superar los 5 MB.')
                      event.target.value = ''
                      setArchivo(null)
                      return
                    }
                    setArchivo(file)
                  }}
                />
              </label>
              <small>
                {archivo
                  ? `Seleccionado: ${archivo.name}`
                  : memoParaDuplicar?.archivo
                    ? `Se conservará el archivo ${memoParaDuplicar.archivo} si no selecciona otro. Máximo 5 MB.`
                    : memoParaEditar?.archivo
                      ? `Documento actual: ${memoParaEditar.archivo}. Seleccione otro para reemplazarlo.`
                      : 'PDF o imagen JPG/PNG. Máximo 5 MB.'}
              </small>
              {archivo && (
                <button
                  type="button"
                  className="action-link"
                  onClick={() => setArchivo(null)}
                  disabled={guardando}
                >
                  Quitar archivo
                </button>
              )}
            </div>
            <div className="form-actions">
              <button className="legacy-light-button" type="button" onClick={cerrarFormulario}>Cancelar</button>
              <button className="primary-button" type="submit" disabled={guardando}>
                {guardando ? (
                  <><LoaderCircle className="button-spinner" size={16} aria-hidden="true" /> Guardando...</>
                ) : (
                  memoParaEditar ? 'Guardar cambios' : 'Registrar memorando'
                )}
              </button>
            </div>
          </form>
        </section>
        </Modal>
      )}

      <section className="panel list-panel">
        <div className="toolbar">
          <div className="search-box"><Search size={16} aria-hidden="true" /><input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar por registro o asunto..." /></div>
          <select value={filtro} onChange={event => setFiltro(event.target.value as MemorandoMultipleCategoria | 'Todas')}>
            {categorias.map(item => <option key={item}>{item}</option>)}
          </select>
          <span className="result-count">{visibles.length} resultados</span>
        </div>
        <div className="table-wrap">
          <table className="data-table memorandos-multiples-table">
            <caption className="sr-only">Listado de memorandos múltiples</caption>
            <thead><tr><th scope="col">N.° REGISTRO</th><th scope="col">EXPEDIENTE</th><th scope="col">FECHA</th><th scope="col">ASUNTO</th><th scope="col">DESTINATARIOS</th><th scope="col">MEDIOS</th><th scope="col">REALIZADO POR</th><th scope="col">DOCUMENTO</th><th scope="col">ACCIONES</th></tr></thead>
            <tbody>{visibles.map(item => <tr key={item.id}>
              <td data-label="N.° REGISTRO"><b className="exp-id">{item.nroRegistro}</b></td>
              <td data-label="EXPEDIENTE"><b className="exp-id">{item.nroExpediente}</b></td>
              <td data-label="FECHA">{new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-PE')}</td>
              <td data-label="ASUNTO">{item.asunto}</td>
              <td data-label="DESTINATARIOS">{item.destinatarios.map(destinatario => <div key={destinatario.id}>{destinatario.nombre}</div>)}</td>
              <td data-label="MEDIOS">{item.destinatarios.map(destinatario => <div key={destinatario.id}>{destinatario.medioEntrega}</div>)}</td>
              <td data-label="REALIZADO POR">{item.realizadoPor}</td>
              <td data-label="DOCUMENTO">
                <MemoDocumentLink
                  archivoData={item.archivoData}
                  archivo={item.archivo || ''}
                  documento="Memorando múltiple"
                >
                  {item.archivo || 'Sin adjunto'}
                </MemoDocumentLink>
              </td>
              <td className="col-acciones" data-label="ACCIONES">
                <div className="table-actions">
                  <IconAction label="Editar" icon={Pencil} onClick={() => onEdit(item)} />
                  <IconAction label="Eliminar" icon={Trash2} tone="danger" onClick={() => onDelete(item)} />
                </div>
              </td>
            </tr>)}</tbody>
          </table>
          {visibles.length === 0 && <div className="empty-state">No hay memorandos múltiples registrados.</div>}
        </div>
      </section>
    </>
  )
}
