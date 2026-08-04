"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-900 px-6 text-center text-white">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-mist">
        That's on us, not you. Try again, or head back to the homepage.
      </p>
      <div className="mt-2 flex gap-3">
        <button onClick={reset} className="btn-primary !px-5 !py-2.5 !text-sm">
          Try again
        </button>
        <Link href="/" className="btn-secondary !px-5 !py-2.5 !text-sm">
          Go home
        </Link>
      </div>
    </main>
  );
}
