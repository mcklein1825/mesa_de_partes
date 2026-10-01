export default function NavItem({ icon, label, active, count, onClick }: {
  icon: string; label: string; active: boolean; count?: number; onClick: () => void
}) {
  return (
    <button
      className={`nav-item ${active ? 'active' : ''}`}
      onClick={onClick}
      title={label}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
      {count ? <em>{count}</em> : null}
    </button>
  )
}