import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function RoleHomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    redirect("/admin");
  }

  if (profile?.role === "owner" || profile?.role === "both") {
    redirect("/dashboard");
  }

  redirect("/");
}

