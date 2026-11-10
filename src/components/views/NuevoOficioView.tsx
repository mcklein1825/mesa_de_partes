import { FormEvent, useMemo, useState } from 'react'
import { FileUp, LoaderCircle } from 'lucide-react'
import { Expediente } from '../../types'
import {
  AREA_DESTINO_OPTIONS,
  getAreaCopia,
  getAreaResponsable
} from '../../constants'
import { formatNroExp, getSupportedDocumentMimeType } from '../../utils/expedienteHelpers'
import { useToast } from '../common/ToastProvider'

type Props = {
  expediente: Expediente | null
  onCancelar: () => void
  onGuardar: (datos: NuevoOficioData) => Promise<void>
}

export type NuevoOficioData = {
  expedienteId: string
  nroExpediente: string
  fecha: string
  destinatario: string
  asuntoTipo: string
  asuntoDetalle: string
  responsable: string
  codigoOad: string
  codigoOgesup: string
  anio: number
  areaDestino: string
  archivo: File | null
}

export default function NuevoOficioView({
  expediente,
  onCancelar,
  onGuardar
}: Props) {
  const { toast } = useToast()
  const [fecha, setFecha] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [asuntoDetalle, setAsuntoDetalle] = useState('')
  const [destinatario, setDestinatario] = useState('')
  const [areaDestino, setAreaDestino] = useState('')
  const [areaBusqueda, setAreaBusqueda] = useState('')
  const [areaAbierta, setAreaAbierta] = useState(false)
  const responsable = getAreaResponsable(areaDestino)
  const [archivo, setArchivo] = useState<File | null>(null)

  const [guardando, setGuardando] = useState(false)
  const areasFiltradas = useMemo(() => {
    const texto = areaBusqueda.trim().toLowerCase()
    return AREA_DESTINO_OPTIONS.filter(area =>
      !texto || area.toLowerCase().includes(texto)
    )
  }, [areaBusqueda])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!expediente) {
      toast('Debe seleccionar un expediente.', 'warning')
      return
    }

    if (!areaDestino) {
      toast('Seleccione el área destino.', 'warning')
      return
    }

    if (!asuntoDetalle.trim()) {
      toast('Ingrese el asunto del Oficio.', 'warning')
      return
    }

    if (!destinatario.trim()) {
      toast('Ingrese el destinatario del Oficio.', 'warning')
      return
    }

    if (archivo && !getSupportedDocumentMimeType(archivo)) {
      toast('Adjunte un archivo PDF, JPG, JPEG o PNG.', 'warning')
      return
    }

    if (archivo && archivo.size > 5 * 1024 * 1024) {
      toast('El archivo no puede superar los 5 MB.', 'warning')
      return
    }

    setGuardando(true)

    try {
      await onGuardar({
        expedienteId: String(expediente.id),
        nroExpediente: String(expediente.nroExp),
        fecha,
        destinatario: destinatario.trim(),
        asuntoTipo: '',
        asuntoDetalle: asuntoDetalle.trim(),
        responsable: responsable.trim(),
        codigoOad: '',
        codigoOgesup: '',
        anio: new Date(`${fecha}T00:00:00`).getFullYear(),
        areaDestino: areaDestino.trim(),
        archivo
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="page-heading compact document-form-header">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Nuevo Oficio</h1>
          <p className="muted">
            Registre la fecha, el área de destino, el asunto y el responsable del Oficio.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>
      </div>

      {!expediente ? (
        <div className="panel empty-state" style={{ padding: '30px', textAlign: 'center' }}>
          Seleccione primero un expediente para registrar el oficio.
        </div>
      ) : (
        <form className="oficio-form document-form-layout" onSubmit={handleSubmit}>
          <div className="panel form-card oficio-form-card document-form-card">
            <div className="document-form-section-header">
              <h2>Expediente relacionado</h2>
              <p>El Oficio quedará vinculado a este expediente.</p>
            </div>

            <div className="memo-expediente-info">
              <div>
                <strong>Expediente</strong>
                <p>{formatNroExp(expediente.nroExp, false, expediente.fechaIngreso)}</p>
              </div>
              <div>
                <strong>Remitente</strong>
                <p>{expediente.remitente || 'Sin especificar'}</p>
              </div>
              <div>
                <strong>Asunto del expediente</strong>
                <p>{expediente.asunto || 'Sin asunto'}</p>
              </div>
            </div>

            <div className="form-grid oficio-form-grid document-form-grid">
              <div className="form-group document-form-field">
                <label>Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  required
                />
              </div>

              <div className="form-group document-form-field">
                <label>Área de destino DRELM *</label>
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
                          No se encontraron áreas o subáreas.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group document-form-field">
                <label>Responsable</label>
                <input
                  type="text"
                  value={responsable}
                  readOnly
                  placeholder="Se completa según el área seleccionada"
                />
                <small>
                  {responsable
                    ? areaDestino.startsWith('Administración / ')
                      ? 'Responsable: jefatura de Administración. La subárea se conserva como destino para indicar la copia correspondiente.'
                      : 'Jefe del área destinataria.'
                    : 'El destino no tiene un jefe asignado en el catálogo.'}
                </small>
                {getAreaCopia(areaDestino) && (
                  <small>
                    Con copia a: {getAreaCopia(areaDestino)}
                  </small>
                )}
              </div>
            </div>
          </div>

          <div className="panel form-card oficio-form-card document-form-card">
            <div className="document-form-section-header">
              <h2>Datos del Oficio</h2>
              <p>Complete el asunto correspondiente al documento.</p>
            </div>

            <div className="form-grid oficio-form-grid document-form-grid">
              <div className="form-group document-form-field">
                <label htmlFor="oficio-destinatario">Destinatario *</label>
                <input
                  id="oficio-destinatario"
                  type="text"
                  value={destinatario}
                  onChange={event => setDestinatario(event.target.value)}
                  placeholder="Nombre o entidad destinataria"
                  required
                />
              </div>

              <div className="form-group form-group-full document-form-field document-form-field-wide">
                <label>Asunto *</label>

                <textarea
                  value={asuntoDetalle}
                  onChange={e => setAsuntoDetalle(e.target.value)}
                  placeholder="Ej. Remito copia de legajo del docente"
                  rows={3}
                  required
                />
              </div>

              <div className="form-group document-form-field">
                <label htmlFor="oficio-archivo">Adjunto (opcional)</label>
                <label className="document-form-file-button" htmlFor="oficio-archivo">
                  <><FileUp size={16} aria-hidden="true" /> Seleccionar archivo</>
                  <input
                    id="oficio-archivo"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={event => {
                      const file = event.target.files?.[0] || null
                      if (!file) {
                        setArchivo(null)
                        return
                      }

                      if (!getSupportedDocumentMimeType(file)) {
                        toast('Adjunte un archivo PDF, JPG, JPEG o PNG.', 'warning')
                        event.target.value = ''
                        setArchivo(null)
                        return
                      }

                      if (file.size > 5 * 1024 * 1024) {
                        toast('El archivo no puede superar los 5 MB.', 'warning')
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
            </div>
          </div>

          <div className="form-actions oficio-form-actions document-form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onCancelar}
              disabled={guardando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={guardando}
            >
              {guardando ? (
                <><LoaderCircle className="button-spinner" size={16} aria-hidden="true" /> Guardando...</>
              ) : (
                'Guardar Oficio'
              )}
            </button>
          </div>
        </form>
      )}
    </>
  )
}