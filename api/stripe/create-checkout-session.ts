import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "../../lib/supabase-admin";
import { getStripe, resolvePriceId, getAppUrl, isStripeConfigured } from "../../lib/stripe";
import type { BillingInterval, PlanTier } from "../../lib/plans";
import { PLANS } from "../../lib/plans";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isStripeConfigured()) {
    return res.status(503).json({ error: "Stripe não configurado. Defina STRIPE_SECRET_KEY." });
  }

  const { organizationId, plan, interval } = req.body as {
    organizationId?: string;
    plan?: PlanTier;
    interval?: BillingInterval;
  };

  if (!organizationId || !plan || !interval) {
    return res.status(400).json({ error: "organizationId, plan e interval são obrigatórios." });
  }

  if (plan === "Enterprise" || !PLANS[plan as keyof typeof PLANS]) {
    return res.status(400).json({ error: "Plano inválido ou indisponível para checkout." });
  }

  try {
    const supabase = getSupabaseAdmin();
    const stripe = getStripe();

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, responsible_name")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada." });
    }

    const priceId = resolvePriceId(plan, interval);
    const appUrl = getAppUrl();

    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { organization_id: organizationId },
      });
      customerId = customer.id;

      await supabase.from("subscriptions").upsert(
        {
          organization_id: organizationId,
          stripe_customer_id: customerId,
          plan,
          billing_interval: interval,
          status: "incomplete",
        },
        { onConflict: "organization_id" }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?view=client&page=plano&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?view=client&page=plano&checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      integration_identifier: `livia_${plan.toLowerCase()}_${interval}`,
      metadata: {
        organization_id: organizationId,
        plan,
        billing_interval: interval,
      },
      subscription_data: {
        metadata: {
          organization_id: organizationId,
          plan,
          billing_interval: interval,
        },
      },
    });

    if (!session.url) {
      return res.status(500).json({ error: "Stripe não retornou URL de checkout." });
    }

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar checkout.";
    console.error("[stripe/checkout]", message);
    return res.status(500).json({ error: message });
  }
}
