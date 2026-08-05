import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landmark } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { createAdminClient } from "@/lib/supabase/admin";
import { BankTransferProofUpload } from "@/components/BankTransferProofUpload";
import { bankDetails } from "@/lib/content";

export const metadata: Metadata = { title: "Bank transfer details", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-3 last:border-0">
      <span className="text-sm text-mist">{label}</span>
      <span className="font-mono text-sm font-medium text-white">{value}</span>
    </div>
  );
}

export default async function BankTransferPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (!payment || payment.method !== "Bank Transfer") {
    notFound();
  }

  return (
    <main className="section-grid-bg min-h-screen py-20 sm:py-28">
      <Container className="max-w-xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient">
            <Landmark className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-white sm:text-3xl">Complete your bank transfer</h1>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            Transfer <span className="font-mono text-white">₦{Number(payment.amount_expected).toLocaleString()}</span>{" "}
            to the account below, using the reference exactly as shown.
          </p>
        </div>

        <div className="glass-panel mt-10 p-6 sm:p-8">
          <DetailRow label="Account name" value={bankDetails.accountName} />
          <DetailRow label="Bank name" value={bankDetails.bankName} />
          <DetailRow label="Account number" value={bankDetails.accountNumber} />
          <DetailRow label="Amount" value={`₦${Number(payment.amount_expected).toLocaleString()}`} />
          <DetailRow label="Payment reference" value={payment.bank_reference ?? "—"} />
        </div>

        <p className="mt-4 text-center text-sm text-mist">
          After payment, upload your payment proof below, or wait for our team to confirm it manually.
        </p>

        <div className="glass-panel mt-6 p-6 sm:p-8">
          <BankTransferProofUpload paymentId={payment.id} alreadyUploaded={Boolean(payment.proof_path)} />
        </div>
      </Container>
    </main>
  );
}
