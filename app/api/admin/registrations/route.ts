import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";
import type { RegistrationStatus } from "@/lib/supabase/types";

export async function GET(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const status = searchParams.get("status") ?? "";
  const laptop = searchParams.get("laptop") ?? ""; // "yes" | "no" | ""
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

  const supabase = createAdminClient();
  let q = supabase.from("registrations").select("*", { count: "exact" });

  if (query) {
    q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
  }
  if (status) {
    q = q.eq("status", status as RegistrationStatus);
  }
  if (laptop === "yes" || laptop === "no") {
    q = q.eq("owns_laptop", laptop === "yes");
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await q.order("created_at", { ascending: false }).range(from, to);

  if (error) {
    console.error("Admin registrations fetch failed:", error);
    return NextResponse.json({ error: "Failed to load registrations." }, { status: 500 });
  }

  // Attach student_id where one exists, so the admin UI can link a
  // paid registration to its student record. A registration only
  // gets a students row once finalizeEnrollment() runs (i.e. once
  // payment is confirmed) — most rows here will have student_id: null,
  // and that's expected, not an error.
  const registrationIds = (data ?? []).map((r) => r.id);
  let studentIdByRegistrationId = new Map<string, string>();

  if (registrationIds.length > 0) {
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, registration_id")
      .in("registration_id", registrationIds);

    if (studentsError) {
      // Non-fatal: the registrations list itself is still valid and
      // useful without student links, so don't fail the whole
      // request over this — just omit the links this time.
      console.error("Admin registrations: student_id lookup failed:", studentsError);
    } else {
      studentIdByRegistrationId = new Map((students ?? []).map((s) => [s.registration_id, s.id]));
    }
  }

  const withStudentId = (data ?? []).map((registration) => ({
    ...registration,
    student_id: studentIdByRegistrationId.get(registration.id) ?? null,
  }));

  return NextResponse.json({ data: withStudentId, total: count ?? 0, page, pageSize });
}

export async function PATCH(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.status) {
    return NextResponse.json({ error: "id and status are required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("registrations")
    .update({ status: body.status })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update status." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
