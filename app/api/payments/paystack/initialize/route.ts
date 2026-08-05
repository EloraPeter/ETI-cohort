import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializePaystackTransaction } from "@/lib/payments/paystack";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://eloratechinstitute.com";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const paymentId = body?.paymentId;
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId is required." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
  }

  if (payment.method !== "Paystack") {
    return NextResponse.json({ error: "This payment is not set up for Paystack." }, { status: 400 });
  }

  if (payment.status === "paid") {
    return NextResponse.json({ error: "This registration has already been paid for." }, { status: 409 });
  }

  const { data: registration, error: registrationError } = await supabase
    .from("registrations")
    .select("email")
    .eq("id", payment.registration_id)
    .single();

  if (registrationError || !registration) {
    return NextResponse.json({ error: "Registration not found for this payment." }, { status: 404 });
  }

  // Use the payment's own id as the Paystack reference — unique,
  // and lets the webhook/verify step look the payment back up directly.
  const reference = payment.paystack_reference ?? `eti_${payment.id}`;

  try {
    const result = await initializePaystackTransaction({
      email: registration.email,
      amountNgn: Number(payment.amount_expected),
      reference,
      callbackUrl: `${siteUrl}/payments/callback`,
      metadata: { paymentId: payment.id, registrationId: payment.registration_id },
    });

    await supabase
      .from("payments")
      .update({
        status: "payment_processing",
        paystack_reference: result.reference,
        paystack_authorization_url: result.authorizationUrl,
      })
      .eq("id", payment.id);

    return NextResponse.json({ authorizationUrl: result.authorizationUrl });
  } catch (err) {
    console.error("Paystack initialize failed:", err);
    return NextResponse.json(
      { error: "Couldn't start the Paystack checkout. Please try again." },
      { status: 502 }
    );
  }
}
