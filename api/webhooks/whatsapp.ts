import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "../../lib/supabase-admin";
import {
  verifyWebhookToken,
  parseWhatsAppWebhook,
  parseWhatsAppStatuses,
} from "../../lib/whatsapp";
import { processIncomingWhatsAppMessage } from "../../lib/whatsapp-inbound";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"] as string | undefined;
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && verifyWebhookToken(token ?? null)) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Verificação do webhook falhou." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getSupabaseAdmin();
    const incoming = parseWhatsAppWebhook(req.body);
    const statuses = parseWhatsAppStatuses(req.body);

    for (const event of incoming) {
      await processIncomingWhatsAppMessage(supabase, event, req.body);
    }

    for (const status of statuses) {
      await supabase
        .from("messages")
        .update({ delivery_status: status.status })
        .eq("whatsapp_message_id", status.messageId);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[webhook] erro inesperado", error instanceof Error ? error.message : error);
    return res.status(500).json({ error: "Erro interno." });
  }
}
