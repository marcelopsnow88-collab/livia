import { getSupabaseOrNull } from "../lib/supabase/client";
import { toAppError } from "../lib/errors";
import type { PlanTier } from "../../lib/plans";

export type BillingInterval = "month" | "year";

export interface SubscriptionSummary {
  plan: PlanTier;
  status: string;
  billingInterval: BillingInterval;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function fetchSubscription(organizationId: string): Promise<SubscriptionSummary | null> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, billing_interval, current_period_end, cancel_at_period_end")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw toAppError(error, "Erro ao carregar assinatura.");

  if (!data) return null;

  return {
    plan: data.plan as PlanTier,
    status: data.status,
    billingInterval: data.billing_interval as BillingInterval,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  };
}

export async function createCheckoutSession(params: {
  organizationId: string;
  plan: Exclude<PlanTier, "Enterprise">;
  interval: BillingInterval;
}): Promise<string> {
  const response = await fetch("/api/stripe/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizationId: params.organizationId,
      plan: params.plan,
      interval: params.interval,
    }),
  });

  const body = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !body.url) {
    throw new Error(body.error ?? "Não foi possível iniciar o checkout.");
  }
  return body.url;
}

export async function createBillingPortalSession(organizationId: string): Promise<string> {
  const response = await fetch("/api/stripe/create-portal-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  });

  const body = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !body.url) {
    throw new Error(body.error ?? "Não foi possível abrir o portal de billing.");
  }
  return body.url;
}

export interface StripeConfigStatus {
  configured: boolean;
  pricesReady: boolean;
  webhookConfigured: boolean;
}

export async function fetchStripeConfig(): Promise<StripeConfigStatus> {
  const response = await fetch("/api/stripe/config");
  if (!response.ok) {
    return { configured: false, pricesReady: false, webhookConfigured: false };
  }
  return response.json() as Promise<StripeConfigStatus>;
}
