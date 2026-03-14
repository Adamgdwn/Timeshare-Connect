import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  getFullNameFromMetadata,
  getRedirectPath,
  getSafeNextPath,
  getSignupRoleFromMetadata,
  type ProfileRole,
} from "@/lib/auth/profile";
import { createServerClient } from "@/lib/supabase/server";

async function ensureConfirmedUserProfile() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (profile?.role) {
    return profile.role as ProfileRole;
  }

  const fallbackRole = getSignupRoleFromMetadata(user.user_metadata) ?? "traveler";
  const fallbackFullName = getFullNameFromMetadata(user.user_metadata);

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    role: fallbackRole,
    full_name: fallbackFullName,
  });

  if (insertError) {
    throw insertError;
  }

  return fallbackRole;
}

function buildLoginRedirect(request: NextRequest, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createServerClient();

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        throw error;
      }
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });

      if (error) {
        throw error;
      }
    } else {
      return buildLoginRedirect(request, "Missing confirmation token.");
    }

    const role = await ensureConfirmedUserProfile();
    const destination = role ? getRedirectPath(role) : nextPath;
    return NextResponse.redirect(new URL(destination, request.url));
  } catch {
    return buildLoginRedirect(request, "Confirmation link is invalid or expired.");
  }
}
