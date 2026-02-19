"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isLoading}
      onClick={handleSignOut}
      type="button"
    >
      {isLoading ? "Logging out..." : "Log out"}
    </button>
  );
}
