export default function StatCard({ label, value, detail, tone, icon }: {
  label: string; value: number; detail: string; tone: string; icon: string
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={tone === 'green' ? 'positive' : ''}>{detail}</small>
      </div>
    </div>
  )
}