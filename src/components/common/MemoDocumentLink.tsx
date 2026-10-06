import { useState, type ReactNode } from 'react'

export default function MemoDocumentLink({
  archivoData,
  archivo,
  children
}: {
  archivoData?: string
  archivo?: string
  children: ReactNode
}) {
  const [cargando, setCargando] = useState(false)

  const abrirArchivo = () => {
    if (!archivoData || cargando) {
      return
    }

    setCargando(true)

    try {
      // Convertir el Data URL en Blob
      const partes = archivoData.split(',')

      if (partes.length !== 2) {
        throw new Error('El archivo almacenado no tiene un formato válido.')
      }

      const encabezado = partes[0]
      const contenido = partes[1]

      const mimeMatch = encabezado.match(/data:(.*?);base64/)

      if (!mimeMatch) {
        throw new Error('No se pudo identificar el tipo de archivo.')
      }

      const mimeType = mimeMatch[1]

      const byteCharacters = atob(contenido)
      const byteArrays: Uint8Array[] = []

      const tamañoBloque = 1024 * 1024

      for (
        let offset = 0;
        offset < byteCharacters.length;
        offset += tamañoBloque
      ) {
        const bloque = byteCharacters.slice(
          offset,
          offset + tamañoBloque
        )

        const byteNumbers = new Uint8Array(bloque.length)

        for (let i = 0; i < bloque.length; i++) {
          byteNumbers[i] = bloque.charCodeAt(i)
        }

        byteArrays.push(byteNumbers)
      }

      const blob = new Blob(byteArrays, {
        type: mimeType
      })

      const url = URL.createObjectURL(blob)

      const nuevaVentana = window.open(
        url,
        '_blank'
      )

      if (!nuevaVentana) {
        URL.revokeObjectURL(url)

        alert(
          'El navegador bloqueó la ventana emergente. Permita las ventanas emergentes para este sitio.'
        )

        return
      }

      // Liberar la URL después de un tiempo
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 60000)

    } catch (error) {
      console.error(
        'Error al abrir archivo del Memo:',
        error
      )

      alert(
        'No se pudo abrir el archivo del Memo.'
      )
    } finally {
      setCargando(false)
    }
  }

  if (!archivoData) {
    return (
      <span
        className="table-cell-text"
        title="Sin documento"
      >
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
    title={`Abrir ${archivo || 'documento del Memo'}`}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      background: '#f8fafc',
      color: '#374151',
      padding: '5px 10px',
      cursor: cargando ? 'wait' : 'pointer',
      fontSize: '13px',
      fontWeight: 500
    }}
  >
    {cargando
      ? '⏳ Cargando...'
      : `📄 ${archivo || 'Documento'}`}
  </button>
)
}