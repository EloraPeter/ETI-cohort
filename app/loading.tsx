export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900">
      <div className="h-8 w-8 animate-pulse rounded-full bg-signal-violet" aria-label="Loading" role="status" />
    </div>
  );
}
