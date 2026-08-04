/**
 * Mirrors supabase/schema.sql. If you have the Supabase CLI configured,
 * prefer regenerating this with:
 *   supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
 * Kept hand-written here so the project runs without CLI access.
 */

export type RegistrationStatus = "pending" | "contacted" | "payment_pending" | "enrolled" | "declined";

export interface Cohort {
  [key: string]: unknown;
  id: string;
  name: string;
  starts_on: string;
  duration_weeks: number;
  fee_ngn: number;
  slots_total: number | null;
  is_open: boolean;
  created_at: string;
}

export interface Registration {
  [key: string]: unknown;
  id: string;
  cohort_id: string;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  gender: "Female" | "Male" | "Prefer not to say";
  state: string;
  city: string;
  occupation: string;
  education_level: "Secondary school" | "Undergraduate" | "Bachelor's degree" | "Master's degree" | "Other";
  owns_laptop: boolean;
  coding_experience: "None" | "Beginner (self-taught basics)" | "Some coursework" | "Intermediate+";
  heard_about_eti:
    | "Instagram"
    | "TikTok"
    | "X (Twitter)"
    | "LinkedIn"
    | "Friend or referral"
    | "WhatsApp"
    | "Google search"
    | "Other";
  motivation: string;
  preferred_payment_method: "Bank transfer" | "Card payment" | "Installments (if available)";
  agreed_to_terms: boolean;
  status: RegistrationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegistrationInsert {
  [key: string]: unknown;
  cohort_id: string;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  gender: "Female" | "Male" | "Prefer not to say";
  state: string;
  city: string;
  occupation: string;
  education_level: "Secondary school" | "Undergraduate" | "Bachelor's degree" | "Master's degree" | "Other";
  owns_laptop: boolean;
  coding_experience: "None" | "Beginner (self-taught basics)" | "Some coursework" | "Intermediate+";
  heard_about_eti:
    | "Instagram"
    | "TikTok"
    | "X (Twitter)"
    | "LinkedIn"
    | "Friend or referral"
    | "WhatsApp"
    | "Google search"
    | "Other";
  motivation: string;
  preferred_payment_method: "Bank transfer" | "Card payment" | "Installments (if available)";
  agreed_to_terms: boolean;
  status?: RegistrationStatus;
  admin_notes?: string | null;
}

export interface Database {
  public: {
    Tables: {
      cohorts: {
        Row: Cohort;
        Insert: Partial<Cohort>;
        Update: Partial<Cohort>;
        Relationships: [];
      };
      registrations: {
        Row: Registration;
        Insert: RegistrationInsert;
        Update: Partial<Registration>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
