import Stripe from "stripe";
import type { BillingInterval, PlanTier } from "./plans";
import { getStripePriceEnvKey } from "./plans";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function resolvePriceId(tier: PlanTier, interval: BillingInterval): string {
  if (tier === "Enterprise") {
    throw new Error("Plano Enterprise é sob consulta.");
  }
  const envKey = getStripePriceEnvKey(tier, interval);
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new Error(`Price ID Stripe não configurado (${envKey}).`);
  }
  return priceId;
}

export function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VITE_APP_URL) return process.env.VITE_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:5173";
}
