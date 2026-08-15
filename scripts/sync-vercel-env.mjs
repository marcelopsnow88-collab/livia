/**
 * Sincroniza variáveis de .env.local para a Vercel (production + preview).
 * Uso: node scripts/sync-vercel-env.mjs
 * Requer: npm i -D vercel && npx vercel link
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");

const SERVER_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_VERIFY_TOKEN",
  "INTERNAL_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ESSENCIAL_MONTHLY",
  "STRIPE_PRICE_ESSENCIAL_YEARLY",
  "STRIPE_PRICE_PROFISSIONAL_MONTHLY",
  "STRIPE_PRICE_PROFISSIONAL_YEARLY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
];

const PUBLIC_KEYS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_APP_URL"];

function loadEnv() {
  if (!fs.existsSync(envPath)) {
    console.error(".env.local não encontrado.");
    process.exit(1);
  }
  const vars = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (value && !value.includes("...")) vars[key] = value;
  }
  return vars;
}

function addEnv(key, value, environments, sensitive = true) {
  for (const env of environments) {
    const args = ["env", "add", key, env, "--force"];
    if (sensitive) args.push("--sensitive");
    const result = spawnSync("npx", ["vercel", ...args], {
      cwd: root,
      input: value,
      encoding: "utf8",
      shell: true,
    });
    if (result.status !== 0) {
      console.error(`Falha ao definir ${key} (${env}):`, result.stderr || result.stdout);
      process.exit(1);
    }
    console.log(`✓ ${key} → ${env}`);
  }
}

const vars = loadEnv();

console.log("Sincronizando variáveis para Vercel...\n");

for (const key of PUBLIC_KEYS) {
  if (vars[key]) addEnv(key, vars[key], ["production", "preview", "development"], false);
}

for (const key of SERVER_KEYS) {
  if (vars[key]) addEnv(key, vars[key], ["production", "preview"], true);
}

console.log("\nConcluído. Defina APP_URL manualmente após o primeiro deploy:");
console.log("  npx vercel env add APP_URL production");
console.log("  (cole a URL https://seu-projeto.vercel.app)");
