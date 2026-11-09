import { FormEvent, useMemo, useState } from 'react'
import { MEMORANDOS_MULTIPLES_DESTINATARIOS } from '../../constants'
import type {
  MemorandoMultiple,
  MemorandoMultipleCategoria,
  MemorandoMultipleMedio
} from '../../types'
import { createMemorandoMultiple } from '../../services/memorandosMultiplesService'

const categorias: Array<MemorandoMultipleCategoria | 'Todas'> = [
  'Todas',
  'Área / Jefatura',
  'Consejo Directivo',
  'Comité',
  'Grupo institucional'
]

export default function MemorandosMultiplesView({
  memorandos,
  canCreate,
  onCreated,
  notify
}: {
  memorandos: MemorandoMultiple[]
  canCreate: boolean
  onCreated: (memo: MemorandoMultiple) => void
  notify: (message: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
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
      item.categoria === categoria &&
      (!busqueda || item.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    ),
    [categoria, busqueda]
  )

  const agregarDestinatario = () => {
    if (!nombre || seleccionados.some(item => item.nombre === nombre)) return
    setSeleccionados(prev => [...prev, { categoria, nombre, medioEntrega: medio }])
    setNombre('')
  }

  const guardar = async (event: FormEvent) => {
    event.preventDefault()
    if (!asunto.trim() || seleccionados.length === 0) {
      notify('Ingrese el asunto y seleccione al menos un destinatario')
      return
    }

    setGuardando(true)
    try {
      const creado = await createMemorandoMultiple({
        fecha,
        asunto: asunto.trim(),
        destinatarios: seleccionados
      })
      onCreated(creado)
      setAsunto('')
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
      (!texto || item.asunto.toLowerCase().includes(texto) || item.nroRegistro.toLowerCase().includes(texto))
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
        <section className="panel multiple-memo-form">
          <div className="panel-header">
            <div><h2>Registrar memorando múltiple</h2><p>Agregue cada destinatario y su medio de entrega.</p></div>
          </div>
          <form onSubmit={guardar}>
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
                <button type="button" onClick={() => setSeleccionados(prev => prev.filter(destinatario => destinatario.nombre !== item.nombre))}>×</button>
              </span>)}
            </div>}
            <div className="form-actions">
              <button className="legacy-light-button" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="primary-button" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar memorando'}</button>
            </div>
          </form>
        </section>
      )}

      <section className="panel list-panel">
        <div className="toolbar">
          <div className="search-box"><span>⌕</span><input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar por registro o asunto..." /></div>
          <select value={filtro} onChange={event => setFiltro(event.target.value as MemorandoMultipleCategoria | 'Todas')}>
            {categorias.map(item => <option key={item}>{item}</option>)}
          </select>
          <span className="result-count">{visibles.length} resultados</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>N.° REGISTRO</th><th>FECHA</th><th>ASUNTO</th><th>DESTINATARIOS</th><th>MEDIOS</th><th>REALIZADO POR</th></tr></thead>
            <tbody>{visibles.map(item => <tr key={item.id}>
              <td><b className="exp-id">{item.nroRegistro}</b></td>
              <td>{new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-PE')}</td>
              <td>{item.asunto}</td>
              <td>{item.destinatarios.map(destinatario => <div key={destinatario.id}>{destinatario.nombre}</div>)}</td>
              <td>{item.destinatarios.map(destinatario => <div key={destinatario.id}>{destinatario.medioEntrega}</div>)}</td>
              <td>{item.realizadoPor}</td>
            </tr>)}</tbody>
          </table>
          {visibles.length === 0 && <div className="empty-state">No hay memorandos múltiples registrados.</div>}
        </div>
      </section>
    </>
  )
}
