import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-900 px-6 text-center text-white">
      <p className="eyebrow">404</p>
      <h1 className="font-display text-2xl font-semibold">This page doesn&apos;t exist</h1>
      <p className="max-w-sm text-sm text-mist">
        The page you're looking for may have moved. Head back to the homepage to find your way.
      </p>
      <Link href="/" className="btn-primary !px-5 !py-2.5 !text-sm">
        Back to home
      </Link>
    </main>
  );
}
