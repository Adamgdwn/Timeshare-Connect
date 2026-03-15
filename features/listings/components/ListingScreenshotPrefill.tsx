"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  AI_PREFILL_FIELD_LABELS,
  AI_PREFILL_MAX_FILE_BYTES,
  AI_PREFILL_MAX_FILES,
  type AiListingPrefillResult,
} from "@/lib/listings/aiPrefill";

type ListingScreenshotPrefillProps = {
  onApply: (result: AiListingPrefillResult) => void;
};

export default function ListingScreenshotPrefill({ onApply }: ListingScreenshotPrefillProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<AiListingPrefillResult | null>(null);

  const helperCopy = useMemo(
    () =>
      `Best results come from ${AI_PREFILL_MAX_FILES} or fewer screenshots that clearly show the resort name, unit details, dates, and the portal header.`,
    []
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const nextFiles = selected.slice(0, AI_PREFILL_MAX_FILES);

    if (selected.length > AI_PREFILL_MAX_FILES) {
      setMessage(`Only the first ${AI_PREFILL_MAX_FILES} screenshots were kept.`);
    } else {
      setMessage("");
    }

    setFiles(nextFiles);
    setResult(null);
  }

  async function handleAnalyze() {
    setMessage("");
    setResult(null);

    if (files.length === 0) {
      setMessage("Upload at least one screenshot to analyze.");
      return;
    }

    const oversize = files.find((file) => file.size > AI_PREFILL_MAX_FILE_BYTES);
    if (oversize) {
      setMessage(`${oversize.name} is larger than ${AI_PREFILL_MAX_FILE_BYTES / (1024 * 1024)} MB.`);
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("screenshots", file));

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/listing-prefill", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        data?: AiListingPrefillResult;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "Unable to analyze screenshots.");
      }

      setResult(payload.data);
      onApply(payload.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to analyze screenshots.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-amber-50 via-white to-zinc-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">AI screenshot prefill</p>
          <p className="text-xs text-zinc-600">{helperCopy}</p>
        </div>
        <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs text-zinc-700">
          Review required before publish
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <label className="block rounded-2xl border border-dashed border-zinc-300 bg-white p-4 text-sm">
            Upload portal screenshots
            <input
              accept="image/*"
              className="mt-2 block w-full text-sm"
              multiple
              onChange={handleFileChange}
              type="file"
            />
          </label>

          {files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {files.map((file) => (
                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700" key={file.name}>
                  {file.name}
                </span>
              ))}
            </div>
          ) : null}

          <button
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isAnalyzing || files.length === 0}
            onClick={handleAnalyze}
            type="button"
          >
            {isAnalyzing ? "Analyzing screenshots..." : "Analyze screenshots"}
          </button>

          {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          {result ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">AI draft applied</p>
                <p className="mt-1 text-sm text-zinc-700">{result.summary}</p>
              </div>

              {result.reviewRequired.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Review these fields</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.reviewRequired.map((field) => (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900" key={field}>
                        {AI_PREFILL_FIELD_LABELS[field]}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {result.warnings.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Warnings</p>
                  <div className="mt-2 space-y-1">
                    {result.warnings.map((warning) => (
                      <p className="text-sm text-zinc-700" key={warning}>
                        {warning}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold">What it can prefill</p>
              <p className="text-sm text-zinc-600">
                Resort name, portal mapping, unit type, ownership style, visible dates, week number, points, and obvious notes.
              </p>
              <p className="text-sm text-zinc-600">
                It will not publish anything for the owner, and uncertain fields are flagged for review.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
