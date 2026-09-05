export type Role = "student" | "instructor" | "admin";

export const LOGIN_PATH: Record<Role, string> = {
  student: "/login",
  instructor: "/instructor/login",
  admin: "/admin",
};

export function isRole(value: unknown): value is Role {
  return value === "student" || value === "instructor" || value === "admin";
}
