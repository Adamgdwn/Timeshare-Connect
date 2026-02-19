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
    <div className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3">
        <button
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800"
          onClick={handleBack}
          type="button"
        >
          Back
        </button>
        <Link className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800" href="/home">
          Home
        </Link>
      </div>
    </div>
  );
}
