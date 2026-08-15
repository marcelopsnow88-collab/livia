const GRAPH_API = "https://graph.facebook.com/v21.0";

export interface SendTextMessageParams {
  to: string;
  text: string;
  phoneNumberId?: string;
}

export interface WhatsAppSendResult {
  messageId: string;
}

export async function sendWhatsAppTextMessage(
  params: SendTextMessageParams
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = params.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID são obrigatórios.");
  }

  const response = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.to.replace(/\D/g, ""),
      type: "text",
      text: { body: params.text },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WhatsApp API error (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as { messages?: { id: string }[] };
  const messageId = data.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp API não retornou message id.");

  return { messageId };
}

export function verifyWebhookToken(provided: string | null): boolean {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  return Boolean(expected && provided === expected);
}

export interface WhatsAppIncomingMessage {
  messageId: string;
  from: string;
  timestamp: string;
  type: string;
  text?: string;
  phoneNumberId: string;
}

export function parseWhatsAppWebhook(body: unknown): WhatsAppIncomingMessage[] {
  const results: WhatsAppIncomingMessage[] = [];
  const payload = body as {
    entry?: {
      changes?: {
        value?: {
          metadata?: { phone_number_id?: string };
          messages?: {
            id: string;
            from: string;
            timestamp: string;
            type: string;
            text?: { body: string };
          }[];
          statuses?: { id: string; status: string; timestamp: string }[];
        };
      }[];
    }[];
  };

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id ?? "";

      for (const msg of value?.messages ?? []) {
        results.push({
          messageId: msg.id,
          from: msg.from,
          timestamp: msg.timestamp,
          type: msg.type,
          text: msg.text?.body,
          phoneNumberId,
        });
      }
    }
  }

  return results;
}

export function parseWhatsAppStatuses(body: unknown) {
  const statuses: { messageId: string; status: string; timestamp: string }[] = [];
  const payload = body as {
    entry?: { changes?: { value?: { statuses?: { id: string; status: string; timestamp: string }[] } }[] }[];
  };

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const s of change.value?.statuses ?? []) {
        statuses.push({ messageId: s.id, status: s.status, timestamp: s.timestamp });
      }
    }
  }
  return statuses;
}
