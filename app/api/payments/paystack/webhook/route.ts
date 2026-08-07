import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeEnrollment } from "@/lib/payments/finalize";

export async function POST(request: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const rawBody = await request.text();

  const signature = request.headers.get("x-paystack-signature");
  if (!secretKey || !signature) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const expectedSignature = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  // timingSafeEqual requires equal-length buffers, and throws otherwise —
  // guard the length first so a mismatched signature is still a clean
  // rejection rather than an unhandled exception.
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const providedBuffer = Buffer.from(signature, "hex");
  const signaturesMatch =
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer);

  if (!signaturesMatch) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "charge.success") {
    // Not an event we act on — acknowledge so Paystack stops retrying.
    return NextResponse.json({ received: true });
  }

  const data = event.data;
  const reference: string = data.reference;
  const amountKobo: number = data.amount;
  const transactionId: string = String(data.id);

  const supabase = createAdminClient();
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("*")
    .eq("paystack_reference", reference)
    .single();

  if (paymentError || !payment) {
    console.error("Webhook: no payment found for reference", reference);
    return NextResponse.json({ received: true }); // ack regardless — nothing to retry
  }

  const expectedKobo = Math.round(Number(payment.amount_expected) * 100);
  if (amountKobo !== expectedKobo) {
    await supabase
      .from("payments")
      .update({ status: "failed", admin_notes: `Amount mismatch: expected ₦${payment.amount_expected}, received ₦${amountKobo / 100}.` })
      .eq("id", payment.id);
    console.error("Webhook: amount mismatch for payment", payment.id);
    return NextResponse.json({ received: true });
  }

  try {
    await finalizeEnrollment({
      paymentId: payment.id,
      amountPaidNgn: amountKobo / 100,
      source: "paystack",
      paystack: { reference, transactionId },
    });
  } catch (err) {
    console.error("Webhook: finalizeEnrollment failed for payment", payment.id, err);
    // Return non-2xx so Paystack retries — swallowing this and returning
    // 200 leaves the payment stuck at "paid" with no student forever,
    // since nothing else will ever call finalizeEnrollment again for it.
    return NextResponse.json({ error: "Enrollment finalization failed, please retry." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
