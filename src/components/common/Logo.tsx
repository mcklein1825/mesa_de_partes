import { GraduationCap } from 'lucide-react'

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`institution-logo ${compact ? 'institution-logo-compact' : ''}`}>
      <span className="institution-logo-mark" aria-hidden="true">
        <GraduationCap size={compact ? 18 : 21} strokeWidth={1.8} />
      </span>
      {!compact && (
        <span className="institution-logo-copy">
          <strong>Gilda Ballivián</strong>
          <small>Dirección General</small>
        </span>
      )}
    </span>
  )
}
