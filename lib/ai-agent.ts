import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types";
import { buildAvailabilityResponse } from "../src/lib/types/app";

type AdminClient = SupabaseClient<Database>;

export interface AgentConfig {
  name: string;
  tone: string;
  greetingMessage: string | null;
}

const AVAILABILITY_PATTERNS =
  /disponib|hor[aá]rio|agenda|agendar|marcar|consulta|vaga|when|schedule/i;

export function isAvailabilityQuery(text: string): boolean {
  return AVAILABILITY_PATTERNS.test(text);
}

export async function fetchAgentConfig(
  supabase: AdminClient,
  organizationId: string
): Promise<AgentConfig> {
  const { data } = await supabase
    .from("ai_agents")
    .select("name, tone, greeting_message")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return {
    name: data?.name ?? "LivIA",
    tone: data?.tone ?? "Amigável",
    greetingMessage: data?.greeting_message ?? null,
  };
}

export async function fetchAvailabilitiesForOrg(
  supabase: AdminClient,
  organizationId: string
) {
  const { data } = await supabase
    .from("availabilities")
    .select("organization_id, data, hora_inicio, hora_fim, status")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "disponivel");

  return (data ?? []).map((row) => ({
    id: "",
    empresaId: row.organization_id,
    data: row.data,
    horaInicio: String(row.hora_inicio).slice(0, 5),
    horaFim: String(row.hora_fim).slice(0, 5),
    status: row.status as "disponivel" | "indisponivel",
  }));
}

export async function fetchRecentMessages(
  supabase: AdminClient,
  conversationId: string,
  limit = 10
) {
  const { data } = await supabase
    .from("messages")
    .select("tipo, texto")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: false })
    .limit(limit);

  return (data ?? []).reverse();
}

function buildSystemPrompt(agent: AgentConfig, orgName: string): string {
  return [
    `Você é ${agent.name}, agente de IA da empresa ${orgName} atendendo via WhatsApp.`,
    `Tom de voz: ${agent.tone}.`,
    agent.greetingMessage ? `Mensagem de apresentação: ${agent.greetingMessage}` : "",
    "Regras obrigatórias:",
    "- Responda em português do Brasil, de forma concisa (máx. 3 parágrafos curtos).",
    "- NUNCA invente datas, horários ou preços que não foram fornecidos no contexto.",
    "- Se perguntarem sobre disponibilidade/agenda, informe que consultará a agenda (o sistema injeta os horários reais).",
    "- Não confirme agendamentos — apenas informe horários e registre interesse.",
    "- Se não souber, ofereça encaminhar para um atendente humano.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  history: { tipo: string; texto: string }[]
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "Olá! No momento estou em configuração. Em breve retorno com mais informações. 😊";
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history
      .filter((m) => m.tipo !== "sistema")
      .map((m) => ({
        role: (m.tipo === "cliente" ? "user" : "assistant") as "user" | "assistant",
        content: m.texto,
      })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[ai-agent] OpenAI error", response.status, errText.slice(0, 200));
    throw new Error("Falha ao gerar resposta da IA.");
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "Desculpe, não consegui processar sua mensagem.";
}

export interface GenerateReplyResult {
  replyText: string;
  systemNote: string | null;
  slotsFound: number;
}

export async function generateWhatsAppReply(
  supabase: AdminClient,
  params: {
    organizationId: string;
    organizationName: string;
    conversationId: string;
    userMessage: string;
  }
): Promise<GenerateReplyResult> {
  const agent = await fetchAgentConfig(supabase, params.organizationId);
  const history = await fetchRecentMessages(supabase, params.conversationId);

  if (isAvailabilityQuery(params.userMessage)) {
    const slots = await fetchAvailabilitiesForOrg(supabase, params.organizationId);
    const replyText = buildAvailabilityResponse(slots, params.organizationId);
    return {
      replyText,
      systemNote: `IA consultou a agenda — ${slots.length} horário(s) encontrado(s)`,
      slotsFound: slots.length,
    };
  }

  const systemPrompt = buildSystemPrompt(agent, params.organizationName);
  const replyText = await callOpenAI(systemPrompt, params.userMessage, history);

  return { replyText, systemNote: null, slotsFound: 0 };
}
