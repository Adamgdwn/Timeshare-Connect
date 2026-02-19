export const PLATFORM_FEE_RATE = 0.05;

export function calculatePayoutBreakdown(grossAmountCents: number) {
  const platformFeeCents = Math.round(grossAmountCents * PLATFORM_FEE_RATE);
  const ownerNetCents = Math.max(0, grossAmountCents - platformFeeCents);

  return {
    grossAmountCents,
    platformFeeCents,
    ownerNetCents,
  };
}
