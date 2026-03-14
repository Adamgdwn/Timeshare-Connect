export type ProfileRole = "traveler" | "owner" | "both" | "admin";
export type SignupProfileRole = Exclude<ProfileRole, "admin">;
export type LoginDestination = "traveler" | "owner";

export function getRedirectPath(role: ProfileRole, destination?: LoginDestination) {
  if (role === "admin") return "/admin";
  if (role === "both" && destination === "owner") return "/dashboard";
  if (role === "both") return "/trips";
  if (role === "owner") return "/dashboard";
  return "/trips";
}

export function getSignupRoleFromMetadata(metadata: unknown): SignupProfileRole | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const role = (metadata as { role?: unknown }).role;
  if (role === "traveler" || role === "owner" || role === "both") {
    return role;
  }

  return null;
}

export function getFullNameFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const fullName = (metadata as { full_name?: unknown }).full_name;
  return typeof fullName === "string" && fullName.trim() ? fullName.trim() : null;
}

export function getSafeNextPath(next: string | null | undefined, fallback = "/trips") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}
