"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  destinationInputId: string;
  checkInInputId: string;
  checkOutInputId: string;
  guestsInputId?: string;
};

type LookupState = {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TravelerHotelPriceLookup({
  destinationInputId,
  checkInInputId,
  checkOutInputId,
  guestsInputId,
}: Props) {
  const [state, setState] = useState<LookupState>({
    destination: "",
    checkIn: "",
    checkOut: "",
    guests: 2,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  const isReady = useMemo(
    () => state.destination && state.checkIn && state.checkOut && state.checkOut > state.checkIn,
    [state]
  );

  useEffect(() => {
    function readFormValues() {
      const destinationInput = document.getElementById(
        destinationInputId
      ) as HTMLInputElement | null;
      const checkInInput = document.getElementById(checkInInputId) as HTMLInputElement | null;
      const checkOutInput = document.getElementById(checkOutInputId) as HTMLInputElement | null;
      const guestsInput = guestsInputId
        ? ((document.getElementById(guestsInputId) as HTMLInputElement | null) ?? null)
        : null;

      if (!destinationInput || !checkInInput || !checkOutInput) {
        return;
      }

      setState({
        destination: destinationInput.value.trim(),
        checkIn: checkInInput.value.trim(),
        checkOut: checkOutInput.value.trim(),
        guests: Math.max(1, Number(guestsInput?.value || 2)),
      });
    }

    readFormValues();

    const destinationInput = document.getElementById(destinationInputId);
    const checkInInput = document.getElementById(checkInInputId);
    const checkOutInput = document.getElementById(checkOutInputId);
    const guestsInput = guestsInputId ? document.getElementById(guestsInputId) : null;

    const inputs = [destinationInput, checkInInput, checkOutInput, guestsInput].filter(
      Boolean
    ) as HTMLElement[];

    const handler = () => readFormValues();
    inputs.forEach((input) => {
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    });

    return () => {
      inputs.forEach((input) => {
        input.removeEventListener("input", handler);
        input.removeEventListener("change", handler);
      });
    };
  }, [destinationInputId, checkInInputId, checkOutInputId, guestsInputId]);

  useEffect(() => {
    if (!isReady) {
      setStatus("idle");
      setMessage("");
      return;
    }

    const timeout = setTimeout(async () => {
      setStatus("loading");
      setMessage("");

      try {
        const response = await fetch("/api/hotel-pricing", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            destination: state.destination,
            checkIn: state.checkIn,
            checkOut: state.checkOut,
            adults: state.guests,
          }),
        });

        const payload = (await response.json()) as {
          nightlyUsd?: number;
          totalUsd?: number;
          error?: string;
        };

        if (!response.ok || !payload.nightlyUsd || !payload.totalUsd) {
          throw new Error(payload.error || "No price available");
        }

        setMessage(
          `Estimated normal hotel price: ${formatMoney(payload.totalUsd)} total (${formatMoney(payload.nightlyUsd)}/night)`
        );
        setStatus("ready");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to lookup hotel pricing.");
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [isReady, state.checkIn, state.checkOut, state.destination, state.guests]);

  if (status === "idle") {
    return (
      <p className="mt-2 text-xs text-zinc-600">
        Enter destination and dates to auto-check normal hotel pricing.
      </p>
    );
  }

  if (status === "loading") {
    return <p className="mt-2 text-xs text-zinc-600">Checking normal hotel pricing...</p>;
  }

  return (
    <p className={`mt-2 text-xs ${status === "ready" ? "text-emerald-700" : "text-amber-700"}`}>
      {message}
    </p>
  );
}

