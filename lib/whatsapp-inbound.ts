import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types";
import type { Json } from "../src/lib/supabase/types";
import { generateWhatsAppReply } from "./ai-agent";
import { sendWhatsAppTextMessage, type WhatsAppIncomingMessage } from "./whatsapp";

type AdminClient = SupabaseClient<Database>;

export async function processIncomingWhatsAppMessage(
  supabase: AdminClient,
  event: WhatsAppIncomingMessage,
  rawPayload: unknown
): Promise<void> {
  const externalId = event.messageId;

  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("provider", "whatsapp")
    .eq("external_id", externalId)
    .maybeSingle();

  if (existing) return;

  await supabase.from("webhook_events").insert({
    provider: "whatsapp",
    external_id: externalId,
    event_type: "message.received",
    payload: rawPayload as Json,
    status: "received",
  });

  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("organization_id, phone_number_id")
    .eq("phone_number_id", event.phoneNumberId)
    .maybeSingle();

  const organizationId = connection?.organization_id;
  if (!organizationId || !event.text) {
    await markWebhookProcessed(supabase, externalId);
    return;
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .single();

  let { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("whatsapp_wa_id", event.from)
    .maybeSingle();

  if (!contact) {
    const initials = event.from.slice(-2).toUpperCase();
    const { data: newContact } = await supabase
      .from("contacts")
      .insert({
        organization_id: organizationId,
        name: `Contato ${event.from.slice(-4)}`,
        phone: event.from,
        whatsapp_wa_id: event.from,
        avatar_initials: initials,
      })
      .select("id")
      .single();
    contact = newContact;
  }

  if (!contact) {
    await markWebhookProcessed(supabase, externalId);
    return;
  }

  let { data: conversation } = await supabase
    .from("conversations")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("contact_id", contact.id)
    .neq("status", "finalizada")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const messageAt = new Date(Number(event.timestamp) * 1000).toISOString();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        organization_id: organizationId,
        contact_id: contact.id,
        status: "ia",
        last_message_preview: event.text.slice(0, 120),
        last_message_at: messageAt,
        unread_count: 1,
      })
      .select("id, status")
      .single();
    conversation = newConv;
  } else {
    await supabase
      .from("conversations")
      .update({
        last_message_preview: event.text.slice(0, 120),
        last_message_at: messageAt,
        unread_count: 1,
      })
      .eq("id", conversation.id);
  }

  if (!conversation) {
    await markWebhookProcessed(supabase, externalId);
    return;
  }

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    organization_id: organizationId,
    tipo: "cliente",
    texto: event.text,
    whatsapp_message_id: event.messageId,
    sent_at: messageAt,
  });

  if (conversation.status === "ia") {
    try {
      const { replyText, systemNote } = await generateWhatsAppReply(supabase, {
        organizationId,
        organizationName: org?.name ?? "Empresa",
        conversationId: conversation.id,
        userMessage: event.text,
      });

      if (systemNote) {
        await supabase.from("messages").insert({
          conversation_id: conversation.id,
          organization_id: organizationId,
          tipo: "sistema",
          texto: systemNote,
          sent_at: new Date().toISOString(),
        });
      }

      const phoneNumberId = connection?.phone_number_id ?? event.phoneNumberId;
      const sendResult = await sendWhatsAppTextMessage({
        to: event.from,
        text: replyText,
        phoneNumberId: phoneNumberId ?? undefined,
      });

      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        organization_id: organizationId,
        tipo: "ia",
        texto: replyText,
        whatsapp_message_id: sendResult.messageId,
        delivery_status: "sent",
        sent_at: new Date().toISOString(),
      });

      await supabase
        .from("conversations")
        .update({
          last_message_preview: replyText.slice(0, 120),
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          ai_intent: systemNote ? "Disponibilidade" : null,
        })
        .eq("id", conversation.id);
    } catch (aiError) {
      const msg = aiError instanceof Error ? aiError.message : "Erro IA";
      console.error("[whatsapp-inbound] falha resposta IA", msg);
      await supabase.from("integration_logs").insert({
        organization_id: organizationId,
        source: "ai_agent",
        level: "error",
        message: msg,
      });
    }
  }

  await markWebhookProcessed(supabase, externalId);
}

async function markWebhookProcessed(supabase: AdminClient, externalId: string) {
  await supabase
    .from("webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("external_id", externalId);
}
