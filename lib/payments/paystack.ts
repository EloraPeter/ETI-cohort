import "server-only";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function paystackHeaders() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
}

export interface InitializeTransactionParams {
  email: string;
  amountNgn: number; // whole naira — converted to kobo internally
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export async function initializePaystackTransaction(
  params: InitializeTransactionParams
): Promise<InitializeTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: paystackHeaders(),
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountNgn * 100), // Paystack expects kobo
      currency: "NGN",
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  const body = await res.json();
  if (!res.ok || !body.status) {
    throw new Error(body?.message ?? "Paystack could not initialize the transaction.");
  }

  return {
    authorizationUrl: body.data.authorization_url,
    accessCode: body.data.access_code,
    reference: body.data.reference,
  };
}

export interface VerifyTransactionResult {
  reference: string;
  status: "success" | "failed" | "abandoned" | string;
  amountKobo: number;
  currency: string;
  paidAt: string | null;
  transactionId: string;
  customerEmail: string | null;
}

export async function verifyPaystackTransaction(reference: string): Promise<VerifyTransactionResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: paystackHeaders(),
    cache: "no-store",
  });

  const body = await res.json();
  if (!res.ok || !body.status) {
    throw new Error(body?.message ?? "Paystack could not verify this transaction.");
  }

  const data = body.data;
  return {
    reference: data.reference,
    status: data.status,
    amountKobo: data.amount,
    currency: data.currency,
    paidAt: data.paid_at ?? null,
    transactionId: String(data.id),
    customerEmail: data.customer?.email ?? null,
  };
}
