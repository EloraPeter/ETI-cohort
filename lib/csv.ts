import type { Registration } from "@/lib/supabase/types";

const COLUMNS: { key: keyof Registration; header: string }[] = [
  { key: "full_name", header: "Full Name" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "age", header: "Age" },
  { key: "gender", header: "Gender" },
  { key: "state", header: "State" },
  { key: "city", header: "City" },
  { key: "occupation", header: "Occupation" },
  { key: "education_level", header: "Education Level" },
  { key: "owns_laptop", header: "Owns Laptop" },
  { key: "coding_experience", header: "Coding Experience" },
  { key: "heard_about_eti", header: "Heard About ETI" },
  { key: "preferred_payment_method", header: "Payment Method" },
  { key: "status", header: "Status" },
  { key: "created_at", header: "Registered At" },
];

function escapeCsvValue(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function registrationsToCsv(rows: Registration[]): string {
  const header = COLUMNS.map((c) => c.header).join(",");
  const lines = rows.map((row) => COLUMNS.map((c) => escapeCsvValue(row[c.key])).join(","));
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
