import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isStripeConfigured } from "../../lib/stripe";
import { getStripePriceEnvKey, PLANS } from "../../lib/plans";
import type { PlanTier } from "../../lib/plans";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const configured = isStripeConfigured();
  const prices: Record<string, boolean> = {};

  for (const tier of Object.keys(PLANS) as Exclude<PlanTier, "Enterprise">[]) {
    for (const interval of ["month", "year"] as const) {
      const envKey = getStripePriceEnvKey(tier, interval);
      const value = process.env[envKey];
      prices[envKey] = Boolean(value && !value.includes("..."));
    }
  }

  const pricesReady = Object.values(prices).every(Boolean);

  return res.status(200).json({
    configured,
    pricesReady,
    prices,
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.includes("...")),
  });
}
