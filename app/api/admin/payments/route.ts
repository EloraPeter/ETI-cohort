import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";
import { finalizeEnrollment } from "@/lib/payments/finalize";
import type { PaymentStatus, PaymentMethod, Payment } from "@/lib/supabase/types";

const PAGE_SIZE_DEFAULT = 20;
// Small-cohort scale: fetch matching rows, filter/paginate in memory
// rather than relying on PostgREST embedded-resource filtering.
const FETCH_CAP = 1000;

// Matches the shape of the `select("*, registrations(...)")` join
// above — same join, same shape already typed as PaymentRow in
// app/admin/payments/page.tsx (that one's page-local, so this is a
// local mirror rather than a new shared export, to keep this fix
// minimal).
type PaymentWithRegistration = Payment & {
  registrations: { full_name: string; email: string; phone: string } | null;
};

export async function GET(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim().toLowerCase() ?? "";
  const status = searchParams.get("status") ?? "";
  const method = searchParams.get("method") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT))));

  const supabase = createAdminClient();
  let q = supabase
    .from("payments")
    .select("*, registrations(full_name, email, phone)")
    .order("created_at", { ascending: false })
    .limit(FETCH_CAP);

  if (status) q = q.eq("status", status as PaymentStatus);
  if (method) q = q.eq("method", method as PaymentMethod);

  const { data, error } = await q;
  if (error) {
    console.error("Admin payments fetch failed:", error);
    return NextResponse.json({ error: "Failed to load payments." }, { status: 500 });
  }

  let rows = data ?? [];
  if (query) {
    rows = rows.filter((row: PaymentWithRegistration) => {
      const reg = row.registrations;
      return (
        reg?.full_name?.toLowerCase().includes(query) ||
        reg?.email?.toLowerCase().includes(query) ||
        reg?.phone?.toLowerCase().includes(query)
      );
    });
  }

  const total = rows.length;
  const from = (page - 1) * pageSize;
  const paged = rows.slice(from, from + pageSize);

  return NextResponse.json({ data: paged, total, page, pageSize });
}

type AdminAction = "approve" | "reject" | "request_correction";

export async function PATCH(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const paymentId = body?.paymentId;
  const action: AdminAction | undefined = body?.action;
  const note: string | undefined = body?.note;

  if (!paymentId || !action) {
    return NextResponse.json({ error: "paymentId and action are required." }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (action === "approve") {
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("amount_expected")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }

    try {
      const result = await finalizeEnrollment({
        paymentId,
        amountPaidNgn: Number(payment.amount_expected),
        source: "bank_transfer_admin_approval",
        reviewedBy: email,
      });
      return NextResponse.json({ success: true, studentCode: result.studentCode });
    } catch (err) {
      console.error("Admin approval finalize failed:", err);
      return NextResponse.json({ error: "Failed to approve and enroll this student." }, { status: 500 });
    }
  }

  if (action === "reject") {
    const { error } = await supabase
      .from("payments")
      .update({ status: "failed", admin_notes: note ?? "Rejected by admin.", reviewed_by: email, reviewed_at: new Date().toISOString() })
      .eq("id", paymentId);
    if (error) return NextResponse.json({ error: "Failed to reject payment." }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "request_correction") {
    const { error } = await supabase
      .from("payments")
      .update({
        status: "pending_payment",
        admin_notes: note ?? "Correction requested — please re-upload your proof.",
        reviewed_by: email,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
    if (error) return NextResponse.json({ error: "Failed to request correction." }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
