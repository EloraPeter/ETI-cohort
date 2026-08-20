import type { Instructor } from "@/lib/supabase/types";
import { INSTRUCTOR_REQUIRED_PROFILE_FIELDS } from "@/lib/supabase/types";

export interface ProfileCompletion {
  completedCount: number;
  totalCount: number;
  percent: number;
  missingFields: string[];
  isComplete: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Full name",
  email: "Email",
  phone: "Phone number",
  profile_photo_url: "Profile photo",
  bio: "Short bio",
};

/**
 * Derives profile-completion from the instructor row itself — never
 * stored as a number. Recompute this any time the row is read or
 * updated so it can never drift out of sync with the actual fields.
 */
export function getInstructorProfileCompletion(instructor: Instructor): ProfileCompletion {
  const missingFields: string[] = [];

  for (const field of INSTRUCTOR_REQUIRED_PROFILE_FIELDS) {
    const value = instructor[field];
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
      missingFields.push(FIELD_LABELS[field] ?? field);
    }
  }

  const totalCount = INSTRUCTOR_REQUIRED_PROFILE_FIELDS.length;
  const completedCount = totalCount - missingFields.length;

  return {
    completedCount,
    totalCount,
    percent: Math.round((completedCount / totalCount) * 100),
    missingFields,
    isComplete: missingFields.length === 0,
  };
}
