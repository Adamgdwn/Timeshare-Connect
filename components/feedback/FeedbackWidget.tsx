"use client";

import { FormEvent, useState } from "react";

type FeedbackKind = "bug" | "idea";

function getKindLabel(kind: FeedbackKind) {
  return kind === "bug" ? "Bug" : "Idea";
}

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function openDialog(nextKind: FeedbackKind) {
    setKind(nextKind);
    setStatus("");
    setIsOpen(true);
  }

  function closeDialog() {
    setIsOpen(false);
    setTitle("");
    setDetails("");
    setStatus("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!details.trim()) {
      setStatus("Please add details.");
      return;
    }

    setIsSubmitting(true);
    try {
      const pageUrl = typeof window !== "undefined" ? window.location.href : "";
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim(),
          details: details.trim(),
          pageUrl,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setStatus(data.error || "Failed to send feedback.");
        return;
      }

      setStatus("Thanks. Your feedback was sent.");
      setTitle("");
      setDetails("");
    } catch {
      setStatus("Failed to send feedback.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 flex gap-2">
        <button
          className="tc-btn-secondary rounded px-3 py-2 text-xs shadow-sm"
          onClick={() => openDialog("bug")}
          type="button"
        >
          Report a bug
        </button>
        <button
          className="tc-btn-primary rounded px-3 py-2 text-xs shadow-sm"
          onClick={() => openDialog("idea")}
          type="button"
        >
          Report an idea
        </button>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeDialog}
          role="presentation"
        >
          <div
            className="tc-surface w-full max-w-lg rounded-xl p-4"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h2 className="tc-title text-base font-semibold">Report {getKindLabel(kind)}</h2>
              <button className="tc-btn-secondary rounded px-2 py-1 text-xs" onClick={closeDialog} type="button">
                Close
              </button>
            </div>

            <form className="mt-3 space-y-3" onSubmit={onSubmit}>
              <label className="block text-sm">
                Type
                <select
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                  value={kind}
                  onChange={(event) => setKind(event.target.value as FeedbackKind)}
                >
                  <option value="bug">Bug</option>
                  <option value="idea">Idea</option>
                </select>
              </label>

              <label className="block text-sm">
                Short title
                <input
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                  placeholder={kind === "bug" ? "What broke?" : "What should we add?"}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label className="block text-sm">
                Details
                <textarea
                  className="mt-1 min-h-28 w-full rounded border border-zinc-300 px-3 py-2"
                  placeholder="Describe what happened, expected behavior, and steps to reproduce (for bugs)."
                  required
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                />
              </label>

              <button className="tc-btn-primary rounded px-4 py-2 text-sm disabled:opacity-60" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Sending..." : "Send feedback"}
              </button>

              {status ? <p className="text-xs text-zinc-700">{status}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
