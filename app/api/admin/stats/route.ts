import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";

export async function GET(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [{ count: total }, { count: enrolled }, { count: pending }, { count: withLaptop }] = await Promise.all([
    supabase.from("registrations").select("*", { count: "exact", head: true }),
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("registrations").select("*", { count: "exact", head: true }).eq("status", "pending_payment"),
    supabase.from("registrations").select("*", { count: "exact", head: true }).eq("owns_laptop", true),
  ]);

  return NextResponse.json({
    total: total ?? 0,
    enrolled: enrolled ?? 0,
    pending: pending ?? 0,
    withLaptop: withLaptop ?? 0,
  });
}
