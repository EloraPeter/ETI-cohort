import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";

export async function GET(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: curricula, error } = await supabase.from("curricula").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Admin curricula fetch failed:", error);
    return NextResponse.json({ error: "Failed to load curricula." }, { status: 500 });
  }

  return NextResponse.json({ curricula: curricula ?? [] });
}
