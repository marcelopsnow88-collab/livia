import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "../../lib/supabase-admin";
import { sendWhatsAppTextMessage } from "../../lib/whatsapp";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const internalKey = process.env.INTERNAL_API_KEY;
  if (internalKey && authHeader !== `Bearer ${internalKey}`) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const { to, text, organizationId, conversationId } = req.body as {
    to?: string;
    text?: string;
    organizationId?: string;
    conversationId?: string;
  };

  if (!to || !text) {
    return res.status(400).json({ error: "Campos 'to' e 'text' são obrigatórios." });
  }

  try {
    const supabase = getSupabaseAdmin();

    let phoneNumberId: string | undefined;
    if (organizationId) {
      const { data: conn } = await supabase
        .from("whatsapp_connections")
        .select("phone_number_id")
        .eq("organization_id", organizationId)
        .maybeSingle();
      phoneNumberId = conn?.phone_number_id ?? undefined;
    }

    const result = await sendWhatsAppTextMessage({ to, text, phoneNumberId });

    if (organizationId && conversationId) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        organization_id: organizationId,
        tipo: "ia",
        texto: text,
        whatsapp_message_id: result.messageId,
        delivery_status: "sent",
      });

      await supabase
        .from("conversations")
        .update({
          last_message_preview: text.slice(0, 120),
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    }

    await supabase.from("integration_logs").insert({
      organization_id: organizationId ?? null,
      source: "whatsapp_send",
      level: "info",
      message: "Mensagem enviada com sucesso",
      metadata: { messageId: result.messageId },
    });

    return res.status(200).json({ messageId: result.messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao enviar mensagem.";
    console.error("[whatsapp/send]", message);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("integration_logs").insert({
        organization_id: organizationId ?? null,
        source: "whatsapp_send",
        level: "error",
        message,
      });
    } catch {
      // ignore secondary log failure
    }

    return res.status(502).json({ error: message });
  }
}
