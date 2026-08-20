import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Called by /instructor/account/setup once the instructor has
 * verified the recovery token and set their password client-side.
 * Deliberately doesn't use verifyInstructorRequest() — that helper
 * requires status='active' already, which is exactly the state
 * this route is responsible for transitioning into. Instead it
 * looks the instructor up by the now-authenticated session's
 * auth_user_id directly.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: instructor, error: instructorError } = await supabase
    .from("instructors")
    .select("*")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (instructorError || !instructor) {
    return NextResponse.json({ error: "No matching instructor record." }, { status: 404 });
  }

  // A deactivated instructor completing a stale setup link should
  // not be able to self-activate back in.
  if (instructor.status === "inactive") {
    return NextResponse.json({ error: "This instructor account is inactive. Contact an administrator." }, { status: 403 });
  }

  if (instructor.status === "active") {
    return NextResponse.json({ instructor }); // already completed — idempotent
  }

  const { data: updated, error: updateError } = await supabase
    .from("instructors")
    .update({ status: "active" })
    .eq("id", instructor.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("Instructor account completion failed:", updateError);
    return NextResponse.json({ error: "Could not complete account setup." }, { status: 500 });
  }

  return NextResponse.json({ instructor: updated });
}
