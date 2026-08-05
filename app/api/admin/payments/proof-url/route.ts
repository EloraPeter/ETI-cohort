import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";

export async function GET(request: Request) {
  const email = await verifyAdminRequest(request);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 300);

  if (error || !data) {
    return NextResponse.json({ error: "Could not generate a link for this file." }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
