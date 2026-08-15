/**
 * Cria produtos e prices no Stripe (modo test) conforme REGRAS_DE_NEGOCIO.md §9.
 * Uso: node scripts/setup-stripe.mjs
 * Requer STRIPE_SECRET_KEY válida em .env.local
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Arquivo .env.local não encontrado.");
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const CATALOG = [
  { tier: "Essencial", monthly: 24700, yearly: 19700 },
  { tier: "Profissional", monthly: 49700, yearly: 39700 },
];

async function findOrCreateProduct(stripe, name) {
  const existing = await stripe.products.search({ query: `name:'LivIA ${name}' AND active:'true'` });
  if (existing.data[0]) return existing.data[0];
  return stripe.products.create({
    name: `LivIA ${name}`,
    description: `Plano ${name} — LivIA WhatsApp IA`,
    metadata: { plan_tier: name },
  });
}

async function findOrCreatePrice(stripe, productId, amountCents, interval) {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = prices.data.find(
    (p) => p.unit_amount === amountCents && p.recurring?.interval === interval
  );
  if (match) return match;
  return stripe.prices.create({
    product: productId,
    unit_amount: amountCents,
    currency: "brl",
    recurring: { interval },
    metadata: { billing_interval: interval },
  });
}

function upsertEnvLocal(updates) {
  const envPath = path.join(root, ".env.local");
  let content = fs.readFileSync(envPath, "utf8");
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }
  fs.writeFileSync(envPath, content.trim() + "\n", "utf8");
}

async function main() {
  loadEnvLocal();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("...") || !key.startsWith("sk_")) {
    console.error("Defina STRIPE_SECRET_KEY válida (sk_test_...) em .env.local antes de rodar este script.");
    process.exit(1);
  }

  const stripe = new Stripe(key);
  const envUpdates = {};

  for (const item of CATALOG) {
    const product = await findOrCreateProduct(stripe, item.tier);
    const monthly = await findOrCreatePrice(stripe, product.id, item.monthly, "month");
    const yearly = await findOrCreatePrice(stripe, product.id, item.yearly, "year");

    const prefix = item.tier === "Essencial" ? "ESSENCIAL" : "PROFISSIONAL";
    envUpdates[`STRIPE_PRICE_${prefix}_MONTHLY`] = monthly.id;
    envUpdates[`STRIPE_PRICE_${prefix}_YEARLY`] = yearly.id;

    console.log(`✓ ${item.tier}`);
    console.log(`  Mensal: R$ ${item.monthly / 100} → ${monthly.id}`);
    console.log(`  Anual:  R$ ${item.yearly / 100}/mês → ${yearly.id}`);
  }

  upsertEnvLocal(envUpdates);
  console.log("\n.env.local atualizado com os price IDs.");
  console.log("\nPróximos passos:");
  console.log("1. Configure webhook em https://dashboard.stripe.com/test/webhooks");
  console.log("   URL: https://SEU-DOMINIO/api/stripe/webhook");
  console.log("   Eventos: checkout.session.completed, customer.subscription.*");
  console.log("2. Copie o signing secret para STRIPE_WEBHOOK_SECRET no .env.local");
  console.log("3. Rode: npm run dev:api  (ou vercel dev)");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
