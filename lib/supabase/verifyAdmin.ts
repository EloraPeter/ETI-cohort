import "server-only";
import { createAdminClient } from "./admin";

const ALLOWED_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Verifies the bearer token from an incoming request belongs to a
 * signed-in Supabase user whose email is on the admin allow-list.
 * Returns the user's email on success, or null if unauthorized.
 */
export async function verifyAdminRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;

  const email = data.user.email.toLowerCase();
  return ALLOWED_ADMIN_EMAILS.includes(email) ? email : null;
}
