"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminUserActionsProps = {
  userId: string;
  currentStatus: "active" | "on_hold" | "banned";
};

export default function AdminUserActions({ userId, currentStatus }: AdminUserActionsProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<"active" | "on_hold" | "banned" | null>(null);
  const [message, setMessage] = useState("");

  async function updateStatus(nextStatus: "active" | "on_hold" | "banned") {
    setLoading(nextStatus);
    setMessage("");

    try {
      if (nextStatus !== "active" && reason.trim().length < 5) {
        throw new Error("Provide a reason (at least 5 characters) for hold/ban.");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          account_status: nextStatus,
          status_reason: nextStatus === "active" ? null : reason.trim(),
          status_updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;
      setMessage(`User set to ${nextStatus}.`);
      setReason("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update user.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <input
        className="w-full rounded border border-zinc-300 px-2 py-1 text-xs"
        placeholder="Reason (required for hold/ban)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex flex-wrap gap-1">
        <button
          className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50"
          disabled={loading !== null || currentStatus === "active"}
          onClick={() => updateStatus("active")}
          type="button"
        >
          {loading === "active" ? "..." : "Activate"}
        </button>
        <button
          className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50"
          disabled={loading !== null || currentStatus === "on_hold"}
          onClick={() => updateStatus("on_hold")}
          type="button"
        >
          {loading === "on_hold" ? "..." : "Hold"}
        </button>
        <button
          className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50"
          disabled={loading !== null || currentStatus === "banned"}
          onClick={() => updateStatus("banned")}
          type="button"
        >
          {loading === "banned" ? "..." : "Ban"}
        </button>
      </div>
      {message ? <p className="text-xs text-zinc-700">{message}</p> : null}
    </div>
  );
}
