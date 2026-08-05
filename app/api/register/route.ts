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
    .select("id, fee_ngn")
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

  const { data: registration, error: insertError } = await supabase
    .from("registrations")
    .insert({
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
      agreed_to_terms: data.agreesToTerms,
      status: "pending_payment",
    })
    .select("id")
    .single();

  if (insertError || !registration) {
    // Unique violation = already registered for this cohort with this email.
    if (insertError?.code === "23505") {
      return NextResponse.json(
        { error: "This email is already registered for the current cohort." },
        { status: 409 }
      );
    }
    console.error("Registration insert failed:", insertError);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // A payment row is created alongside the registration — the
  // student's chosen method is the source of truth from here on,
  // not a field on `registrations`.
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      registration_id: registration.id,
      cohort_id: cohort.id,
      method: data.paymentMethod,
      amount_expected: cohort.fee_ngn,
    })
    .select("id, method, bank_reference, amount_expected")
    .single();

  if (paymentError || !payment) {
    console.error("Payment record creation failed:", paymentError);
    return NextResponse.json(
      { error: "Registration was saved, but we couldn't start the payment step. Please contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      registrationId: registration.id,
      paymentId: payment.id,
      method: payment.method,
      bankReference: payment.bank_reference,
      amountExpected: payment.amount_expected,
    },
    { status: 201 }
  );
}
