"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, LogOut, Loader2, ChevronLeft, ChevronRight, FileText, Check, X, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/client";
import type { Payment, PaymentStatus, PaymentMethod } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type PaymentRow = Payment & { registrations: { full_name: string; email: string; phone: string } | null };

const STATUS_OPTIONS: { value: PaymentStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "pending_payment", label: "Pending" },
  { value: "payment_processing", label: "Processing" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Rejected / Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const filterInputClass =
  "rounded-lg border border-ink-900/10 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-signal-500";

function StatusBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, string> = {
    pending_payment: "badge-warning",
    payment_processing: "badge-warning",
    paid: "badge-success",
    failed: "badge-error",
    cancelled: "badge-error",
  };
  const labels: Record<PaymentStatus, string> = {
    pending_payment: "Pending",
    payment_processing: "Processing",
    paid: "Paid",
    failed: "Failed",
    cancelled: "Cancelled",
  };
  return <span className={map[status]}>{labels[status]}</span>;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

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
      fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` } }),
    [accessToken]
  );

  const loadPayments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(query && { query }),
      ...(status && { status }),
      ...(method && { method }),
    });
    const res = await authedFetch(`/api/admin/payments?${params}`);
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
  }, [authedFetch, page, query, status, method, router]);

  useEffect(() => {
    if (!accessToken) return;
    loadPayments();
  }, [accessToken, loadPayments]);

  async function handleViewProof(path: string) {
    const res = await authedFetch(`/api/admin/payments/proof-url?path=${encodeURIComponent(path)}`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function handleAction(paymentId: string, action: "approve" | "reject" | "request_correction") {
    let note: string | undefined;
    if (action === "reject") {
      note = window.prompt("Reason for rejecting this payment (shown to your records):") ?? undefined;
    } else if (action === "request_correction") {
      note = window.prompt("What should the student correct?") ?? undefined;
    }

    setActioningId(paymentId);
    const res = await authedFetch("/api/admin/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, action, note }),
    });
    setActioningId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? "Action failed.");
      return;
    }
    loadPayments();
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
            <h1 className="font-display text-2xl font-semibold">Payment Management</h1>
            <p className="text-sm text-ink-700">Review, approve, and reject student payments</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-sm font-medium text-signal-500 hover:underline">
              Registrations
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
              setStatus(e.target.value as PaymentStatus | "");
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
            value={method}
            onChange={(e) => {
              setPage(1);
              setMethod(e.target.value as PaymentMethod | "");
            }}
            className={filterInputClass}
          >
            <option value="">All methods</option>
            <option value="Paystack">Paystack</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl2 border border-ink-900/10 bg-white">
          <div className="hidden grid-cols-[1.2fr_1.4fr_0.9fr_0.8fr_0.9fr_0.7fr_0.9fr_1fr] gap-3 border-b border-ink-900/10 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-700/70 lg:grid">
            <span>Student</span>
            <span>Email</span>
            <span>Method</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Proof</span>
            <span>Date</span>
            <span>Actions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-ink-700" aria-hidden="true" />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-ink-700">No payments match your filters.</div>
          ) : (
            <ul className="divide-y divide-ink-900/10">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-2 gap-3 px-5 py-4 text-sm lg:grid-cols-[1.2fr_1.4fr_0.9fr_0.8fr_0.9fr_0.7fr_0.9fr_1fr] lg:items-center"
                >
                  <span className="font-medium text-ink-900">{row.registrations?.full_name ?? "—"}</span>
                  <span className="truncate text-ink-700">{row.registrations?.email ?? "—"}</span>
                  <span className="text-ink-700">{row.method}</span>
                  <span className="text-ink-700">₦{Number(row.amount_expected).toLocaleString()}</span>
                  <span>
                    <StatusBadge status={row.status} />
                  </span>
                  <span>
                    {row.proof_path ? (
                      <button
                        onClick={() => handleViewProof(row.proof_path!)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-signal-500 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        View
                      </button>
                    ) : (
                      <span className="text-xs text-ink-700/50">—</span>
                    )}
                  </span>
                  <span className="text-xs text-ink-700/70">{new Date(row.created_at).toLocaleDateString()}</span>
                  <span className="flex flex-wrap gap-2">
                    {row.status !== "paid" && (
                      <button
                        onClick={() => handleAction(row.id, "approve")}
                        disabled={actioningId === row.id}
                        title="Approve"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-success/15 text-success hover:bg-success/25 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                    {row.status !== "failed" && row.status !== "paid" && (
                      <button
                        onClick={() => handleAction(row.id, "reject")}
                        disabled={actioningId === row.id}
                        title="Reject"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-error/15 text-error hover:bg-error/25 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                    {row.method === "Bank Transfer" && row.status !== "paid" && (
                      <button
                        onClick={() => handleAction(row.id, "request_correction")}
                        disabled={actioningId === row.id}
                        title="Request correction"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-warning/15 text-warning hover:bg-warning/25 disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
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
