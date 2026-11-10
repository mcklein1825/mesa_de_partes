import { FormEvent, useMemo, useState } from 'react'
import { MEMORANDOS_MULTIPLES_DESTINATARIOS } from '../../constants'
import type {
  MemorandoMultiple,
  MemorandoMultipleCategoria,
  MemorandoMultipleMedio
} from '../../types'
import { createMemorandoMultiple } from '../../services/memorandosMultiplesService'
import { LoaderCircle, Search } from 'lucide-react'
import Modal from '../common/Modal'
import ExpedienteSelector from '../common/ExpedienteSelector'
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
  notify
}: {
  memorandos: MemorandoMultiple[]
  expedientes: Expediente[]
  canCreate: boolean
  onCreated: (memo: MemorandoMultiple) => void
  notify: (message: string) => void
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

  const opciones = useMemo(
    () => MEMORANDOS_MULTIPLES_DESTINATARIOS.filter(item =>
    item.categoria === categoria
    ),
    [categoria]
  )

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

    setGuardando(true)
    try {
      const creado = await createMemorandoMultiple({
        expedienteId: expediente?.id || '',
        nroExpediente: expediente?.nroExp || '',
        fecha,
        asunto: asunto.trim(),
        destinatarios: seleccionados
      })
      onCreated(creado)
      setAsunto('')
      setExpediente(null)
      setSeleccionados([])
      setShowForm(false)
      notify('Memorando múltiple registrado correctamente')
    } catch (error) {
      console.error('Error registrando memorando múltiple:', error)
      notify('No se pudo registrar el memorando múltiple')
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
          <button className="primary-button" type="button" onClick={() => setShowForm(!showForm)}>
            ＋ Nuevo memorando múltiple
          </button>
        )}
      </div>

      {showForm && (
        <Modal
          titleId="nuevo-memorando-multiple-title"
          onClose={() => setShowForm(false)}
          className="memo-modal multiple-memo-modal"
          overlayClassName="memo-modal-overlay"
        >
        <section className="multiple-memo-form">
          <div className="panel-header">
            <div><h2 id="nuevo-memorando-multiple-title">Registrar memorando múltiple</h2><p>Relacione el documento con un expediente y agregue cada destinatario.</p></div>
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
            <div className="form-actions">
              <button className="legacy-light-button" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="primary-button" type="submit" disabled={guardando}>
                {guardando ? (
                  <><LoaderCircle className="button-spinner" size={16} aria-hidden="true" /> Guardando...</>
                ) : (
                  'Registrar memorando'
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
            <thead><tr><th scope="col">N.° REGISTRO</th><th scope="col">EXPEDIENTE</th><th scope="col">FECHA</th><th scope="col">ASUNTO</th><th scope="col">DESTINATARIOS</th><th scope="col">MEDIOS</th><th scope="col">REALIZADO POR</th></tr></thead>
            <tbody>{visibles.map(item => <tr key={item.id}>
              <td data-label="N.° REGISTRO"><b className="exp-id">{item.nroRegistro}</b></td>
              <td data-label="EXPEDIENTE"><b className="exp-id">{item.nroExpediente}</b></td>
              <td data-label="FECHA">{new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-PE')}</td>
              <td data-label="ASUNTO">{item.asunto}</td>
              <td data-label="DESTINATARIOS">{item.destinatarios.map(destinatario => <div key={destinatario.id}>{destinatario.nombre}</div>)}</td>
              <td data-label="MEDIOS">{item.destinatarios.map(destinatario => <div key={destinatario.id}>{destinatario.medioEntrega}</div>)}</td>
              <td data-label="REALIZADO POR">{item.realizadoPor}</td>
            </tr>)}</tbody>
          </table>
          {visibles.length === 0 && <div className="empty-state">No hay memorandos múltiples registrados.</div>}
        </div>
      </section>
    </>
  )
}
