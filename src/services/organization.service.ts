import { getSupabaseOrNull } from "../lib/supabase/client";
import { toAppError } from "../lib/errors";
import type { ClienteAdmin } from "../lib/types/app";
import { mapOrganization } from "../lib/types/app";

export async function fetchOrganizations(): Promise<ClienteAdmin[]> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (error) throw toAppError(error, "Erro ao carregar clientes.");
  return (data ?? []).map(mapOrganization);
}

export async function fetchOrganizationById(id: string): Promise<ClienteAdmin | null> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw toAppError(error, "Erro ao carregar organização.");
  return data ? mapOrganization(data) : null;
}

export interface OnboardingPayload {
  nome: string;
  email: string;
  senha: string;
  empresa: string;
  website?: string;
  objetivo?: string;
  agentName?: string;
  tone?: string;
  greeting?: string;
}

export async function completeOnboarding(payload: OnboardingPayload): Promise<string> {
  const supabase = getSupabaseOrNull();
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.senha,
    options: {
      data: { full_name: payload.nome, role: "client" },
    },
  });

  if (authError) throw toAppError(authError, "Erro ao criar conta.");
  if (!authData.user) throw new Error("Usuário não criado.");

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: payload.empresa,
      website: payload.website ?? null,
      responsible_name: payload.nome,
      status: "teste",
      trial_days_left: 7,
      plan: "Profissional",
      objective: payload.objetivo ?? null,
    })
    .select()
    .single();

  if (orgError) throw toAppError(orgError, "Erro ao criar empresa.");

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: org.id,
    user_id: authData.user.id,
    is_owner: true,
  });

  if (memberError) throw toAppError(memberError, "Erro ao vincular usuário à empresa.");

  if (payload.agentName || payload.tone || payload.greeting) {
    await supabase.from("ai_agents").insert({
      organization_id: org.id,
      name: payload.agentName ?? "LivIA",
      tone: payload.tone ?? "Amigável",
      greeting_message: payload.greeting ?? null,
    });
  }

  return org.id;
}
