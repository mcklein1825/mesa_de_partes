export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`institution-logo ${compact ? 'institution-logo-compact' : ''}`}>
      <img
        className="institution-logo-image"
        src="/logo-institucional.png"
        alt="Logo del IESTP Gilda Ballivián"
      />
      {!compact && (
        <span className="institution-logo-copy">
          <strong>IESTP Gilda Ballivián</strong>
          <small>Dirección General</small>
        </span>
      )}
    </span>
  )
}
