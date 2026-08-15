import { getSupabaseOrNull } from "../lib/supabase/client";
import { toAppError } from "../lib/errors";
import type { ConversaInbox, Mensagem } from "../lib/types/app";
import { formatRelativeTime, formatTime } from "../lib/types/app";
import { LUCAS_CONVERSATION_ID } from "../lib/constants";

export async function fetchConversations(organizationId: string): Promise<ConversaInbox[]> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select(`
      id,
      status,
      unread_count,
      last_message_preview,
      last_message_at,
      contacts ( name, company_name, avatar_initials )
    `)
    .eq("organization_id", organizationId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw toAppError(error, "Erro ao carregar conversas.");

  type ConvRow = {
    id: string;
    status: ConversaInbox["status"];
    unread_count: number;
    last_message_preview: string | null;
    last_message_at: string | null;
    contacts: { name: string; company_name: string | null; avatar_initials: string } | null;
  };

  return ((data ?? []) as ConvRow[]).map((row) => {
    const contact = row.contacts;

    return {
      id: row.id,
      nome: contact?.name ?? "Contato",
      empresa: contact?.company_name ?? "",
      ultimaMensagem: row.last_message_preview ?? "",
      tempo: formatRelativeTime(row.last_message_at),
      status: row.status,
      naoLidas: row.unread_count,
      avatar: contact?.avatar_initials ?? "??",
    };
  });
}

export async function fetchMessages(conversationId: string): Promise<Mensagem[]> {
  const supabase = getSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("tipo, texto, sent_at")
    .eq("conversation_id", conversationId)
    .order("sent_at");

  if (error) throw toAppError(error, "Erro ao carregar mensagens.");

  return (data ?? []).map((m) => ({
    tipo: m.tipo,
    texto: m.texto,
    hora: m.tipo !== "sistema" ? formatTime(m.sent_at) : undefined,
  }));
}

export async function assumeConversation(conversationId: string): Promise<void> {
  const supabase = getSupabaseOrNull();
  if (!supabase) throw new Error("Supabase não configurado.");

  const { error } = await supabase
    .from("conversations")
    .update({ status: "humano", responsible: "Atendente humano" })
    .eq("id", conversationId);

  if (error) throw toAppError(error, "Erro ao assumir conversa.");
}

export function isLucasConversation(conversationId: string): boolean {
  return conversationId === LUCAS_CONVERSATION_ID;
}

export async function fetchConversationMeta(conversationId: string) {
  const supabase = getSupabaseOrNull();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("conversations")
    .select("ai_intent, ai_sentiment, ai_opportunity, responsible, status")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw toAppError(error, "Erro ao carregar metadados.");
  return data;
}
