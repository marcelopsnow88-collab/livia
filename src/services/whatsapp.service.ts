import { getSupabaseOrNull } from "../lib/supabase/client";
import { toAppError } from "../lib/errors";
import type { PlanUsageItem, WhatsAppConnectionSummary } from "../lib/types/app";

const RESOURCE_LABELS: Record<string, string> = {
  usuarios: "Usuários",
  numeros_whatsapp: "Números WhatsApp",
  conversas: "Conversas",
  consumo_ia: "Consumo de IA",
};

export async function fetchPlanUsage(organizationId: string): Promise<PlanUsageItem[]> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("plan_usage")
    .select("*")
    .eq("organization_id", organizationId);

  if (error) throw toAppError(error, "Erro ao carregar uso do plano.");

  return (data ?? []).map((row) => ({
    label: RESOURCE_LABELS[row.resource_key] ?? row.resource_key,
    used: row.used,
    limit: row.limit_value,
  }));
}

export async function fetchWhatsAppConnections(): Promise<WhatsAppConnectionSummary[]> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("whatsapp_connections")
    .select(`
      id,
      phone_number,
      status,
      organizations ( name )
    `);

  if (error) throw toAppError(error, "Erro ao carregar conexões WhatsApp.");

  type WaRow = {
    id: string;
    phone_number: string | null;
    status: WhatsAppConnectionSummary["status"];
    organizations: { name: string } | null;
  };

  return ((data ?? []) as WaRow[]).map((row) => ({
    id: row.id,
    empresa: row.organizations?.name ?? "",
    phoneNumber: row.phone_number,
    status: row.status,
  }));
}

export interface WhatsAppStats {
  conectados: number;
  comErro: number;
  configurando: number;
  total: number;
}

export async function fetchWhatsAppStats(): Promise<WhatsAppStats> {
  const connections = await fetchWhatsAppConnections();
  return {
    conectados: connections.filter((c) => c.status === "conectado").length,
    comErro: connections.filter((c) => c.status === "erro").length,
    configurando: connections.filter((c) => c.status === "configurando").length,
    total: connections.length,
  };
}
