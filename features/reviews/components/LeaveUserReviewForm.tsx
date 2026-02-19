"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LeaveUserReviewFormProps = {
  bookingId: string;
  reviewedUserId: string;
  targetLabel: string;
};

export default function LeaveUserReviewForm({ bookingId, reviewedUserId, targetLabel }: LeaveUserReviewFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const numericRating = Number(rating);
      if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        throw new Error("Rating must be 1 to 5.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("You must be logged in to leave a review.");

      const { error } = await supabase.from("user_reviews").insert({
        booking_id: bookingId,
        reviewer_id: user.id,
        reviewed_user_id: reviewedUserId,
        rating: numericRating,
        comment: comment || null,
      });

      if (error) throw error;
      setMessage("Review submitted.");
      setComment("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-2 rounded border border-zinc-200 p-3" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold">Rate {targetLabel}</h3>
      <label className="block text-xs">
        Rating
        <select
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        >
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Good</option>
          <option value="3">3 - Okay</option>
          <option value="2">2 - Poor</option>
          <option value="1">1 - Bad</option>
        </select>
      </label>
      <textarea
        className="min-h-20 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button
        className="rounded border border-zinc-300 px-3 py-1.5 text-xs disabled:opacity-50"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Submitting..." : "Submit review"}
      </button>
      {message ? <p className="text-xs text-zinc-700">{message}</p> : null}
    </form>
  );
}
