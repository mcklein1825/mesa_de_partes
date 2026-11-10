export default function LoadingSkeleton() {
  return (
    <section className="loading-skeleton" aria-label="Cargando expedientes" aria-busy="true">
      <div className="loading-skeleton-heading">
        <span className="skeleton-line skeleton-eyebrow" />
        <span className="skeleton-line skeleton-title" />
        <span className="skeleton-line skeleton-description" />
      </div>
      <div className="loading-skeleton-cards">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeleton-card" key={index}>
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-value" />
            <span className="skeleton-line skeleton-description" />
          </div>
        ))}
      </div>
      <div className="skeleton-panel">
        {Array.from({ length: 5 }, (_, index) => (
          <span className="skeleton-row" key={index} />
        ))}
      </div>
    </section>
  )
}
