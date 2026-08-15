import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "../../lib/supabase-admin";
import { getStripe, getAppUrl, isStripeConfigured } from "../../lib/stripe";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isStripeConfigured()) {
    return res.status(503).json({ error: "Stripe não configurado." });
  }

  const { organizationId } = req.body as { organizationId?: string };
  if (!organizationId) {
    return res.status(400).json({ error: "organizationId é obrigatório." });
  }

  try {
    const supabase = getSupabaseAdmin();
    const stripe = getStripe();
    const appUrl = getAppUrl();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return res.status(404).json({ error: "Nenhuma assinatura Stripe encontrada para esta organização." });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/?view=client&page=plano`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao abrir portal.";
    console.error("[stripe/portal]", message);
    return res.status(500).json({ error: message });
  }
}
