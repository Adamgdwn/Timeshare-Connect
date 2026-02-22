"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function GlobalNav() {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/home");
  }

  return (
    <div className="border-b border-[var(--tc-border)]/90 bg-[color:var(--tc-surface)]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3">
        <button
          className="tc-btn-secondary rounded px-3 py-1.5 text-sm"
          onClick={handleBack}
          type="button"
        >
          Back
        </button>
        <Link className="tc-btn-secondary rounded px-3 py-1.5 text-sm" href="/home">
          Home
        </Link>
      </div>
    </div>
  );
}
