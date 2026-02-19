import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

type Role = "traveler" | "owner" | "both" | "admin";

function getRequiredRole(pathname: string): Role | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/trips" || pathname.startsWith("/trips/")) return "traveler";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "owner";
  if (pathname === "/offers" || pathname.startsWith("/offers/")) return "owner";
  if (pathname === "/inventory" || pathname.startsWith("/inventory/")) return "owner";
  if (pathname === "/listings/new" || pathname.startsWith("/listings/new/")) return "owner";
  return null;
}

function roleHome(role: Role) {
  if (role === "admin") return "/admin";
  if (role === "both") return "/trips";
  if (role === "owner") return "/dashboard";
  return "/trips";
}

function hasAccess(role: Role, required: Role) {
  if (role === "admin") return true;
  if (required === "owner") return role === "owner" || role === "both";
  return role === "traveler" || role === "both";
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: Role | null = null;
  let accountStatus: "active" | "on_hold" | "banned" | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,account_status")
      .eq("id", user.id)
      .maybeSingle();

    role = (profile?.role as Role | null) ?? null;
    accountStatus = (profile?.account_status as "active" | "on_hold" | "banned" | null) ?? null;
  }

  if (user && accountStatus && accountStatus !== "active" && pathname !== "/login") {
    const blockedUrl = new URL("/login", request.url);
    blockedUrl.searchParams.set("blocked", accountStatus);
    return NextResponse.redirect(blockedUrl);
  }

  if (pathname === "/login" && role) {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  const required = getRequiredRole(pathname);

  if (!required) {
    return response;
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!hasAccess(role, required)) {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
