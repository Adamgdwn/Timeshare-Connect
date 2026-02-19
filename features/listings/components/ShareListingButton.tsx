"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ShareListingButtonProps = {
  listingPath: string;
  listingTitle?: string;
};

type ShareMode = "email" | "facebook";

function getShareUrl(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

export default function ShareListingButton({ listingPath, listingTitle = "Timeshare Listing" }: ShareListingButtonProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ShareMode>("email");
  const [email, setEmail] = useState("");
  const [facebookFeedUrl, setFacebookFeedUrl] = useState("");
  const [message, setMessage] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!open) return;
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  function resetMessage() {
    if (message) setMessage("");
  }

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessage();

    if (!email.includes("@")) {
      setMessage("Enter a valid email address.");
      return;
    }

    const shareUrl = getShareUrl(listingPath);
    const subject = encodeURIComponent(`Check out this listing: ${listingTitle}`);
    const body = encodeURIComponent(`I found this timeshare listing and wanted to share it:\n\n${shareUrl}`);
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  }

  async function handleFacebookShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessage();

    const shareUrl = getShareUrl(listingPath);
    const shareText = `${listingTitle} - ${shareUrl}`;

    if (facebookFeedUrl.trim().length > 0) {
      const feedUrl = facebookFeedUrl.startsWith("http") ? facebookFeedUrl : `https://${facebookFeedUrl}`;

      try {
        await navigator.clipboard.writeText(shareText);
        setMessage("Opened your Facebook page. Listing link copied; paste it into your feed.");
      } catch {
        setMessage("Opened your Facebook page. Copy this listing link manually from the browser URL.");
      }

      window.open(feedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookShareUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        className="rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-800"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        Share This Listing
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded border border-zinc-200 bg-white p-3 shadow">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                className={`rounded px-2 py-1 text-xs ${mode === "email" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"}`}
                onClick={() => {
                  setMode("email");
                  resetMessage();
                }}
                type="button"
              >
                Email
              </button>
              <button
                className={`rounded px-2 py-1 text-xs ${mode === "facebook" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"}`}
                onClick={() => {
                  setMode("facebook");
                  resetMessage();
                }}
                type="button"
              >
                Facebook
              </button>
            </div>
            <button
              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
              onClick={() => setOpen(false)}
              type="button"
            >
              Close
            </button>
          </div>

          {mode === "email" ? (
            <form className="space-y-2" onSubmit={handleEmailSubmit}>
              <label className="block text-xs text-zinc-700">
                Recipient email
                <input
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button className="w-full rounded bg-zinc-900 px-2 py-1.5 text-xs text-white" type="submit">
                Open Email Draft
              </button>
            </form>
          ) : (
            <form className="space-y-2" onSubmit={handleFacebookShare}>
              <label className="block text-xs text-zinc-700">
                Facebook feed/profile URL (optional)
                <input
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  placeholder="facebook.com/yourprofile"
                  value={facebookFeedUrl}
                  onChange={(e) => setFacebookFeedUrl(e.target.value)}
                />
              </label>
              <button className="w-full rounded bg-zinc-900 px-2 py-1.5 text-xs text-white" type="submit">
                Share to Facebook
              </button>
            </form>
          )}

          {message ? <p className="mt-2 text-xs text-zinc-700">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
