import { z } from "zod";

export const genderOptions = ["Female", "Male", "Prefer not to say"] as const;
export const educationOptions = [
  "Secondary school",
  "Undergraduate",
  "Bachelor's degree",
  "Master's degree",
  "Other",
] as const;
export const experienceOptions = ["None", "Beginner (self-taught basics)", "Some coursework", "Intermediate+"] as const;
export const hearAboutOptions = [
  "Instagram",
  "TikTok",
  "X (Twitter)",
  "LinkedIn",
  "Friend or referral",
  "WhatsApp",
  "Google search",
  "Other",
] as const;
export const paymentMethodOptions = ["Bank transfer", "Card payment", "Installments (if available)"] as const;

export const registrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "That name looks too long — check for a typo."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{7,20}$/, "Enter a valid phone number."),
  age: z.coerce
    .number({ invalid_type_error: "Enter your age as a number." })
    .int("Age must be a whole number.")
    .min(14, "You must be at least 14 to register.")
    .max(100, "Check the age entered."),
  gender: z.enum(genderOptions, { errorMap: () => ({ message: "Select an option." }) }),
  state: z.string().trim().min(2, "Enter your state."),
  city: z.string().trim().min(2, "Enter your city."),
  occupation: z.string().trim().min(2, "Enter your occupation."),
  educationLevel: z.enum(educationOptions, { errorMap: () => ({ message: "Select your education level." }) }),
  ownsLaptop: z.enum(["Yes", "No"], { errorMap: () => ({ message: "Select an option." }) }),
  codingExperience: z.enum(experienceOptions, { errorMap: () => ({ message: "Select an option." }) }),
  hearAboutETI: z.enum(hearAboutOptions, { errorMap: () => ({ message: "Select an option." }) }),
  motivation: z
    .string()
    .trim()
    .min(20, "Tell us a little more — at least 20 characters.")
    .max(1000, "Keep it under 1000 characters."),
  paymentMethod: z.enum(paymentMethodOptions, { errorMap: () => ({ message: "Select a payment method." }) }),
  agreesToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to continue." }),
  }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
