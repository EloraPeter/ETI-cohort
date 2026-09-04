import { ClipboardList, CreditCard, GraduationCap, CalendarDays, BookOpen, FolderOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Registrations", icon: ClipboardList },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/instructors", label: "Instructors", icon: GraduationCap },
  { href: "/admin/cohorts", label: "Cohorts", icon: CalendarDays },
  { href: "/admin/curriculum", label: "Curriculum", icon: BookOpen },
  { href: "/admin/resources", label: "Resources", icon: FolderOpen },
];
