import { getSupabaseOrNull } from "../lib/supabase/client";
import { AppError, toAppError } from "../lib/errors";
import type { Availability, AvailabilityForm } from "../lib/types/app";
import { mapAvailability } from "../lib/types/app";

export async function fetchAvailabilities(organizationId: string): Promise<Availability[]> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("availabilities")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("data")
    .order("hora_inicio");

  if (error) throw toAppError(error, "Erro ao carregar disponibilidades.");
  return (data ?? []).map(mapAvailability);
}

export async function fetchAllAvailabilities(): Promise<Availability[]> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("availabilities")
    .select("*")
    .is("deleted_at", null)
    .order("data")
    .order("hora_inicio");

  if (error) throw toAppError(error, "Erro ao carregar disponibilidades.");
  return (data ?? []).map(mapAvailability);
}

function validateForm(form: AvailabilityForm): void {
  if (!form.data) throw new AppError("Informe a data.", "VALIDATION");
  if (!form.horaInicio) throw new AppError("Informe o horário inicial.", "VALIDATION");
  if (!form.horaFim) throw new AppError("Informe o horário final.", "VALIDATION");
  if (form.horaFim <= form.horaInicio) {
    throw new AppError("O horário final deve ser posterior ao inicial.", "VALIDATION");
  }
}

export async function createAvailability(
  organizationId: string,
  form: AvailabilityForm,
  existing: Availability[]
): Promise<Availability> {
  validateForm(form);

  const duplicate = existing.find(
    (a) =>
      a.empresaId === organizationId &&
      a.data === form.data &&
      a.horaInicio === form.horaInicio &&
      a.horaFim === form.horaFim
  );
  if (duplicate) {
    throw new AppError("Já existe uma disponibilidade com essa data e horário.", "VALIDATION");
  }

  const supabase = getSupabaseOrNull();
  if (!supabase) throw new AppError("Supabase não configurado.", "UNKNOWN");

  const { data, error } = await supabase
    .from("availabilities")
    .insert({
      organization_id: organizationId,
      data: form.data,
      hora_inicio: form.horaInicio,
      hora_fim: form.horaFim,
      status: form.status,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new AppError("Já existe uma disponibilidade com essa data e horário.", "VALIDATION");
    }
    throw toAppError(error, "Erro ao criar disponibilidade.");
  }

  return mapAvailability(data);
}

export async function updateAvailability(
  id: string,
  organizationId: string,
  form: AvailabilityForm,
  existing: Availability[]
): Promise<Availability> {
  validateForm(form);

  const duplicate = existing.find(
    (a) =>
      a.id !== id &&
      a.empresaId === organizationId &&
      a.data === form.data &&
      a.horaInicio === form.horaInicio &&
      a.horaFim === form.horaFim
  );
  if (duplicate) {
    throw new AppError("Já existe uma disponibilidade com essa data e horário.", "VALIDATION");
  }

  const supabase = getSupabaseOrNull();
  if (!supabase) throw new AppError("Supabase não configurado.", "UNKNOWN");

  const { data, error } = await supabase
    .from("availabilities")
    .update({
      data: form.data,
      hora_inicio: form.horaInicio,
      hora_fim: form.horaFim,
      status: form.status,
    })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) throw toAppError(error, "Erro ao atualizar disponibilidade.");
  return mapAvailability(data);
}

export async function deleteAvailability(id: string, organizationId: string): Promise<void> {
  const supabase = getSupabaseOrNull();
  if (!supabase) throw new AppError("Supabase não configurado.", "UNKNOWN");

  const { error } = await supabase
    .from("availabilities")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) throw toAppError(error, "Erro ao remover disponibilidade.");
}
