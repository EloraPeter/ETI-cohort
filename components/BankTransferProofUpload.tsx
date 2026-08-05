"use client";

import { useState } from "react";
import { UploadCloud, Loader2, CheckCircle2 } from "lucide-react";

export function BankTransferProofUpload({ paymentId, alreadyUploaded }: { paymentId: string; alreadyUploaded: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    alreadyUploaded ? "done" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("paymentId", paymentId);
    formData.append("file", file);

    try {
      const res = await fetch("/api/payments/bank-transfer/upload-proof", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Upload failed. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-white">Proof received</p>
          <p className="mt-1 text-sm text-mist">
            Our admissions team will review it and confirm your payment shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </p>
      )}

      <label
        htmlFor="proof-file"
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-white/15 px-6 py-8 text-center transition-colors hover:border-signal-400"
      >
        <UploadCloud className="h-6 w-6 text-signal-400" aria-hidden="true" />
        <span className="text-sm text-white/90">{file ? file.name : "Click to choose your receipt"}</span>
        <span className="text-xs text-mist">PNG, JPG, WEBP, or PDF — max 5MB</span>
        <input
          id="proof-file"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <button type="submit" disabled={status === "uploading"} className="btn-primary w-full disabled:opacity-60">
        {status === "uploading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Uploading...
          </>
        ) : (
          "Upload payment proof"
        )}
      </button>
    </form>
  );
}
