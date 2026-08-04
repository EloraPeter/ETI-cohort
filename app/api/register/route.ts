import { NextResponse } from "next/server";
import { registrationSchema } from "@/lib/validations/registration";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const supabase = createAdminClient();

  const { data: cohort, error: cohortError } = await supabase
    .from("cohorts")
    .select("id")
    .eq("is_open", true)
    .order("starts_on", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (cohortError || !cohort) {
    console.error("Cohort lookup failed:", cohortError);
    return NextResponse.json(
      { error: "Registration is temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  const { error: insertError } = await supabase.from("registrations").insert({
    cohort_id: cohort.id,
    full_name: data.fullName,
    email: data.email,
    phone: data.phone,
    age: data.age,
    gender: data.gender,
    state: data.state,
    city: data.city,
    occupation: data.occupation,
    education_level: data.educationLevel,
    owns_laptop: data.ownsLaptop === "Yes",
    coding_experience: data.codingExperience,
    heard_about_eti: data.hearAboutETI,
    motivation: data.motivation,
    preferred_payment_method: data.paymentMethod,
    agreed_to_terms: data.agreesToTerms,
  });

  if (insertError) {
    // Unique violation = already registered for this cohort with this email.
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "This email is already registered for the current cohort." },
        { status: 409 }
      );
    }
    console.error("Registration insert failed:", insertError);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
