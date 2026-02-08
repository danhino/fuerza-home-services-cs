import type { Trade } from "@prisma/client";

// MVP pricing: flat estimates per trade (in cents).
// Phase 2: incorporate scheduling, distance, time-of-day, surge, historicals.
const BASE_PRICE_CENTS: Record<Trade, number> = {
  plumber: 14900,
  electrician: 16900,
  hvac: 18900,
  cleaning: 12900,
  pool: 15900
};

export function getFlatEstimateCents(trade: Trade): number {
  return BASE_PRICE_CENTS[trade];
}


