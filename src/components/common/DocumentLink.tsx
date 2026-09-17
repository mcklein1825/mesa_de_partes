import { useState } from 'react'

import { supabase } from '../../lib/supabaseClient'

import { Expediente } from '../../types'
export default function DocumentLink({ item }: { item: Expediente }) {
  const [cargando, setCargando] = useState(false)

  const abrirArchivo = async () => {
    if (cargando) return
    setCargando(true)
    try {
      const { data, error } = await supabase.from('mesa_partes_2026').select('archivo_data, archivo_tipo, archivo').eq('id', item.id).single()
      if (error || !data?.archivo_data) {
        alert(error ? 'No se pudo cargar el archivo.' : 'Este expediente no tiene el archivo almacenado.')
        return
      }
      let base64 = data.archivo_data.includes(',') ? data.archivo_data.split(',')[1] : data.archivo_data
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i)
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: data.archivo_tipo || 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const nuevaVentana = window.open(url, '_blank')
      if (!nuevaVentana) { URL.revokeObjectURL(url); alert('El navegador bloqueó la ventana emergente.'); return }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) {
      console.error('Error inesperado al abrir archivo:', error)
      alert('Ocurrió un error al abrir el archivo.')
    } finally {
      setCargando(false)
    }
  }

  if (!item.archivo || item.archivo === 'Sin adjunto') {
    return <span className="table-cell-text" title={item.documentos || 'Sin documento'}>{item.documentos || 'Sin documento'}</span>
  }

  return (
    <button type="button" className="document-link" onClick={abrirArchivo} disabled={cargando} title={`Abrir ${item.archivo}`} style={{ border: 'none', background: 'none', padding: 0, cursor: cargando ? 'wait' : 'pointer' }}>
      {cargando ? '⏳ Cargando...' : `▣ ${item.archivo}`}
    </button>
  )
}