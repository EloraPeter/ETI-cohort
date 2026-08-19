/**
 * Mirrors supabase/migrations/*.sql. If you have the Supabase CLI
 * configured, prefer regenerating this with:
 *   supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
 * Kept hand-written here so the project runs without CLI access.
 */

export type RegistrationStatus =
  | "pending" | "contacted" | "payment_pending" | "enrolled" | "declined" // legacy — may still exist on old rows
  | "pending_payment"
  | "payment_processing"
  | "paid"
  | "failed"
  | "cancelled";

export type PaymentMethod = "Paystack" | "Bank Transfer";

export type PaymentStatus = "pending_payment" | "payment_processing" | "paid" | "failed" | "cancelled";

export type Gender = "Female" | "Male" | "Prefer not to say";
export type EducationLevel = "Secondary school" | "Undergraduate" | "Bachelor's degree" | "Master's degree" | "Other";
export type CodingExperience = "None" | "Beginner (self-taught basics)" | "Some coursework" | "Intermediate+";
export type HearAboutEti =
  | "Instagram"
  | "TikTok"
  | "X (Twitter)"
  | "LinkedIn"
  | "Friend or referral"
  | "WhatsApp"
  | "Google search"
  | "Other";

export interface Cohort {
  [key: string]: unknown;
  id: string;
  name: string;
  starts_on: string;
  duration_weeks: number;
  fee_ngn: number;
  slots_total: number | null;
  is_open: boolean;
  timezone: string;
  created_at: string;
  weekly_schedule: WeeklyScheduleEntry[] | null;
}

export interface WeeklyScheduleEntry {
  day: string;
  start_time: string;
  end_time: string;
}

export interface Registration {
  [key: string]: unknown;
  id: string;
  cohort_id: string;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  gender: Gender;
  state: string;
  city: string;
  occupation: string;
  education_level: EducationLevel;
  owns_laptop: boolean;
  coding_experience: CodingExperience;
  heard_about_eti: HearAboutEti;
  motivation: string;
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
  gender: Gender;
  state: string;
  city: string;
  occupation: string;
  education_level: EducationLevel;
  owns_laptop: boolean;
  coding_experience: CodingExperience;
  heard_about_eti: HearAboutEti;
  motivation: string;
  agreed_to_terms: boolean;
  status?: RegistrationStatus;
  admin_notes?: string | null;
}

export interface Payment {
  [key: string]: unknown;
  id: string;
  registration_id: string;
  cohort_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount_expected: number;
  amount_paid: number | null;
  currency: string;
  paystack_reference: string | null;
  paystack_transaction_id: string | null;
  paystack_authorization_url: string | null;
  bank_reference: string | null;
  proof_path: string | null;
  proof_uploaded_at: string | null;
  payment_date: string | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  recovery_token_hash: string | null;
  recovery_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentInsert {
  [key: string]: unknown;
  registration_id: string;
  cohort_id: string;
  method: PaymentMethod;
  amount_expected: number;
  status?: PaymentStatus;
  currency?: string;
}

export interface Student {
  [key: string]: unknown;
  id: string;
  student_code: string;
  registration_id: string;
  cohort_id: string;
  full_name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "withdrawn";
  enrolled_at: string;
  created_at: string;
  auth_user_id: string | null;
  preferred_name: string | null;
  timezone: string | null;
  laptop_ready: boolean;
  profile_completed_at: string | null;
}

export interface StudentInsert {
  [key: string]: unknown;
  registration_id: string;
  cohort_id: string;
  full_name: string;
  email: string;
  phone: string;
  status?: "active" | "inactive" | "withdrawn";
}

export type ChecklistItemType = "task" | "video" | "download" | "redirect" | "composite";
export type CompletionMethod = "manual" | "button_click" | "system_verified" | "parent_auto";
export type CompletionSource = "manual" | "button_click" | "video_complete" | "system_verified" | "parent_auto";

export interface ChecklistItem {
  [key: string]: unknown;
  id: string;
  item_key: string;
  parent_id: string | null;
  cohort_id: string | null;
  title: string;
  description: string | null;
  item_type: ChecklistItemType;
  action_url: string | null;
  action_label: string | null;
  completion_method: CompletionMethod;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface StudentChecklistProgress {
  [key: string]: unknown;
  id: string;
  student_id: string;
  checklist_item_id: string;
  completed_at: string | null;
  completion_source: CompletionSource | null;
  created_at: string;
}

/** A checklist item joined with the student's progress on it, used
 *  throughout the dashboard/API rather than the two raw tables. */
export interface ChecklistItemWithProgress extends ChecklistItem {
  completed_at: string | null;
  completion_source: CompletionSource | null;
  children: ChecklistItemWithProgress[];
}

export type InstructorStatus = "invited" | "active" | "inactive";

export interface Instructor {
  [key: string]: unknown;
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  professional_title: string | null;
  expertise: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  auth_user_id: string | null;
  status: InstructorStatus;
  profile_completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstructorInsert {
  [key: string]: unknown;
  full_name: string;
  email: string;
  phone?: string | null;
  status?: InstructorStatus;
  created_by?: string | null;
}

export interface InstructorCohort {
  [key: string]: unknown;
  id: string;
  instructor_id: string;
  cohort_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface InstructorCohortInsert {
  [key: string]: unknown;
  instructor_id: string;
  cohort_id: string;
  assigned_by?: string | null;
}

/** The 5 fields that determine instructor profile-completion percentage.
 *  Kept in one place so the derivation logic and any future UI stay in sync. */
export const INSTRUCTOR_REQUIRED_PROFILE_FIELDS = [
  "full_name",
  "email",
  "phone",
  "profile_photo_url",
  "bio",
] as const;

export interface Database {
  public: {
    Tables: {
      instructors: {
        Row: Instructor;
        Insert: InstructorInsert;
        Update: Partial<Instructor>;
        Relationships: [];
      };
      instructor_cohorts: {
        Row: InstructorCohort;
        Insert: InstructorCohortInsert;
        Update: Partial<InstructorCohort>;
        Relationships: [];
      };
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
      payments: {
        Row: Payment;
        Insert: PaymentInsert;
        Update: Partial<Payment>;
        Relationships: [];
      };
      students: {
        Row: Student;
        Insert: StudentInsert;
        Update: Partial<Student>;
        Relationships: [];
      };
      student_checklist_progress: {
        Row: StudentChecklistProgress;
        Insert: Partial<StudentChecklistProgress>;
        Update: Partial<StudentChecklistProgress>;
        Relationships: [];
      };
      checklist_items: {
        Row: ChecklistItem;
        Insert: Partial<ChecklistItem>;
        Update: Partial<ChecklistItem>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
