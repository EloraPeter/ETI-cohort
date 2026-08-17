import "server-only";
import { createAdminClient } from "./admin";
import type { Instructor } from "./types";

/**
 * Verifies the bearer token from an incoming request belongs to a
 * signed-in Supabase user linked to an active instructor record.
 * Returns the instructor row on success, or null if unauthorized.
 *
 * Rejects invited instructors (haven't completed account setup yet)
 * and inactive/deactivated instructors — status is checked fresh on
 * every request, not cached, so a deactivation takes effect
 * immediately on the instructor's next call.
 */
export async function verifyInstructorRequest(request: Request): Promise<Instructor | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabase = createAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return null;

  const { data: instructor, error: instructorError } = await supabase
    .from("instructors")
    .select("*")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (instructorError || !instructor) return null;
  if (instructor.status !== "active") return null;

  return instructor;
}
