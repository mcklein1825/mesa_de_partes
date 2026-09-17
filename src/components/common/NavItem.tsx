export default function NavItem({ icon, label, active, count, onClick }: {
  icon: string; label: string; active: boolean; count?: number; onClick: () => void
}) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      {label}
      {count ? <em>{count}</em> : null}
    </button>
  )
}