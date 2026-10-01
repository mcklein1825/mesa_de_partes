import { useState } from 'react'
import { Expediente } from '../../types'
import ExpedienteSelector from '../common/ExpedienteSelector'
type Props = {
  expediente: Expediente | null
  expedientes: Expediente[]
  areaOptions: string[]
  onExpedienteChange: (expediente: Expediente | null) => void
  onCancelar: () => void
  onGuardar: (datos: {
    nroProveido: string
    expedienteId: string
    nroExpediente: string
    fecha: string
    areaDestino: string
    responsable: string
    instruccion: string
    estado: 'Pendiente' | 'Atendido' | 'Archivado'
  }) => void
}

export default function NuevoProveidoView({
  expediente,
  expedientes,
  areaOptions,
  onExpedienteChange,
  onCancelar,
  onGuardar
}: Props) {
  const [nroProveido, setNroProveido] = useState('')
  const [fecha, setFecha] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [areaDestino, setAreaDestino] = useState('')
  const [responsable, setResponsable] = useState('')
  const [instruccion, setInstruccion] = useState('')
  const [estado, setEstado] =
    useState<'Pendiente' | 'Atendido' | 'Archivado'>('Pendiente')

  const guardar = () => {
    if (!expediente) {
      alert('Debe seleccionar un expediente.')
      return
    }

    if (!instruccion.trim()) {
      alert('Debe ingresar la instrucción del proveído.')
      return
    }

    onGuardar({
      nroProveido,
      expedienteId: expediente.id,
      nroExpediente: expediente.nroExp,
      fecha,
      areaDestino,
      responsable,
      instruccion,
      estado
    })
  }

  return (
    <section className="view-section">

      <div className="page-header">
        <div>
          <h1>Nuevo Proveído</h1>

          <p>
            Registra una instrucción vinculada a un expediente.
          </p>
        </div>
      </div>

      <div className="panel">

        <div className="panel-header">
          <div>
            <h2>Datos del proveído</h2>
            <p>
              La instrucción quedará asociada al expediente seleccionado.
            </p>
          </div>
        </div>

        <div className="form-grid">

          <div className="form-group">
            <label>N.º Proveído</label>

            <input
              value={nroProveido}
              onChange={e => setNroProveido(e.target.value)}
              placeholder="Ej. 001"
            />
          </div>

          <div className="form-group">
            <label>Fecha</label>

            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
            />
          </div>

          <ExpedienteSelector
            expedientes={expedientes}
            value={expediente}
            onChange={onExpedienteChange}
            areaOptions={areaOptions}
            />

          <div className="form-group">
            <label>Área destino</label>

            <input
              value={areaDestino}
              onChange={e => setAreaDestino(e.target.value)}
              placeholder="Área a la que se deriva"
            />
          </div>

          <div className="form-group">
            <label>Responsable</label>

            <input
              value={responsable}
              onChange={e => setResponsable(e.target.value)}
              placeholder="Responsable"
            />
          </div>

          <div className="form-group">
            <label>Estado</label>

            <select
              value={estado}
              onChange={e =>
                setEstado(
                  e.target.value as
                    | 'Pendiente'
                    | 'Atendido'
                    | 'Archivado'
                )
              }
            >
              <option value="Pendiente">Pendiente</option>
              <option value="Atendido">Atendido</option>
              <option value="Archivado">Archivado</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label>Instrucción</label>

            <textarea
              value={instruccion}
              onChange={e => setInstruccion(e.target.value)}
              placeholder="Escriba la instrucción del proveído..."
              rows={5}
            />
          </div>

        </div>

        <div className="form-actions">

          <button
            type="button"
            className="outline-button"
            onClick={onCancelar}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={guardar}
          >
            Guardar Proveído
          </button>

        </div>

      </div>

    </section>
  )
}