import { ReactNode, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from './ToastProvider'
import { FileText, LoaderCircle } from 'lucide-react'

export default function MemoDocumentLink({
  archivoData,
  archivo,
  documento = 'Memo',
  tabla,
  id,
  children
}: {
  archivoData?: string
  archivo?: string
  documento?: string
  tabla?: string
  id?: string
  children?: ReactNode
}) {
  const { toast } = useToast()
  const [cargando, setCargando] = useState(false)

  const hayAdjunto =
    Boolean(archivoData) ||
    Boolean(tabla && id && archivo && archivo !== 'Sin adjunto')

  const abrirArchivo = async () => {
    if (cargando) return
    let dataUrl = archivoData
    let tipoDeTabla = ''

    if (!dataUrl && tabla && id) {
      setCargando(true)
      try {
        const { data, error } = await supabase
          .from(tabla)
          .select('archivo_data, archivo_tipo, archivo')
          .eq('id', id)
          .single()
        if (error || !data?.archivo_data) {
          toast('Este documento no tiene archivo almacenado.', 'error')
          return
        }
        dataUrl = data.archivo_data
        tipoDeTabla = data.archivo_tipo || ''
      } catch {
        toast('No se pudo cargar el archivo.', 'error')
        return
      } finally {
        setCargando(false)
      }
    }

    if (!dataUrl) return
    setCargando(true)
    try {
      const partes = dataUrl.split(',')
      if (partes.length !== 2) throw new Error('formato invalido')
      const mimeMatch = partes[0].match(/data:(.*?);base64/)
      const mimeType = mimeMatch ? mimeMatch[1] : (tipoDeTabla || 'application/pdf')
      const byteCharacters = atob(partes[1])
      const byteArrays: Uint8Array[] = []
      const tamBloque = 1024 * 1024
      for (let off = 0; off < byteCharacters.length; off += tamBloque) {
        const bloque = byteCharacters.slice(off, off + tamBloque)
        const arr = new Uint8Array(bloque.length)
        for (let i = 0; i < bloque.length; i++) arr[i] = bloque.charCodeAt(i)
        byteArrays.push(arr)
      }
      const blob = new Blob(byteArrays, { type: mimeType })
      const url = URL.createObjectURL(blob)
      const ventana = window.open(url, '_blank')
      if (!ventana) {
        URL.revokeObjectURL(url)
        toast('El navegador bloqueó la ventana emergente. Permita las ventanas emergentes para este sitio.', 'warning')
        return
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      toast(`No se pudo abrir el archivo del ${documento}.`, 'error')
    } finally {
      setCargando(false)
    }
  }

  if (!hayAdjunto) {
    return (
      <span className="table-cell-text" title="Sin documento">
        {children}
      </span>
    )
  }

  return (
    <button
      type="button"
      className="document-link"
      onClick={abrirArchivo}
      disabled={cargando}
      title={`Abrir ${archivo || `documento del ${documento}`}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        border: '1px solid var(--ui-border)',
        borderRadius: '6px',
        background: 'var(--ui-surface)',
        color: 'var(--ui-text)',
        padding: '5px 10px',
        cursor: cargando ? 'wait' : 'pointer',
        fontSize: '13px',
        fontWeight: 500
      }}
    >
      {cargando ? (
        <><LoaderCircle size={15} /><span className="document-link-label">Cargando...</span></>
      ) : (
        <><FileText size={15} /><span className="document-link-label">{archivo || 'Documento'}</span></>
      )}
    </button>
  )
}
