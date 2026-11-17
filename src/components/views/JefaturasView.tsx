import { FormEvent, useMemo, useState } from 'react'
import { LoaderCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import Modal from '../common/Modal'
import IconAction from '../common/IconAction'
import { useAreasCatalog } from '../../constants'
import { normalizeAreaText, type AreaResponsableRow } from '../../constants/areasCatalog'
import {
  eliminarAreaResponsable,
  guardarAreaResponsable
} from '../../services/areasResponsablesService'

type Props = {
  canEdit: boolean
  notify: (message: string) => void
}

type FormState = {
  /** Con valor al editar; vacío al crear */
  id?: number
  tipo: 'area' | 'subarea'
  area: string
  subarea: string
  responsable: string
}

type Grupo = {
  area: AreaResponsableRow
  subareas: AreaResponsableRow[]
}

const formatFecha = (value: string | null) => {
  if (!value) return '—'
  const fecha = new Date(value)
  return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleDateString('es-PE')
}

const mensajeDeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : (error as { message?: string })?.message
  return message || 'No se pudo guardar el cambio. Intente nuevamente.'
}

export default function JefaturasView({ canEdit, notify }: Props) {
  const catalog = useAreasCatalog()
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const grupos = useMemo<Grupo[]>(() => {
    const areas = catalog.rows.filter(row => !row.subarea)
    return areas.map(area => ({
      area,
      subareas: catalog.rows.filter(
        row => row.subarea && normalizeAreaText(row.area) === normalizeAreaText(area.area)
      )
    }))
  }, [catalog])

  const gruposVisibles = useMemo(() => {
    const texto = normalizeAreaText(busqueda)
    if (!texto) return grupos
    return grupos.filter(({ area, subareas }) =>
      [area.area, area.responsable, ...subareas.flatMap(item => [item.subarea ?? '', item.responsable])]
        .some(valor => normalizeAreaText(valor).includes(texto))
    )
  }, [grupos, busqueda])

  const abrirNuevaArea = () => {
    setError('')
    setForm({ tipo: 'area', area: '', subarea: '', responsable: '' })
  }

  const abrirNuevaSubarea = (area = '') => {
    setError('')
    setForm({ tipo: 'subarea', area, subarea: '', responsable: '' })
  }

  const abrirEdicion = (row: AreaResponsableRow) => {
    setError('')
    setForm({
      id: row.id,
      tipo: row.subarea ? 'subarea' : 'area',
      area: row.area,
      subarea: row.subarea ?? '',
      responsable: row.responsable
    })
  }

  const cerrarFormulario = () => {
    if (guardando) return
    setForm(null)
    setError('')
  }

  const guardar = async (event: FormEvent) => {
    event.preventDefault()
    if (!form || guardando) return

    const esSubarea = form.tipo === 'subarea'
    const nombreArea = form.area.trim()
    const nombreSubarea = form.subarea.trim()
    const responsable = form.responsable.trim()

    if (!nombreArea) {
      setError(esSubarea ? 'Seleccione el área a la que pertenece la subárea.' : 'Escriba el nombre del área.')
      return
    }
    if (esSubarea && !nombreSubarea) {
      setError('Escriba el nombre de la subárea.')
      return
    }
    if (!responsable) {
      setError(esSubarea ? 'Escriba la persona que recibe la copia.' : 'Escriba el nombre del jefe del área.')
      return
    }

    setGuardando(true)
    setError('')
    try {
      await guardarAreaResponsable({
        id: form.id,
        area: nombreArea,
        subarea: esSubarea ? nombreSubarea : null,
        responsable
      })
      notify(form.id ? 'Cambios guardados correctamente' : esSubarea ? 'Subárea agregada correctamente' : 'Área agregada correctamente')
      setForm(null)
    } catch (err) {
      console.error('Error guardando jefatura:', err)
      setError(mensajeDeError(err))
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (row: AreaResponsableRow) => {
    const nombre = row.subarea ? `la subárea "${row.subarea}"` : `el área "${row.area}"`
    if (!window.confirm(`¿Eliminar ${nombre}? Los documentos ya registrados no se modifican. Seleccione Sí para confirmar o No para cancelar.`)) return
    try {
      await eliminarAreaResponsable(row.id)
      notify(`${row.subarea ? 'Subárea eliminada' : 'Área eliminada'} correctamente`)
    } catch (err) {
      console.error('Error eliminando jefatura:', err)
      notify(mensajeDeError(err))
    }
  }

  const editando = form?.id !== undefined
  const esSubarea = form?.tipo === 'subarea'
  const areasDisponibles = grupos.map(grupo => grupo.area.area)
  const tituloFormulario = editando
    ? (esSubarea ? 'Editar subárea' : 'Editar área')
    : (esSubarea ? 'Nueva subárea' : 'Nueva área')

  return (
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">CONFIGURACIÓN</p>
          <h1>Jefaturas</h1>
          <p className="muted">
            Actualice los jefes de cada área y las subáreas cuando cambien las jefaturas.
            Los documentos ya emitidos conservan el nombre con el que se registraron.
          </p>
        </div>

        {canEdit && catalog.loaded && (
          <div className="memo-heading-actions jefaturas-heading-actions">
            <button type="button" className="primary-button" onClick={abrirNuevaArea}>
              ＋ Nueva área
            </button>
            <button type="button" className="jefaturas-secondary-button" onClick={() => abrirNuevaSubarea()}>
              ＋ Nueva subárea
            </button>
          </div>
        )}
      </div>

      {!catalog.loaded ? (
        <section className="panel list-panel">
          <div className="empty-state">
            <b>La lista de jefaturas todavía no está disponible para editar.</b>
            <br />
            Ejecute el archivo <code>supabase/patches/20261112_areas_responsables.sql</code> en
            el SQL Editor de Supabase y vuelva a cargar esta página. Mientras tanto, la aplicación
            usa los nombres anteriores.
          </div>
        </section>
      ) : (
        <section className="panel list-panel">
          <div className="toolbar">
            <div className="search-box">
              <Search size={16} aria-hidden="true" />
              <input
                value={busqueda}
                onChange={event => setBusqueda(event.target.value)}
                placeholder="Buscar por área, subárea o nombre del jefe..."
                aria-label="Buscar jefaturas"
              />
            </div>
            <span className="result-count">{gruposVisibles.length} áreas</span>
          </div>

          <div className="table-wrap">
            <table className="data-table jefaturas-table">
              <caption className="sr-only">Áreas, jefes y subáreas</caption>
              <thead>
                <tr>
                  <th scope="col">ÁREA / SUBÁREA</th>
                  <th scope="col">JEFE O RESPONSABLE</th>
                  <th scope="col">ACTUALIZADO</th>
                  <th scope="col">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {gruposVisibles.flatMap(({ area, subareas }) => [
                  <tr key={`area-${area.id}`} className="jefatura-area-row">
                    <td data-label="ÁREA"><b>{area.area}</b></td>
                    <td data-label="JEFE">{area.responsable}</td>
                    <td data-label="ACTUALIZADO">{formatFecha(area.actualizadoEn)}</td>
                    <td className="col-acciones" data-label="ACCIONES">
                      {canEdit && (
                        <div className="table-actions">
                          <IconAction label="Editar" icon={Pencil} onClick={() => abrirEdicion(area)} />
                          <IconAction label="Agregar subárea" icon={Plus} onClick={() => abrirNuevaSubarea(area.area)} />
                          <IconAction label="Eliminar" icon={Trash2} tone="danger" onClick={() => void eliminar(area)} />
                        </div>
                      )}
                    </td>
                  </tr>,
                  ...subareas.map(subarea => (
                    <tr key={`subarea-${subarea.id}`} className="jefatura-subarea-row">
                      <td data-label="SUBÁREA">
                        <span className="jefatura-subarea-name">↳ {subarea.subarea}</span>
                        <small className="jefatura-subarea-note">Subárea de {area.area}</small>
                      </td>
                      <td data-label="RECIBE COPIA">
                        {subarea.responsable}
                        <small className="jefatura-subarea-note">Recibe copia de los documentos</small>
                      </td>
                      <td data-label="ACTUALIZADO">{formatFecha(subarea.actualizadoEn)}</td>
                      <td className="col-acciones" data-label="ACCIONES">
                        {canEdit && (
                          <div className="table-actions">
                            <IconAction label="Editar" icon={Pencil} onClick={() => abrirEdicion(subarea)} />
                            <IconAction label="Eliminar" icon={Trash2} tone="danger" onClick={() => void eliminar(subarea)} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ])}
              </tbody>
            </table>

            {gruposVisibles.length === 0 && (
              <div className="empty-state">
                {busqueda ? 'No se encontraron áreas con esos criterios.' : 'No hay áreas registradas.'}
              </div>
            )}
          </div>
        </section>
      )}

      {form && (
        <Modal
          titleId="jefatura-form-title"
          onClose={cerrarFormulario}
          className="memo-modal jefaturas-modal"
          overlayClassName="memo-modal-overlay"
        >
          <form onSubmit={guardar}>
            <div className="memo-modal-header">
              <div>
                <p className="eyebrow">JEFATURAS</p>
                <h2 id="jefatura-form-title">{tituloFormulario}</h2>
                <p>
                  {esSubarea
                    ? 'La persona indicada recibirá la copia de los documentos enviados a esta subárea.'
                    : 'El nombre del jefe aparecerá como responsable en los documentos nuevos.'}
                </p>
              </div>
              <button
                type="button"
                className="memo-modal-close"
                onClick={cerrarFormulario}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="memo-modal-body">
              <div className="form-grid jefaturas-form-grid">
                {esSubarea ? (
                  <>
                    <label className="wide">
                      Área a la que pertenece
                      <select
                        value={form.area}
                        onChange={event => setForm({ ...form, area: event.target.value })}
                        disabled={editando}
                      >
                        <option value="">Seleccione un área</option>
                        {areasDisponibles.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </label>
                    <label className="wide">
                      Nombre de la subárea
                      <input
                        value={form.subarea}
                        onChange={event => setForm({ ...form, subarea: event.target.value })}
                        placeholder="Ej.: Tesorería"
                        maxLength={120}
                      />
                    </label>
                  </>
                ) : (
                  <label className="wide">
                    Nombre del área
                    <input
                      value={form.area}
                      onChange={event => setForm({ ...form, area: event.target.value })}
                      placeholder="Ej.: Unidad de Investigación"
                      maxLength={120}
                    />
                  </label>
                )}

                <label className="wide">
                  {esSubarea ? 'Persona que recibe la copia' : 'Jefe del área'}
                  <input
                    value={form.responsable}
                    onChange={event => setForm({ ...form, responsable: event.target.value })}
                    placeholder="Ej.: Ing. Juan Pérez Soto"
                    maxLength={160}
                  />
                </label>
              </div>

              {error && <p className="jefaturas-form-error" role="alert">{error}</p>}
            </div>

            <div className="memo-modal-footer">
              <button type="button" className="legacy-light-button" onClick={cerrarFormulario} disabled={guardando}>
                Cancelar
              </button>
              <button type="submit" className="primary-button" disabled={guardando}>
                {guardando
                  ? <><LoaderCircle className="button-spinner" size={16} aria-hidden="true" /> Guardando...</>
                  : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
