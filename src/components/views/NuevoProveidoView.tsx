import { useEffect, useMemo, useRef, useState } from 'react'
import { FileUp, LoaderCircle } from 'lucide-react'
import { Expediente, Proveido } from '../../types'
import {
  AREA_DESTINO_OPTIONS,
  getAreaResponsable
} from '../../constants'
import ExpedienteSelector from '../common/ExpedienteSelector'
import { useToast } from '../common/ToastProvider'
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
  proveidoParaEditar?: Proveido | null
}

export default function NuevoProveidoView({
  expediente,
  expedientes,
  areaOptions,
  onExpedienteChange,
  onCancelar,
  onGuardar,
  proveidoParaEditar = null
}: Props) {
  const { toast } = useToast()
  const [fecha, setFecha] = useState('')
  const [areaDestino, setAreaDestino] = useState('')
  const [areaBusqueda, setAreaBusqueda] = useState('')
  const [areaAbierta, setAreaAbierta] = useState(false)
  const responsable = getAreaResponsable(areaDestino)
  const [instruccion, setInstruccion] = useState('')
  const [archivoSeleccionado, setArchivoSeleccionado] =
  useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)
  const areasPrincipales = useMemo(
    () => Array.from(new Set(AREA_DESTINO_OPTIONS.map(area => area.split(' / ')[0]))),
    []
  )
  const areasFiltradas = useMemo(() => {
    const texto = areaBusqueda.trim().toLowerCase()
    return areasPrincipales.filter(area =>
      !texto || area.toLowerCase().includes(texto)
    )
  }, [areaBusqueda, areasPrincipales])

  useEffect(() => {
    setFecha(proveidoParaEditar?.fecha?.slice(0, 10) || expediente?.fechaIngreso?.slice(0, 10) || new Date().toISOString().split('T')[0])
    setAreaDestino(proveidoParaEditar?.areaDestino || '')
    setAreaBusqueda(proveidoParaEditar?.areaDestino || '')
    setInstruccion(proveidoParaEditar?.instruccion || '')
  }, [expediente, proveidoParaEditar])

  const guardar = async () => {
    if (guardandoRef.current) return

    if (!expediente) {
      toast('Debe seleccionar un expediente.', 'warning')
      return
    }

    if (!areaDestino) {
      toast('Debe seleccionar un área destino.', 'warning')
      return
    }

    if (!instruccion.trim()) {
      toast('Debe ingresar la instrucción del proveído.', 'warning')
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
      toast('Ocurrió un error al guardar el proveído.', 'error')
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
          <h1>{proveidoParaEditar ? 'Editar Proveído' : 'Nuevo Proveído'}</h1>
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
            <div className="memo-destino-combobox">
              <input
                type="text"
                value={areaBusqueda}
                onChange={event => {
                  setAreaBusqueda(event.target.value)
                  setAreaDestino('')
                  setAreaAbierta(true)
                }}
                onFocus={() => setAreaAbierta(true)}
                placeholder="Escribe área o subárea..."
                autoComplete="off"
                required={!areaDestino}
              />
              {areaAbierta && (
                <div className="memo-destino-options">
                  {areasFiltradas.length > 0 ? (
                    areasFiltradas.map(area => (
                      <button
                        key={area}
                        type="button"
                        className="memo-destino-option"
                        onMouseDown={event => {
                          event.preventDefault()
                          setAreaDestino(area)
                          setAreaBusqueda(area)
                          setAreaAbierta(false)
                        }}
                      >
                        {area}
                      </button>
                    ))
                  ) : (
                    <div className="memo-destino-empty">
                      No se encontraron áreas.
                    </div>
                  )}
                </div>
              )}
            </div>
            {areaDestino && (
              <small>Área seleccionada: {areaDestino}</small>
            )}
          </div>

          <div className="form-group document-form-field">
            <label>Responsable</label>
            <input
              type="text"
              value={responsable}
              readOnly
              placeholder="Jefe del área seleccionada"
            />
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
              <><FileUp size={16} aria-hidden="true" /> Seleccionar archivo</>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={e => {
                  const archivo = e.target.files?.[0] ?? null

                  if (archivo && archivo.size > 5 * 1024 * 1024) {
                    toast('El archivo no puede superar los 5 MB.', 'warning')
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
            {guardando ? (
              <><LoaderCircle className="button-spinner" size={16} aria-hidden="true" /> Guardando...</>
            ) : (
              'Guardar Proveído'
            )}
          </button>
        </div>
      </section>
    </div>
  )
}