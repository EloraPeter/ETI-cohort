"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Download, LogOut, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { StatCard } from "@/components/admin/StatCard";
import { createClient } from "@/lib/supabase/client";
import { registrationsToCsv, downloadCsv } from "@/lib/csv";
import type { Registration, RegistrationStatus } from "@/lib/supabase/types";

// Session-gated and data-driven — never statically prerendered.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: RegistrationStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "payment_processing", label: "Processing" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const filterInputClass =
  "rounded-lg border border-ink-900/10 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-signal-500";

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [stats, setStats] = useState({ total: 0, enrolled: 0, pending: 0, withLaptop: 0 });
  const [rows, setRows] = useState<Registration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RegistrationStatus | "">("");
  const [laptop, setLaptop] = useState<"" | "yes" | "no">("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Auth guard: redirect to /admin if there's no session.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/admin");
        return;
      }
      setAccessToken(data.session.access_token);
      setCheckingAuth(false);
    });
  }, [router, supabase]);

  const authedFetch = useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
      }),
    [accessToken]
  );

  const loadStats = useCallback(async () => {
    const res = await authedFetch("/api/admin/stats");
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) setStats(await res.json());
  }, [authedFetch, router]);

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(query && { query }),
      ...(status && { status }),
      ...(laptop && { laptop }),
    });
    const res = await authedFetch(`/api/admin/registrations?${params}`);
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) {
      const body = await res.json();
      setRows(body.data);
      setTotal(body.total);
    }
    setLoading(false);
  }, [authedFetch, page, query, status, laptop, router]);

  useEffect(() => {
    if (!accessToken) return;
    loadStats();
  }, [accessToken, loadStats]);

  useEffect(() => {
    if (!accessToken) return;
    loadRegistrations();
  }, [accessToken, loadRegistrations]);

  async function handleExportAll() {
    setExporting(true);
    const params = new URLSearchParams({ page: "1", pageSize: "1000" });
    const res = await authedFetch(`/api/admin/registrations?${params}`);
    if (res.ok) {
      const body = await res.json();
      downloadCsv(`eti-registrations-${new Date().toISOString().slice(0, 10)}.csv`, registrationsToCsv(body.data));
    }
    setExporting(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin");
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-6 w-6 animate-spin text-ink-900" aria-hidden="true" />
      </main>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-paper-50 py-10 text-ink-900">
      <Container className="max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Registrations</h1>
            <p className="text-sm text-ink-700">Web Development Cohort — September 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/payments" className="text-sm font-medium text-signal-500 hover:underline">
              Payments
            </Link>
            <Link href="/admin/instructors" className="text-sm font-medium text-signal-500 hover:underline">
              Instructors
            </Link>
            <Link href="/admin/resources" className="text-sm font-medium text-signal-500 hover:underline">
              Resources
            </Link>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-white"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total registrations" value={stats.total} />
          <StatCard label="Enrolled" value={stats.enrolled} />
          <StatCard label="Pending payment" value={stats.pending} />
          <StatCard label="Own a laptop" value={stats.withLaptop} />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-700/50" />
            <input
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              placeholder="Search name, email, or phone..."
              className={`${filterInputClass} w-full pl-9`}
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as RegistrationStatus | "");
            }}
            className={filterInputClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={laptop}
            onChange={(e) => {
              setPage(1);
              setLaptop(e.target.value as "" | "yes" | "no");
            }}
            className={filterInputClass}
          >
            <option value="">Laptop: any</option>
            <option value="yes">Has laptop</option>
            <option value="no">No laptop</option>
          </select>

          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            Export CSV
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl2 border border-ink-900/10 bg-white">
          <div className="hidden grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr_1fr_0.9fr] gap-4 border-b border-ink-900/10 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-700/70 sm:grid">
            <span>Name</span>
            <span>Email</span>
            <span>Phone</span>
            <span>Laptop</span>
            <span>Status</span>
            <span>Registered</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-ink-700" aria-hidden="true" />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-ink-700">
              No registrations match your filters.
            </div>
          ) : (
            <ul className="divide-y divide-ink-900/10">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-2 gap-2 px-5 py-4 text-sm sm:grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr_1fr_0.9fr] sm:items-center sm:gap-4"
                >
                  <span className="font-medium text-ink-900">{row.full_name}</span>
                  <span className="truncate text-ink-700">{row.email}</span>
                  <span className="text-ink-700">{row.phone}</span>
                  <span className="text-ink-700">{row.owns_laptop ? "Yes" : "No"}</span>
                  <span>
                    <span className="inline-block rounded-full bg-ink-900/5 px-2.5 py-1 text-xs font-medium capitalize text-ink-800">
                      {row.status.replace("_", " ")}
                    </span>
                  </span>
                  <span className="text-xs text-ink-700/70">
                    {new Date(row.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between text-sm text-ink-700">
          <p>
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-ink-900/10 px-3 py-1.5 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-ink-900/10 px-3 py-1.5 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Container>
    </main>
  );
}
