import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAdminRequest } from "@/lib/supabase/verifyAdmin";
import { provisionInstructorAccount } from "@/lib/instructors/provision";
import type { InstructorStatus } from "@/lib/supabase/types";

const createInstructorSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the instructor's full name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z.string().trim().max(30).optional(),
});

export async function GET(request: Request) {
  const adminEmail = await verifyAdminRequest(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const status = searchParams.get("status") ?? "";

  const supabase = createAdminClient();
  let q = supabase.from("instructors").select("*");

  if (query) {
    q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
  }
  if (status) {
    q = q.eq("status", status as InstructorStatus);
  }

  const { data, error } = await q.order("created_at", { ascending: false });

  if (error) {
    console.error("Admin instructors fetch failed:", error);
    return NextResponse.json({ error: "Failed to load instructors." }, { status: 500 });
  }

  return NextResponse.json({ instructors: data ?? [] });
}

export async function POST(request: Request) {
  const adminEmail = await verifyAdminRequest(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createInstructorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, { status: 400 });
  }
  const { fullName, email, phone } = parsed.data;

  const supabase = createAdminClient();

  // An instructor can never create their own record — this route is
  // admin-only (verifyAdminRequest above), and there is deliberately
  // no public/self-service instructor registration endpoint anywhere
  // in this codebase.
  const { data: instructor, error: insertError } = await supabase
    .from("instructors")
    .insert({
      full_name: fullName,
      email,
      phone: phone ?? null,
      status: "invited",
      created_by: adminEmail,
    })
    .select("*")
    .single();

  if (insertError || !instructor) {
    // Most likely cause: the case-insensitive unique index on email.
    if (insertError?.code === "23505") {
      return NextResponse.json({ error: "An instructor with this email already exists." }, { status: 409 });
    }
    console.error("Admin instructor create failed:", insertError);
    return NextResponse.json({ error: "Failed to create instructor." }, { status: 500 });
  }

  const provisionResult = await provisionInstructorAccount({
    instructorId: instructor.id,
    fullName: instructor.full_name,
    email: instructor.email,
    existingAuthUserId: instructor.auth_user_id,
  });

  if (!provisionResult.ok) {
    // The instructor row exists but has no usable auth account yet —
    // surface this clearly rather than reporting a clean success.
    return NextResponse.json(
      {
        instructor,
        warning: "Instructor record created, but the account/invitation could not be provisioned. Try resending the invitation.",
      },
      { status: 207 }
    );
  }

  return NextResponse.json({ instructor, emailSent: provisionResult.emailSent });
}
