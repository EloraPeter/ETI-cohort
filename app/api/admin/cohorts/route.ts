import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";

export async function GET(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: cohorts, error } = await supabase
    .from("cohorts")
    .select("*")
    .order("starts_on", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load cohorts." }, { status: 500 });
  }

  return NextResponse.json({ cohorts: cohorts ?? [] });
}
