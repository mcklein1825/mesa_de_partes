import { useRef, useState } from 'react'
import { Expediente } from '../../types'
import { AREA_RESPONSABLES } from '../../constants'
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
  const responsable = AREA_RESPONSABLES[areaDestino] || ''
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
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Nuevo Proveído</h1>
          <p className="muted">
            Registra una instrucción vinculada a un expediente.
          </p>
        </div>
      </div>

      <div className="panel">

  <div className="proveido-form-panel-header">
    <div>
      <h2>Datos del proveído</h2>
      <p>
        Registra la instrucción y el área responsable asociada al expediente.
      </p>
    </div>
  </div>

  <div className="proveido-form-grid">

    <div className="form-group">
      <label>Fecha</label>

      <input
        type="date"
        value={fecha}
        onChange={e => setFecha(e.target.value)}
      />
    </div>

    <div className="form-group wide proveido-expediente-field">
      <label>Expediente *</label>
      <ExpedienteSelector
        expedientes={expedientes}
        value={expediente}
        onChange={onExpedienteChange}
        areaOptions={areaOptions}
      />
    </div>

    <div className="form-group">
      <label>Área destino *</label>

      <select
        value={areaDestino}
        onChange={e => setAreaDestino(e.target.value)}
      >
        <option value="">Seleccione un área</option>

        {Object.keys(AREA_RESPONSABLES).map(area => (
          <option key={area} value={area}>
            {area}
          </option>
        ))} 
      </select>
    </div>

    <div className="form-group">
      <label>Responsable</label>

      <input
        type="text"
        value={responsable}
        readOnly
        placeholder="Se completará automáticamente"
      />
    </div>
    
    <div className="form-group wide">
      <label>Documento adjunto (opcional)</label>

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

      {archivoSeleccionado && (
        <div style={{ marginTop: '8px', fontSize: '12px' }}>
          <span>Archivo seleccionado: {archivoSeleccionado.name}</span>

          <button
            type="button"
            className="action-link"
            onClick={() => setArchivoSeleccionado(null)}
          >
            Quitar archivo
          </button>
        </div>
      )}

      <small>
        Puedes adjuntar un documento de hasta 5 MB.
      </small>
    </div>


    <div className="form-group wide proveido-instruccion-field">
      <label>Instrucción *</label>

      <textarea
        value={instruccion}
        onChange={e => setInstruccion(e.target.value)}
        placeholder="Escriba la instrucción que se debe realizar..."
        rows={5}
      />

      <small>
        Indique la acción o disposición que debe ejecutarse sobre el expediente.
      </small>
    </div>

  </div>
        <div className="proveido-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
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

      </div>

    </> 
  )
}