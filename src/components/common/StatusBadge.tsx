export default function StatusBadge({ status }: { status: string }) {
  // Convertimos el texto a minúsculas y cambiamos espacios por guiones.
  // Ejemplo: "Sin respuesta" -> "sin-respuesta", "Enviado" -> "enviado"
  const statusClass = (status || '').toLowerCase().replace(/\s+/g, '-')

  return (
    <span
      className={`status-badge ${statusClass}`}
      role="status"
    >
      <i aria-hidden="true" />
      {status}
    </span>
  )
}