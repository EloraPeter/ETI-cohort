export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass-panel-light p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-700/70">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}
