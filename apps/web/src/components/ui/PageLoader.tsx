// Lightweight skeleton shown while a lazily-loaded route chunk downloads.
export function PageLoader() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
      <div className="h-52 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
