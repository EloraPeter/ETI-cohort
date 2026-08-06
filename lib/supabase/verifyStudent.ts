import "server-only";
import { createAdminClient } from "./admin";
import type { Student } from "./types";

/**
 * Verifies the bearer token from an incoming request belongs to a
 * signed-in Supabase user linked to a student record. Returns the
 * student row on success, or null if unauthorized.
 */
export async function verifyStudentRequest(request: Request): Promise<Student | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabase = createAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return null;

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (studentError || !student) return null;
  return student;
}
