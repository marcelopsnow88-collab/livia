/** Planos conforme REGRAS_DE_NEGOCIO.md §9 */

export type PlanTier = "Essencial" | "Profissional" | "Enterprise";
export type BillingInterval = "month" | "year";

export interface PlanLimits {
  usuarios: number;
  numeros_whatsapp: number;
  conversas: number;
  consumo_ia: number;
}

export interface PlanDefinition {
  tier: PlanTier;
  label: string;
  monthlyPriceBrl: number;
  yearlyPriceBrl: number;
  limits: PlanLimits;
  checkoutEnabled: boolean;
}

export const PLANS: Record<Exclude<PlanTier, "Enterprise">, PlanDefinition> = {
  Essencial: {
    tier: "Essencial",
    label: "Essencial",
    monthlyPriceBrl: 247,
    yearlyPriceBrl: 197,
    limits: { usuarios: 3, numeros_whatsapp: 1, conversas: 500, consumo_ia: 100 },
    checkoutEnabled: true,
  },
  Profissional: {
    tier: "Profissional",
    label: "Profissional",
    monthlyPriceBrl: 497,
    yearlyPriceBrl: 397,
    limits: { usuarios: 10, numeros_whatsapp: 2, conversas: 2000, consumo_ia: 100 },
    checkoutEnabled: true,
  },
};

export function getStripePriceEnvKey(tier: PlanTier, interval: BillingInterval): string {
  const tierKey = tier === "Essencial" ? "ESSENCIAL" : "PROFISSIONAL";
  const intervalKey = interval === "year" ? "YEARLY" : "MONTHLY";
  return `STRIPE_PRICE_${tierKey}_${intervalKey}`;
}

export function mapStripePriceToPlan(priceId: string): { tier: PlanTier; interval: BillingInterval } | null {
  const entries: Array<{ tier: PlanTier; interval: BillingInterval; envKey: string }> = [
    { tier: "Essencial", interval: "month", envKey: "STRIPE_PRICE_ESSENCIAL_MONTHLY" },
    { tier: "Essencial", interval: "year", envKey: "STRIPE_PRICE_ESSENCIAL_YEARLY" },
    { tier: "Profissional", interval: "month", envKey: "STRIPE_PRICE_PROFISSIONAL_MONTHLY" },
    { tier: "Profissional", interval: "year", envKey: "STRIPE_PRICE_PROFISSIONAL_YEARLY" },
  ];
  for (const e of entries) {
    if (process.env[e.envKey] === priceId) return { tier: e.tier, interval: e.interval };
  }
  return null;
}
