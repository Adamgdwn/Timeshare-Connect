"use client";

type TravelerPaymentActionsProps = {
  bookingId: string;
  status: string;
};

export default function TravelerPaymentActions({ bookingId, status }: TravelerPaymentActionsProps) {
  void bookingId;
  const hoverText = "fix this";

  return (
    <div className="space-y-2" title={hoverText}>
      <div className="flex flex-wrap gap-2" title={hoverText}>
        <button
          className="rounded bg-zinc-900 px-3 py-1.5 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={status !== "awaiting_first_payment"}
          type="button"
          title={hoverText}
        >
          Pay 50% now
        </button>
        <button
          className="rounded bg-zinc-900 px-3 py-1.5 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={status !== "verified_awaiting_final_payment"}
          type="button"
          title={hoverText}
        >
          Pay final 50%
        </button>
      </div>
    </div>
  );
}
