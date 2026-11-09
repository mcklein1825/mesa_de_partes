import { useRef, useState } from 'react'
import { Expediente } from '../../types'
import {
  AREA_DESTINO_OPTIONS,
  getAreaCopia,
  getAreaResponsable
} from '../../constants'
import ExpedienteSelector from '../common/ExpedienteSelector'
type Props = {
  expediente: Expediente | null
  expedientes: Expediente[]
  areaOptions: string[]
  onExpedienteChange: (expediente: Expediente | null) => void
  onCancelar: () => void
   onGuardar: (datos: {
    expedienteId: string
    nroExpediente: string
    fecha: string
    areaDestino: string
    responsable: string
    instruccion: string
    archivo: File | null
  }) => Promise<void>
}

export default function NuevoProveidoView({
  expediente,
  expedientes,
  areaOptions,
  onExpedienteChange,
  onCancelar,
  onGuardar
}: Props) {
  const [fecha, setFecha] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [areaDestino, setAreaDestino] = useState('')
  const responsable = getAreaResponsable(areaDestino)
  const [instruccion, setInstruccion] = useState('')
  const [archivoSeleccionado, setArchivoSeleccionado] =
  useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)


  const guardar = async () => {
    if (guardandoRef.current) return

    if (!expediente) {
      alert('Debe seleccionar un expediente.')
      return
    }

    if (!areaDestino) {
      alert('Debe seleccionar un área destino.')
      return
    }

    if (!instruccion.trim()) {
      alert('Debe ingresar la instrucción del proveído.')
      return
    }

    guardandoRef.current = true
    setGuardando(true)

    try {
      await onGuardar({
        expedienteId: expediente.id,
        nroExpediente: expediente.nroExp,
        fecha,
        areaDestino,
        responsable,
        instruccion: instruccion.trim(),
        archivo: archivoSeleccionado
      })
    } catch (error) {
      console.error('Error al guardar el proveído:', error)
      alert('Ocurrió un error al guardar el proveído.')
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }


  return (
    <div className="document-form-page proveido-form-page">
      <div className="page-heading compact document-form-header">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Nuevo Proveído</h1>
          <p className="muted">
            Registre un Proveído para el expediente.
          </p>
        </div>
      </div>

      <section className="panel document-form-card">
        <div className="document-form-section-header">
          <h2>Expediente relacionado</h2>
          <p>Expediente al que se vincula.</p>
        </div>

        <div className="document-form-grid proveido-form-grid">
          <div className="form-group wide proveido-expediente-field document-form-field document-form-field-wide">
            <ExpedienteSelector
              expedientes={expedientes}
              value={expediente}
              onChange={onExpedienteChange}
              areaOptions={areaOptions}
            />
          </div>
        </div>
      </section>

      <section className="panel document-form-card proveido-form-card">
        <div className="document-form-section-header">
          <h2>Datos del Proveído</h2>
          <p>Complete la información necesaria para registrar el Proveído.</p>
        </div>

        <div className="document-form-grid proveido-form-grid">
          <div className="form-group document-form-field">
            <label>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
            />
          </div>

          <div className="form-group document-form-field">
            <label>Área destino *</label>
            <select
              value={areaDestino}
              onChange={e => setAreaDestino(e.target.value)}
            >
              <option value="">Seleccione un área</option>
              {AREA_DESTINO_OPTIONS.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group document-form-field">
            <label>Responsable</label>
            <input
              type="text"
              value={responsable}
              readOnly
              placeholder="Jefe del área seleccionada"
            />
            {areaDestino.startsWith('Administración / ') && (
              <small>
                El Responsable es la jefatura de Administración; la subárea
                queda identificada como destino para la copia correspondiente.
              </small>
            )}
            {getAreaCopia(areaDestino) && (
              <small>
                Con copia a: {getAreaCopia(areaDestino)}
              </small>
            )}
          </div>

          <div className="form-group wide document-form-field document-form-field-wide">
            <label>Instrucción *</label>
            <textarea
              value={instruccion}
              onChange={e => setInstruccion(e.target.value)}
              placeholder="Escriba la instrucción..."
              rows={4}
            />
          </div>

          <div className="form-group wide document-form-field document-form-field-wide document-form-file-field">
            <label>Documento adjunto (opcional)</label>
            <label className="document-form-file-button">
              ▣ Seleccionar archivo
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={e => {
                  const archivo = e.target.files?.[0] ?? null

                  if (archivo && archivo.size > 5 * 1024 * 1024) {
                    alert('El archivo no puede superar los 5 MB.')
                    e.target.value = ''
                    setArchivoSeleccionado(null)
                    return
                  }

                  setArchivoSeleccionado(archivo)
                }}
              />
            </label>
            <small>
              {archivoSeleccionado
                ? `Seleccionado: ${archivoSeleccionado.name}`
                : 'Máximo 5 MB.'}
            </small>
            {archivoSeleccionado && (
              <button
                type="button"
                className="action-link"
                onClick={() => setArchivoSeleccionado(null)}
              >
                Quitar archivo
              </button>
            )}
          </div>
        </div>

        <div className="proveido-form-actions document-form-actions">
          <button
            type="button"
            className="outline-button"
            onClick={onCancelar}
            disabled={guardando}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={guardar}
            disabled={guardando}
          >
            {guardando ? 'Guardando...' : 'Guardar Proveído'}
          </button>
        </div>
      </section>
    </div>
  )
}