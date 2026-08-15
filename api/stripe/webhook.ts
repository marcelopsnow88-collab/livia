import type { VercelRequest, VercelResponse } from "@vercel/node";
import type Stripe from "stripe";
import { getSupabaseAdmin } from "../../lib/supabase-admin";
import { getStripe } from "../../lib/stripe";
import { mapStripePriceToPlan } from "../../lib/plans";
import type { Json } from "../../src/lib/supabase/types";

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer | string) => {
      data += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function recordStripeEvent(supabase: ReturnType<typeof getSupabaseAdmin>, event: Stripe.Event) {
  await supabase.from("stripe_webhook_events").upsert(
    {
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Json,
    },
    { onConflict: "stripe_event_id", ignoreDuplicates: true }
  );
}

async function syncSubscription(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  sub: Stripe.Subscription
) {
  const organizationId = sub.metadata.organization_id;
  if (!organizationId) return;

  const priceId = sub.items.data[0]?.price.id ?? null;
  const mapped = priceId ? mapStripePriceToPlan(priceId) : null;
  const plan = mapped?.tier ?? (sub.metadata.plan as "Essencial" | "Profissional" | "Enterprise") ?? "Profissional";
  const interval = mapped?.interval ?? (sub.metadata.billing_interval as "month" | "year") ?? "month";

  const statusMap: Record<string, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    unpaid: "past_due",
    paused: "past_due",
  };

  const status = statusMap[sub.status] ?? "incomplete";
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const periodEnd = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;

  await supabase.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      plan,
      billing_interval: interval,
      status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
    },
    { onConflict: "organization_id" }
  );

  const orgStatus = status === "active" || status === "trialing" ? "ativo" : status === "past_due" ? "suspenso" : "teste";

  await supabase
    .from("organizations")
    .update({
      plan,
      status: orgStatus,
      trial_days_left: orgStatus === "ativo" ? null : undefined,
    })
    .eq("id", organizationId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET não configurado." });
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    return res.status(400).json({ error: "Assinatura Stripe ausente." });
  }

  try {
    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    const rawBody = req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)
      ? JSON.stringify(req.body)
      : await readRawBody(req);

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    const { data: seen } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (seen) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    await recordStripeEvent(supabase, event);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.metadata?.organization_id) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          await syncSubscription(supabase, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(supabase, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const organizationId = sub.metadata.organization_id;
        if (organizationId) {
          await supabase
            .from("subscriptions")
            .update({ status: "canceled", cancel_at_period_end: false })
            .eq("organization_id", organizationId);

          await supabase
            .from("organizations")
            .update({ status: "suspenso" })
            .eq("id", organizationId);
        }
        break;
      }
      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro no webhook Stripe.";
    console.error("[stripe/webhook]", message);
    return res.status(400).json({ error: message });
  }
}
