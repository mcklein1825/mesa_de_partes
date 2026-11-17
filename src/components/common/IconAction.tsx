import type { LucideIcon } from 'lucide-react'

type IconActionProps = {
  /** Texto accesible; también se muestra como ayuda al pasar el mouse */
  label: string
  icon: LucideIcon
  onClick: () => void
  /** "danger" solo cambia el color al pasar el mouse (acciones que eliminan) */
  tone?: 'default' | 'danger'
  disabled?: boolean
}

/** Botón de acción solo con ícono, para las columnas ACCIONES de las tablas. */
export default function IconAction({
  label,
  icon: Icon,
  onClick,
  tone = 'default',
  disabled = false
}: IconActionProps) {
  return (
    <button
      type="button"
      className={`icon-action${tone === 'danger' ? ' icon-action-danger' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
    </button>
  )
}
