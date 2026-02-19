type BookingStatusStepsProps = {
  status: string;
};

const statusOrder = [
  "requested",
  "awaiting_first_payment",
  "first_payment_paid",
  "owner_booked_pending_verification",
  "verified_awaiting_final_payment",
  "fully_paid",
] as const;

const stepLabels: Record<(typeof statusOrder)[number], string> = {
  requested: "Request created",
  awaiting_first_payment: "Traveler pays first 50%",
  first_payment_paid: "Owner books with resort",
  owner_booked_pending_verification: "Owner uploaded confirmation proof",
  verified_awaiting_final_payment: "Admin verified, traveler pays final 50%",
  fully_paid: "Booking completed",
};

function statusIndex(status: string) {
  const idx = statusOrder.indexOf(status as (typeof statusOrder)[number]);
  return idx >= 0 ? idx : 0;
}

export default function BookingStatusSteps({ status }: BookingStatusStepsProps) {
  const current = statusIndex(status);

  return (
    <ol className="space-y-2">
      {statusOrder.map((step, idx) => {
        const complete = idx <= current;
        return (
          <li className="flex items-start gap-3" key={step}>
            <span
              className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                complete ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-700"
              }`}
            >
              {idx + 1}
            </span>
            <span className={`text-sm ${complete ? "text-zinc-900" : "text-zinc-500"}`}>{stepLabels[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
